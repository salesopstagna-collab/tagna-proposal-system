import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

export const milestonesRouter = Router();
milestonesRouter.use(authenticate);

const milestoneSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  criteria: z.string().optional(),
  paymentPct: z.number().min(0).max(100).optional(),
  order: z.number().int().optional(),
});

milestonesRouter.get('/:projectId/memories/:memoryId/milestones', async (req: AuthRequest, res: Response) => {
  const milestones = await prisma.milestone.findMany({
    where: { memoryId: req.params.memoryId },
    orderBy: { order: 'asc' },
  });
  return res.json(milestones);
});

milestonesRouter.post('/:projectId/memories/:memoryId/milestones', authorize('admin', 'sales_engineer'), async (req: AuthRequest, res: Response) => {
  const data = milestoneSchema.parse(req.body);
  const milestone = await prisma.milestone.create({
    data: {
      ...data,
      memoryId: req.params.memoryId,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
    },
  });
  return res.status(201).json(milestone);
});

milestonesRouter.put('/:projectId/memories/:memoryId/milestones/:msId', authorize('admin', 'sales_engineer'), async (req: AuthRequest, res: Response) => {
  const data = milestoneSchema.parse(req.body);
  const milestone = await prisma.milestone.update({
    where: { id: req.params.msId },
    data: { ...data, dueDate: data.dueDate ? new Date(data.dueDate) : undefined },
  });
  return res.json(milestone);
});

milestonesRouter.delete('/:projectId/memories/:memoryId/milestones/:msId', authorize('admin', 'sales_engineer'), async (req: AuthRequest, res: Response) => {
  await prisma.milestone.delete({ where: { id: req.params.msId } });
  return res.json({ message: 'Marco removido' });
});
