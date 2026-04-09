import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AdminRequest extends Request {
  admin?: boolean;
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export const adminMiddleware = (req: AdminRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No autorizado. Requiere login de admin.' });
    }
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as { admin?: boolean };
    if (!decoded.admin) {
      return res.status(403).json({ error: 'Acceso denegado. Solo administradores.' });
    }
    req.admin = true;
    next();
  } catch {
    return res.status(401).json({ error: 'Token de admin inválido o expirado.' });
  }
};
