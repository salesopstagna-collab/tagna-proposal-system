import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

export const dreRouter = Router();
dreRouter.use(authenticate);

dreRouter.get('/:projectId/memories/:memoryId/dre', async (req: AuthRequest, res: Response) => {
  const dre = await prisma.dRE.findUnique({ where: { memoryId: req.params.memoryId } });
  return res.json(dre || {});
});
