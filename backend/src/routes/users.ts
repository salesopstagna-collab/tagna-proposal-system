import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

export const usersRouter = Router();
usersRouter.use(authenticate);

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['admin', 'sales_engineer', 'commercial', 'field_team', 'finance', 'viewer']),
});

usersRouter.get('/', authorize('admin'), async (req: AuthRequest, res: Response) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
    orderBy: { name: 'asc' },
  });
  return res.json(users);
});

usersRouter.post('/', authorize('admin'), async (req: AuthRequest, res: Response) => {
  const data = createUserSchema.parse(req.body);
  const hashed = await bcrypt.hash(data.password, 10);
  const user = await prisma.user.create({
    data: { ...data, password: hashed },
    select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
  });
  return res.status(201).json(user);
});

usersRouter.put('/:id', authorize('admin'), async (req: AuthRequest, res: Response) => {
  const { password, ...data } = req.body;
  const updateData: any = { ...data };
  if (password) updateData.password = await bcrypt.hash(password, 10);
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: updateData,
    select: { id: true, name: true, email: true, role: true, active: true },
  });
  return res.json(user);
});

usersRouter.delete('/:id', authorize('admin'), async (req: AuthRequest, res: Response) => {
  await prisma.user.update({ where: { id: req.params.id }, data: { active: false } });
  return res.json({ message: 'Usuário desativado' });
});
