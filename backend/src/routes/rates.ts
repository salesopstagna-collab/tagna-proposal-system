import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

export const ratesRouter = Router();
ratesRouter.use(authenticate);

const rateSchema = z.object({
  salePrice: z.number().positive(),
  costPrice: z.number().positive(),
  revenueDeductionPct: z.number().min(0).max(100),
  contributionMarginPct: z.number().min(0).max(100),
  travelMarginPct: z.number().min(0).max(100),
  active: z.boolean().optional(),
});

// GET all professional rates
ratesRouter.get('/professional', async (req: AuthRequest, res: Response) => {
  const rates = await prisma.professionalRate.findMany({
    orderBy: { order: 'asc' },
  });
  return res.json(rates);
});

// PUT update a single rate (admin only)
ratesRouter.put('/professional/:id', authorize('admin', 'finance'), async (req: AuthRequest, res: Response) => {
  const data = rateSchema.parse(req.body);
  const old = await prisma.professionalRate.findUniqueOrThrow({ where: { id: req.params.id } });
  const rate = await prisma.professionalRate.update({
    where: { id: req.params.id },
    data,
  });
  await prisma.auditLog.create({
    data: {
      userId: req.user!.id,
      entity: 'ProfessionalRate',
      entityId: rate.id,
      action: 'UPDATE',
      oldValues: old as any,
      newValues: rate as any,
    },
  });
  return res.json(rate);
});

// GET all travel rates
ratesRouter.get('/travel', async (req: AuthRequest, res: Response) => {
  const rates = await prisma.travelRate.findMany({
    orderBy: { type: 'asc' },
  });
  return res.json(rates);
});

// PUT update a travel rate (admin only)
ratesRouter.put('/travel/:id', authorize('admin', 'finance'), async (req: AuthRequest, res: Response) => {
  const data = z.object({
    costPrice: z.number().positive(),
    salePrice: z.number().positive(),
    active: z.boolean().optional(),
  }).parse(req.body);
  const old = await prisma.travelRate.findUniqueOrThrow({ where: { id: req.params.id } });
  const rate = await prisma.travelRate.update({ where: { id: req.params.id }, data });
  await prisma.auditLog.create({
    data: { userId: req.user!.id, entity: 'TravelRate', entityId: rate.id, action: 'UPDATE', oldValues: old as any, newValues: rate as any },
  });
  return res.json(rate);
});
