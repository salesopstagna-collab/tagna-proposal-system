import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { prisma } from '../lib/prisma';

export const createAuditMiddleware = (entity: string, action: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);
    res.json = function(data: any) {
      if (res.statusCode < 400 && req.user) {
        const entityId = data?.id || req.params.id || 'unknown';
        prisma.auditLog.create({
          data: {
            userId: req.user.id,
            projectId: req.params.projectId,
            entity,
            entityId,
            action,
            newValues: action !== 'DELETE' ? data : undefined,
          },
        }).catch(console.error);
      }
      return originalJson(data);
    };
    next();
  };
};
