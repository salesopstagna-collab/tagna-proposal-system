import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

export const projectsRouter = Router();
projectsRouter.use(authenticate);

const createProjectSchema = z.object({
  hubspotDealId: z.string().min(1),
  projectNumber: z.string().min(1),
  clientName: z.string().min(1),
  description: z.string().optional(),
});

projectsRouter.get('/', async (req: AuthRequest, res: Response) => {
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      memories: {
        where: { isActive: true },
        select: { id: true, version: true, label: true, isActive: true, updatedAt: true },
      },
    },
  });
  return res.json(projects);
});

projectsRouter.get('/:id', async (req: AuthRequest, res: Response) => {
  const project = await prisma.project.findUniqueOrThrow({
    where: { id: req.params.id },
    include: {
      memories: {
        orderBy: { version: 'desc' },
        include: { dre: true },
      },
    },
  });
  return res.json(project);
});

projectsRouter.post('/', authorize('admin', 'sales_engineer', 'commercial'), async (req: AuthRequest, res: Response) => {
  const data = createProjectSchema.parse(req.body);
  const project = await prisma.project.create({ data });
  await prisma.auditLog.create({
    data: { userId: req.user!.id, projectId: project.id, entity: 'Project', entityId: project.id, action: 'CREATE', newValues: project as any },
  });
  return res.status(201).json(project);
});

projectsRouter.put('/:id', authorize('admin', 'sales_engineer', 'commercial'), async (req: AuthRequest, res: Response) => {
  const old = await prisma.project.findUniqueOrThrow({ where: { id: req.params.id } });
  const project = await prisma.project.update({ where: { id: req.params.id }, data: req.body });
  await prisma.auditLog.create({
    data: { userId: req.user!.id, projectId: project.id, entity: 'Project', entityId: project.id, action: 'UPDATE', oldValues: old as any, newValues: project as any },
  });
  return res.json(project);
});

projectsRouter.delete('/:id', authorize('admin'), async (req: AuthRequest, res: Response) => {
  await prisma.project.delete({ where: { id: req.params.id } });
  return res.json({ message: 'Projeto excluído' });
});
