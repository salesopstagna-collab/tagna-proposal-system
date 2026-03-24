import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { recalculateDRE } from '../services/dreCalculator';

export const parametersRouter = Router();
parametersRouter.use(authenticate);

const paramsSchema = z.object({
  costHHDev: z.number().min(0),
  costHHField: z.number().min(0),
  priceHHDev: z.number().min(0),
  priceHHField: z.number().min(0),
  priceHHSupport: z.number().min(0).optional(),
  airfare: z.number().min(0).optional(),
  hotelPerDay: z.number().min(0).optional(),
  carRentalPerDay: z.number().min(0).optional(),
  mealsPerDay: z.number().min(0).optional(),
  fuel: z.number().min(0).optional(),
  mobilization: z.number().min(0).optional(),
  issRate: z.number().min(0).max(100).optional(),
  pisRate: z.number().min(0).max(100).optional(),
  cofinsRate: z.number().min(0).max(100).optional(),
  csllRate: z.number().min(0).max(100).optional(),
  irpjRate: z.number().min(0).max(100).optional(),
  inssRate: z.number().min(0).max(100).optional(),
});

parametersRouter.get('/:projectId/memories/:memoryId/parameters', async (req: AuthRequest, res: Response) => {
  const params = await prisma.projectParameters.findUnique({ where: { memoryId: req.params.memoryId } });
  return res.json(params || {});
});

parametersRouter.put('/:projectId/memories/:memoryId/parameters', authorize('admin', 'sales_engineer'), async (req: AuthRequest, res: Response) => {
  const data = paramsSchema.parse(req.body);
  const { memoryId } = req.params;

  const old = await prisma.projectParameters.findUnique({ where: { memoryId } });

  const params = await prisma.projectParameters.upsert({
    where: { memoryId },
    create: { memoryId, ...data },
    update: data,
  });

  await recalculateDRE(memoryId);

  await prisma.auditLog.create({
    data: {
      userId: req.user!.id, projectId: req.params.projectId,
      entity: 'ProjectParameters', entityId: params.id, action: old ? 'UPDATE' : 'CREATE',
      oldValues: old as any, newValues: params as any,
    },
  });

  return res.json(params);
});
