import { Response } from 'express';
import prisma from '../../infrastructure/database/prisma.js';
import { AuthRequest } from '../../infrastructure/middleware/auth.js';

export class NotificacionController {
  static async getNotificaciones(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId;
      if (!userId) return res.status(401).json({ error: 'No autorizado' });

      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
      const soloNoLeidas = req.query.leido === 'false';

      const notificaciones = await prisma.notificacion.findMany({
        where: { userId, ...(soloNoLeidas && { leido: false }) },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      const noLeidas = await prisma.notificacion.count({ where: { userId, leido: false } });

      res.json({
        notificaciones,
        noLeidas,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async marcarLeida(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId;
      const id = parseInt(req.params.id);
      if (!userId) return res.status(401).json({ error: 'No autorizado' });

      await prisma.notificacion.updateMany({
        where: { id, userId },
        data: { leido: true },
      });

      res.json({ ok: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async marcarTodasLeidas(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId;
      if (!userId) return res.status(401).json({ error: 'No autorizado' });

      await prisma.notificacion.updateMany({
        where: { userId },
        data: { leido: true },
      });

      res.json({ ok: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async eliminar(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId;
      const id = parseInt(req.params.id, 10);
      if (!userId) return res.status(401).json({ error: 'No autorizado' });
      if (Number.isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

      const result = await prisma.notificacion.deleteMany({
        where: { id, userId },
      });

      if (result.count === 0) {
        return res.status(404).json({ error: 'Notificación no encontrada' });
      }

      res.json({ ok: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
