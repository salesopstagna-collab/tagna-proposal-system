import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { recalculateDRE } from '../services/dreCalculator';

export const workOrdersRouter = Router();
workOrdersRouter.use(authenticate);

const TRAVEL_PHASE = 'IMPLANTAÇÃO DE CAMPO - REGRAS DE VIAGEM';

const workLineSchema = z.object({
  scopeItemId: z.string().optional(),
  professionalRateId: z.string().min(1, 'Perfil obrigatório'),
  quantity: z.number().int().min(1),
  // fieldDays = duração da tarefa em dias corridos (totalHours é calculado: fieldDays × 8)
  fieldDays: z.number().int().min(0),
  order: z.number().int().optional(),
});

const travelLineSchema = z.object({
  scopeItemId: z.string().optional(),
  travelDays: z.number().int().min(0),
  travelerCount: z.number().int().min(1),
  flightCount: z.number().int().min(0),
  order: z.number().int().optional(),
});

async function computeWorkLine(data: z.infer<typeof workLineSchema>) {
  const rate = await prisma.professionalRate.findUniqueOrThrow({ where: { id: data.professionalRateId } });
  // totalHours auto-calculado: dias × 8h/dia (mesma lógica da planilha C26*8)
  const totalHours = data.fieldDays * 8;
  const laborCost  = data.quantity * totalHours * rate.costPrice;
  const laborPrice = data.quantity * totalHours * rate.salePrice;
  return { totalHours, laborCost, laborPrice, travelCost: 0, travelPrice: 0, totalCost: laborCost, totalPrice: laborPrice };
}

async function computeTravelLine(data: z.infer<typeof travelLineSchema>) {
  const travelRates = await prisma.travelRate.findMany({ where: { active: true } });
  const r = (type: string) => travelRates.find(t => t.type === type);

  const aeroRate = r('AEREO');
  const hotelRate = r('HOTEL');
  const carroDiaRate = r('CARRO_DIA');
  const almocoRate = r('ALMOCO');
  const jantaRate = r('JANTA');
  const taxiRate = r('TAXI');

  const aeroCost = (aeroRate?.costPrice || 0) * data.flightCount;
  const aeroPrice = (aeroRate?.salePrice || 0) * data.flightCount;

  const perPersonPerDay = (n: any) => (n?.costPrice || 0) * data.travelDays * data.travelerCount;
  const perPersonPerDaySale = (n: any) => (n?.salePrice || 0) * data.travelDays * data.travelerCount;

  const travelCost = aeroCost + perPersonPerDay(hotelRate) + perPersonPerDay(carroDiaRate) + perPersonPerDay(almocoRate) + perPersonPerDay(jantaRate) + perPersonPerDay(taxiRate);
  const travelPrice = aeroPrice + perPersonPerDaySale(hotelRate) + perPersonPerDaySale(carroDiaRate) + perPersonPerDaySale(almocoRate) + perPersonPerDaySale(jantaRate) + perPersonPerDaySale(taxiRate);

  return { laborCost: 0, laborPrice: 0, travelCost, travelPrice, totalCost: travelCost, totalPrice: travelPrice };
}

workOrdersRouter.get('/:projectId/memories/:memoryId/work-orders', async (req: AuthRequest, res: Response) => {
  const orders = await prisma.workOrder.findMany({
    where: { memoryId: req.params.memoryId },
    include: {
      lines: {
        orderBy: { order: 'asc' },
        include: { scopeItem: true, professionalRate: true },
      },
    },
  });
  return res.json(orders);
});

workOrdersRouter.post('/:projectId/memories/:memoryId/work-orders/:workOrderId/lines', authorize('admin', 'sales_engineer'), async (req: AuthRequest, res: Response) => {
  const { memoryId, workOrderId, projectId } = req.params;
  const body = req.body;

  let line: any;
  if (body.lineType === 'travel') {
    const data = travelLineSchema.parse(body);
    const computed = await computeTravelLine(data);
    line = await prisma.workOrderLine.create({
      data: { ...data, workOrderId, lineType: 'travel', ...computed },
      include: { scopeItem: true, professionalRate: true },
    });
  } else {
    const data = workLineSchema.parse(body);
    const computed = await computeWorkLine(data);
    line = await prisma.workOrderLine.create({
      data: { ...data, workOrderId, lineType: 'work', ...computed },
      include: { scopeItem: true, professionalRate: true },
    });
  }

  await recalculateDRE(memoryId);
  await prisma.auditLog.create({
    data: { userId: req.user!.id, projectId, entity: 'WorkOrderLine', entityId: line.id, action: 'CREATE', newValues: line as any },
  });
  return res.status(201).json(line);
});

workOrdersRouter.put('/:projectId/memories/:memoryId/work-orders/:workOrderId/lines/:lineId', authorize('admin', 'sales_engineer'), async (req: AuthRequest, res: Response) => {
  const { memoryId, lineId, projectId } = req.params;
  const body = req.body;
  const old = await prisma.workOrderLine.findUniqueOrThrow({ where: { id: lineId } });

  let line: any;
  if (body.lineType === 'travel') {
    const data = travelLineSchema.parse(body);
    const computed = await computeTravelLine(data);
    line = await prisma.workOrderLine.update({
      where: { id: lineId },
      data: { ...data, lineType: 'travel', ...computed },
      include: { scopeItem: true, professionalRate: true },
    });
  } else {
    const data = workLineSchema.parse(body);
    const computed = await computeWorkLine(data);
    line = await prisma.workOrderLine.update({
      where: { id: lineId },
      data: { ...data, lineType: 'work', ...computed },
      include: { scopeItem: true, professionalRate: true },
    });
  }

  await recalculateDRE(memoryId);
  await prisma.auditLog.create({
    data: { userId: req.user!.id, projectId, entity: 'WorkOrderLine', entityId: lineId, action: 'UPDATE', oldValues: old as any, newValues: line as any },
  });
  return res.json(line);
});

workOrdersRouter.delete('/:projectId/memories/:memoryId/work-orders/:workOrderId/lines/:lineId', authorize('admin', 'sales_engineer'), async (req: AuthRequest, res: Response) => {
  const { memoryId, lineId, projectId } = req.params;
  const old = await prisma.workOrderLine.findUniqueOrThrow({ where: { id: lineId } });
  await prisma.workOrderLine.delete({ where: { id: lineId } });
  await recalculateDRE(memoryId);
  await prisma.auditLog.create({
    data: { userId: req.user!.id, projectId, entity: 'WorkOrderLine', entityId: lineId, action: 'DELETE', oldValues: old as any },
  });
  return res.json({ message: 'Linha removida' });
});
