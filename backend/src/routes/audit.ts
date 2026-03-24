import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

export const auditRouter = Router();
auditRouter.use(authenticate, authorize('admin', 'finance'));

auditRouter.get('/', async (req: AuthRequest, res: Response) => {
  const { projectId, entity, userId, page = '1', limit = '50' } = req.query as Record<string, string>;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where: any = {};
  if (projectId) where.projectId = projectId;
  if (entity) where.entity = entity;
  if (userId) where.userId = userId;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, projectNumber: true, clientName: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit),
    }),
    prisma.auditLog.count({ where }),
  ]);

  return res.json({ logs, total, page: parseInt(page), limit: parseInt(limit) });
});
