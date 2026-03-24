import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

export const scopeRouter = Router();
scopeRouter.use(authenticate);

const scopeItemSchema = z.object({
  order: z.number().int(),
  phase: z.string().min(1),
  activity: z.string().min(1),
  detalhamento: z.string().optional(),
  premissasExclusoes: z.string().optional(),
  included: z.boolean().optional(),
  notes: z.string().optional(),
});

scopeRouter.get('/:projectId/memories/:memoryId/scope', async (req: AuthRequest, res: Response) => {
  const items = await prisma.scopeItem.findMany({
    where: { memoryId: req.params.memoryId },
    orderBy: { order: 'asc' },
  });
  return res.json(items);
});

scopeRouter.post('/:projectId/memories/:memoryId/scope', authorize('admin', 'sales_engineer'), async (req: AuthRequest, res: Response) => {
  const data = scopeItemSchema.parse(req.body);
  const item = await prisma.scopeItem.create({ data: { ...data, memoryId: req.params.memoryId } });
  await prisma.auditLog.create({
    data: { userId: req.user!.id, projectId: req.params.projectId, entity: 'ScopeItem', entityId: item.id, action: 'CREATE', newValues: item as any },
  });
  return res.status(201).json(item);
});

scopeRouter.put('/:projectId/memories/:memoryId/scope/:itemId', authorize('admin', 'sales_engineer'), async (req: AuthRequest, res: Response) => {
  const old = await prisma.scopeItem.findUniqueOrThrow({ where: { id: req.params.itemId } });
  const item = await prisma.scopeItem.update({ where: { id: req.params.itemId }, data: req.body });
  await prisma.auditLog.create({
    data: { userId: req.user!.id, projectId: req.params.projectId, entity: 'ScopeItem', entityId: item.id, action: 'UPDATE', oldValues: old as any, newValues: item as any },
  });
  return res.json(item);
});

scopeRouter.post('/:projectId/memories/:memoryId/scope/bulk', authorize('admin', 'sales_engineer'), async (req: AuthRequest, res: Response) => {
  const { memoryId } = req.params;
  const items = req.body as any[];

  await prisma.scopeItem.deleteMany({ where: { memoryId } });

  const created = await prisma.scopeItem.createMany({
    data: items.map(item => ({ ...item, memoryId })),
  });

  return res.json({ count: created.count });
});

scopeRouter.delete('/:projectId/memories/:memoryId/scope/:itemId', authorize('admin', 'sales_engineer'), async (req: AuthRequest, res: Response) => {
  await prisma.scopeItem.delete({ where: { id: req.params.itemId } });
  return res.json({ message: 'Item removido' });
});
