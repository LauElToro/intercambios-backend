import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../database/prisma.js';

export interface AuthRequest extends Request {
  userId?: number;
  userEmail?: string;
  file?: Express.Multer.File;
  params: Request['params'];
  body: Request['body'];
  headers: Request['headers'];
}

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as { userId: number; email: string };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { bannedAt: true },
    });
    if (user?.bannedAt) {
      return res.status(403).json({ error: 'Usuario suspendido' });
    }

    req.userId = decoded.userId;
    req.userEmail = decoded.email;

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido' });
  }
};
