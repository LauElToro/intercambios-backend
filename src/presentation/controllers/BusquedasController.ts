import { Response } from 'express';
import prisma from '../../infrastructure/database/prisma.js';
import { AuthRequest } from '../../infrastructure/middleware/auth.js';

export class BusquedasController {
  /** Registrar una búsqueda (solo si el usuario aceptó cookies de preferencias) */
  static async registrar(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ error: 'No autorizado' });
      }

      const { termino, seccion, filtros } = req.body;
      const seccionValida = seccion === 'market' || seccion === 'coincidencias';
      if (!seccionValida) {
        return res.status(400).json({ error: 'seccion debe ser "market" o "coincidencias"' });
      }

      const terminoStr = typeof termino === 'string' ? termino.trim() : '';
      const filtrosObj = filtros && typeof filtros === 'object' ? filtros : null;

      await prisma.busqueda.create({
        data: {
          userId,
          termino: terminoStr,
          seccion,
          filtros: filtrosObj,
        },
      });

      res.status(201).json({ ok: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
