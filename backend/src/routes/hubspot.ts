import { Router, Response } from 'express';
import { Client } from '@hubspot/api-client';
import { prisma } from '../lib/prisma';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

export const hubspotRouter = Router();
hubspotRouter.use(authenticate);

function getHubspotClient() {
  if (!process.env.HUBSPOT_API_KEY) throw new Error('HUBSPOT_API_KEY não configurado');
  return new Client({ accessToken: process.env.HUBSPOT_API_KEY });
}

hubspotRouter.post('/sync/:projectId', authorize('admin', 'commercial', 'sales_engineer'), async (req: AuthRequest, res: Response) => {
  const project = await prisma.project.findUniqueOrThrow({
    where: { id: req.params.projectId },
    include: {
      memories: {
        where: { isActive: true },
        include: { dre: true },
      },
    },
  });

  const activeMem = project.memories[0];
  if (!activeMem?.dre) {
    return res.status(400).json({ error: 'Nenhuma memória ativa com DRE calculada encontrada' });
  }

  const dre = activeMem.dre;
  const client = getHubspotClient();

  const properties: Record<string, string> = {
    tagna_custo_hh_dev: String(dre.costHHDev),
    tagna_custo_hh_campo: String(dre.costHHField),
    tagna_custo_terceiros: String(dre.costThirdParty),
    tagna_custo_viagens: String(dre.costTravel),
    tagna_receita_bruta: String(dre.grossRevenue),
    tagna_margem_bruta_pct: String(dre.grossMarginPct),
  };

  await client.crm.deals.basicApi.update(project.hubspotDealId, { properties });

  await prisma.auditLog.create({
    data: {
      userId: req.user!.id, projectId: project.id,
      entity: 'HubSpot', entityId: project.hubspotDealId,
      action: 'SYNC', newValues: properties as any,
    },
  });

  return res.json({ message: 'HubSpot atualizado com sucesso', properties });
});

hubspotRouter.get('/deal/:dealId', authorize('admin', 'commercial', 'sales_engineer'), async (req: AuthRequest, res: Response) => {
  const client = getHubspotClient();
  const deal = await client.crm.deals.basicApi.getById(req.params.dealId, [
    'dealname', 'amount', 'closedate', 'dealstage', 'hubspot_owner_id'
  ]);
  return res.json(deal.properties);
});
