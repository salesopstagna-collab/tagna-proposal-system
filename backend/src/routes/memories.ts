import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const DEFAULT_SCOPE_ITEMS: Array<{ phase: string; activity: string; detalhamento?: string; order: number }> = [
  { phase: 'INTERNALIZAÇÃO', activity: 'Kick-off', order: 1 },
  { phase: 'ANÁLISE', activity: 'Levantamento de Campo', order: 1 },
  { phase: 'ANÁLISE', activity: 'Levantamento de Dados', order: 2 },
  { phase: 'ANÁLISE', activity: 'Documentação gerada na etapa', order: 3 },
  { phase: 'DESENVOLVIMENTO DE PROJETO', activity: 'Sistema de Controle', order: 1 },
  { phase: 'DESENVOLVIMENTO DE PROJETO', activity: 'Sistema de Supervisão', order: 2 },
  { phase: 'DESENVOLVIMENTO DE PROJETO', activity: 'Programação de IHM', order: 3 },
  { phase: 'DESENVOLVIMENTO DE PROJETO', activity: 'Interface com outros sistemas', order: 4 },
  { phase: 'DESENVOLVIMENTO DE PROJETO', activity: 'Documentação gerada na etapa', order: 5 },
  { phase: 'TESTES DE ACEITAÇÃO', activity: 'Teste de Plataforma', order: 1 },
  { phase: 'TESTES DE ACEITAÇÃO', activity: 'Teste em Fábrica (TAF)', order: 2 },
  { phase: 'TESTES DE ACEITAÇÃO', activity: 'Documentação gerada na etapa', order: 3 },
  { phase: 'MOBILIZAÇÃO EMPRESA E EQUIPE', activity: 'Elaboração de Documentos de SSMA', order: 1 },
  { phase: 'MOBILIZAÇÃO EMPRESA E EQUIPE', activity: 'Exames', order: 2 },
  { phase: 'MOBILIZAÇÃO EMPRESA E EQUIPE', activity: 'Treinamentos Específicos', order: 3 },
  { phase: 'MOBILIZAÇÃO EMPRESA E EQUIPE', activity: 'Treinamento de Integração', order: 4 },
  { phase: 'MOBILIZAÇÃO EMPRESA E EQUIPE', activity: 'Envio de documentos de habilitação', order: 5 },
  { phase: 'IMPLANTAÇÃO DE CAMPO - REGRAS DE VIAGEM', activity: 'Responsabilidade de compra das viagens para os serviços de campo? (TAGNA ou CLIENTE)', detalhamento: 'TAGNA', order: 1 },
  { phase: 'IMPLANTAÇÃO DE CAMPO - REGRAS DE VIAGEM', activity: 'Horas de translado são consideradas de trabalho e medidas em RDO?', order: 2 },
  { phase: 'IMPLANTAÇÃO DE CAMPO - REGRAS DE VIAGEM', activity: 'Prazo mínimo para acionamento de viagem de campo.', detalhamento: '15 dias corridos', order: 3 },
  { phase: 'IMPLANTAÇÃO DE CAMPO - REGRAS DE VIAGEM', activity: 'Cancelamento ou remarcação de viagem de campo?', detalhamento: 'Qualquer cancelamento ou remarcação deverá ser restituído à TAGNA e será cobrado como nota de débito.', order: 4 },
  { phase: 'IMPLANTAÇÃO DE CAMPO - REGRAS DE VIAGEM', activity: 'Folga de campo.', detalhamento: 'A cada 21 dias\nA cada 30 dias', order: 5 },
  { phase: 'IMPLANTAÇÃO DE CAMPO - REGRAS DE VIAGEM', activity: 'Horário de viagem de ida para campo ou retorno para sede.', detalhamento: 'Horário comercial 8h00 às 18h00', order: 6 },
  { phase: 'IMPLANTAÇÃO DE CAMPO - REGRAS DE VIAGEM', activity: 'Política de viagem.', detalhamento: 'Translado: Aéreo, Terrestre\nHotel: Mínimo 3 estrelas, quarto individual.\nCarro: 4x2\nAlimentação: Na planta, fora da planta', order: 7 },
  { phase: 'IMPLANTAÇÃO DE CAMPO - REGRAS DE VIAGEM', activity: 'Faturamento das despesas de viagens via nota de débito?', detalhamento: 'SIM', order: 8 },
  { phase: 'IMPLANTAÇÃO DE CAMPO - REGRAS E DEFINIÇÕES', activity: 'Usaremos para o projeto RDO da TAGNA ou do Cliente?', detalhamento: 'TAGNA', order: 1 },
  { phase: 'IMPLANTAÇÃO DE CAMPO - REGRAS E DEFINIÇÕES', activity: 'Jornada de trabalho a ser considerada para implantação campo.', detalhamento: '44 semanais/176 mensais', order: 2 },
  { phase: 'IMPLANTAÇÃO DE CAMPO - REGRAS E DEFINIÇÕES', activity: 'Local de trabalho.', detalhamento: 'Nas instalações do cliente ou fornecidas por ele.', order: 3 },
  { phase: 'IMPLANTAÇÃO DE CAMPO - REGRAS E DEFINIÇÕES', activity: 'Sobreaviso previsto?', order: 4 },
  { phase: 'IMPLANTAÇÃO DE CAMPO - REGRAS E DEFINIÇÕES', activity: 'Periculosidade em campo inclusa?', order: 5 },
  { phase: 'IMPLANTAÇÃO DE CAMPO', activity: 'Pré-Comissionamento', order: 1 },
  { phase: 'IMPLANTAÇÃO DE CAMPO', activity: 'Comissionamento', order: 2 },
  { phase: 'IMPLANTAÇÃO DE CAMPO', activity: 'Testes de Sinais entre transmissores, atuadores e o Controlador', order: 3 },
  { phase: 'IMPLANTAÇÃO DE CAMPO', activity: 'Testes Sinais entre o Controlador e o CCM', order: 4 },
  { phase: 'IMPLANTAÇÃO DE CAMPO', activity: 'Testes de redes de comunicação entre o Controlador, Remotas, Drivers e Supervisório', order: 5 },
  { phase: 'IMPLANTAÇÃO DE CAMPO', activity: 'Testes de comandos via supervisório/IHM', order: 6 },
  { phase: 'IMPLANTAÇÃO DE CAMPO', activity: 'Acionamento de drivers e atuadores sem carga', order: 7 },
  { phase: 'IMPLANTAÇÃO DE CAMPO', activity: 'Parametrização de drivers de acionamentos (CCM)', order: 8 },
  { phase: 'IMPLANTAÇÃO DE CAMPO', activity: 'Parametrização de relés de proteção (Entrada de CCM, Subestação)', order: 9 },
  { phase: 'IMPLANTAÇÃO DE CAMPO', activity: 'Parametrização de instrumentos', order: 10 },
  { phase: 'IMPLANTAÇÃO DE CAMPO', activity: 'Parametrização de ativos de rede (Switch, roteador)', order: 11 },
  { phase: 'IMPLANTAÇÃO DE CAMPO', activity: 'Teste integrado da automação com a equipe de comissionamento de elétrica e instrumentação', order: 12 },
  { phase: 'IMPLANTAÇÃO DE CAMPO', activity: 'Start-up', order: 13 },
  { phase: 'IMPLANTAÇÃO DE CAMPO', activity: 'Operação Assistida', order: 14 },
  { phase: 'IMPLANTAÇÃO DE CAMPO', activity: 'As-Built - Campo', order: 15 },
  { phase: 'TREINAMENTOS', activity: 'Treinamentos', order: 1 },
  { phase: 'TREINAMENTOS', activity: 'Manuais', detalhamento: 'Manutenção\nOperação', order: 2 },
  { phase: 'TREINAMENTOS', activity: 'Treinamento on the job? (executado dentro das horas de campo)', order: 3 },
  { phase: 'OUTRAS ATIVIDADES', activity: 'Supervisão de Montagem', order: 1 },
  { phase: 'OUTRAS ATIVIDADES', activity: 'Montagem elétrica', order: 2 },
  { phase: 'OUTRAS ATIVIDADES', activity: 'Certificação de Redes', order: 3 },
  { phase: 'OUTRAS ATIVIDADES', activity: 'Calibração de instrumentos', order: 4 },
  { phase: 'OUTRAS ATIVIDADES', activity: 'Estudos elétricos', order: 5 },
  { phase: 'ENCERRAMENTO DE PROJETO', activity: 'Desmobilização', order: 1 },
];

export const memoriesRouter = Router();
memoriesRouter.use(authenticate);

memoriesRouter.get('/:projectId/memories', async (req: AuthRequest, res: Response) => {
  const memories = await prisma.calculationMemory.findMany({
    where: { projectId: req.params.projectId },
    orderBy: { version: 'desc' },
    include: { dre: true, parameters: true },
  });
  return res.json(memories);
});

memoriesRouter.get('/:projectId/memories/:memoryId', async (req: AuthRequest, res: Response) => {
  const memory = await prisma.calculationMemory.findUniqueOrThrow({
    where: { id: req.params.memoryId },
    include: {
      parameters: true,
      scopeItems: { orderBy: { order: 'asc' } },
      workOrders: { include: { lines: { orderBy: { order: 'asc' } } } },
      dre: true,
      supplies: { orderBy: { order: 'asc' } },
      milestones: { orderBy: { order: 'asc' } },
    },
  });
  return res.json(memory);
});

memoriesRouter.post('/:projectId/memories', authorize('admin', 'sales_engineer'), async (req: AuthRequest, res: Response) => {
  const { projectId } = req.params;

  const last = await prisma.calculationMemory.findFirst({
    where: { projectId },
    orderBy: { version: 'desc' },
  });

  const version = (last?.version ?? 0) + 1;
  const label = req.body.label || `v${version}`;

  // If cloning from previous version
  let memory: any;
  if (req.body.cloneFrom) {
    const source = await prisma.calculationMemory.findUniqueOrThrow({
      where: { id: req.body.cloneFrom },
      include: { parameters: true, scopeItems: true, workOrders: { include: { lines: true } }, supplies: true, milestones: true },
    });

    memory = await prisma.calculationMemory.create({
      data: { projectId, version, label, createdById: req.user!.id, isActive: false },
    });

    if (source.parameters) {
      const { id, memoryId, ...params } = source.parameters;
      await prisma.projectParameters.create({ data: { ...params, memoryId: memory.id } });
    }

    const scopeMap: Record<string, string> = {};
    for (const item of source.scopeItems) {
      const { id, memoryId, ...scope } = item;
      const newScope = await prisma.scopeItem.create({ data: { ...scope, memoryId: memory.id } });
      scopeMap[id] = newScope.id;
    }

    for (const wo of source.workOrders) {
      const newWo = await prisma.workOrder.create({ data: { memoryId: memory.id, type: wo.type } });
      for (const line of wo.lines) {
        const { id, workOrderId, scopeItemId, ...lineData } = line;
        await prisma.workOrderLine.create({
          data: { ...lineData, workOrderId: newWo.id, scopeItemId: scopeItemId ? scopeMap[scopeItemId] : undefined },
        });
      }
    }

    for (const supply of source.supplies) {
      const { id, memoryId: _, ...s } = supply;
      await prisma.supply.create({ data: { ...s, memoryId: memory.id } });
    }

    for (const ms of source.milestones) {
      const { id, memoryId: _, ...m } = ms;
      await prisma.milestone.create({ data: { ...m, memoryId: memory.id } });
    }
  } else {
    memory = await prisma.calculationMemory.create({
      data: { projectId, version, label, createdById: req.user!.id, isActive: false },
    });
    await prisma.workOrder.create({ data: { memoryId: memory.id, type: 'automation' } });
    // Pre-populate default scope items from template
    await prisma.scopeItem.createMany({
      data: DEFAULT_SCOPE_ITEMS.map(item => ({
        memoryId: memory.id,
        phase: item.phase,
        activity: item.activity,
        detalhamento: item.detalhamento ?? null,
        order: item.order,
        included: false,
      })),
    });
  }

  await prisma.auditLog.create({
    data: { userId: req.user!.id, projectId, entity: 'CalculationMemory', entityId: memory.id, action: 'CREATE' },
  });

  return res.status(201).json(memory);
});

memoriesRouter.put('/:projectId/memories/:memoryId', authorize('admin', 'sales_engineer'), async (req: AuthRequest, res: Response) => {
  const memory = await prisma.calculationMemory.update({
    where: { id: req.params.memoryId },
    data: { label: req.body.label },
  });
  return res.json(memory);
});

memoriesRouter.post('/:projectId/memories/:memoryId/activate', authorize('admin', 'sales_engineer', 'commercial'), async (req: AuthRequest, res: Response) => {
  const { projectId, memoryId } = req.params;
  await prisma.calculationMemory.updateMany({ where: { projectId }, data: { isActive: false } });
  const memory = await prisma.calculationMemory.update({ where: { id: memoryId }, data: { isActive: true } });
  await prisma.auditLog.create({
    data: { userId: req.user!.id, projectId, entity: 'CalculationMemory', entityId: memoryId, action: 'ACTIVATE' },
  });
  return res.json(memory);
});
