import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { recalculateDRE } from '../services/dreCalculator';

export const suppliesRouter = Router();
suppliesRouter.use(authenticate);

const supplySchema = z.object({
  category: z.string().min(1),
  description: z.string().min(1),
  unit: z.string().default('un'),
  quantity: z.number().min(0),
  unitCost: z.number().min(0),
  markup: z.number().min(0).max(100).optional(),
  ncm: z.string().optional(),
  icms: z.number().min(0).max(100).optional(),
  ipi: z.number().min(0).max(100).optional(),
  order: z.number().int().optional(),
});

suppliesRouter.get('/:projectId/memories/:memoryId/supplies', async (req: AuthRequest, res: Response) => {
  const supplies = await prisma.supply.findMany({
    where: { memoryId: req.params.memoryId },
    orderBy: [{ category: 'asc' }, { order: 'asc' }],
  });
  return res.json(supplies);
});

suppliesRouter.post('/:projectId/memories/:memoryId/supplies', authorize('admin', 'sales_engineer'), async (req: AuthRequest, res: Response) => {
  const data = supplySchema.parse(req.body);
  const { memoryId, projectId } = req.params;

  const totalCost = data.quantity * data.unitCost;
  const markup = data.markup || 0;
  const salePrice = totalCost * (1 + markup / 100);

  const supply = await prisma.supply.create({
    data: { ...data, memoryId, totalCost, salePrice },
  });

  await recalculateDRE(memoryId);
  await prisma.auditLog.create({
    data: { userId: req.user!.id, projectId, entity: 'Supply', entityId: supply.id, action: 'CREATE', newValues: supply as any },
  });

  return res.status(201).json(supply);
});

suppliesRouter.put('/:projectId/memories/:memoryId/supplies/:supplyId', authorize('admin', 'sales_engineer'), async (req: AuthRequest, res: Response) => {
  const data = supplySchema.parse(req.body);
  const { memoryId, supplyId, projectId } = req.params;

  const totalCost = data.quantity * data.unitCost;
  const markup = data.markup || 0;
  const salePrice = totalCost * (1 + markup / 100);

  const old = await prisma.supply.findUniqueOrThrow({ where: { id: supplyId } });
  const supply = await prisma.supply.update({ where: { id: supplyId }, data: { ...data, totalCost, salePrice } });

  await recalculateDRE(memoryId);
  await prisma.auditLog.create({
    data: { userId: req.user!.id, projectId, entity: 'Supply', entityId: supplyId, action: 'UPDATE', oldValues: old as any, newValues: supply as any },
  });

  return res.json(supply);
});

suppliesRouter.delete('/:projectId/memories/:memoryId/supplies/:supplyId', authorize('admin', 'sales_engineer'), async (req: AuthRequest, res: Response) => {
  const { memoryId, supplyId, projectId } = req.params;
  const old = await prisma.supply.findUniqueOrThrow({ where: { id: supplyId } });
  await prisma.supply.delete({ where: { id: supplyId } });
  await recalculateDRE(memoryId);
  await prisma.auditLog.create({
    data: { userId: req.user!.id, projectId, entity: 'Supply', entityId: supplyId, action: 'DELETE', oldValues: old as any },
  });
  return res.json({ message: 'Item removido' });
});
