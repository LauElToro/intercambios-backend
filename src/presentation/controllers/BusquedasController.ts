import { Response } from 'express';
import prisma from '../../infrastructure/database/prisma.js';
import { AuthRequest } from '../../infrastructure/middleware/auth.js';
import { notificationService } from '../../infrastructure/services/notification.service.js';

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

      // Notificar vendedores cuyos productos coincidieron con la búsqueda (async, no bloquea)
      if (terminoStr.length >= 2) {
        const term = terminoStr.toLowerCase();
        const items = await prisma.marketItem.findMany({
          where: {
            status: 'active',
            vendedorId: { not: userId },
            OR: [
              { titulo: { contains: term, mode: 'insensitive' } },
              { descripcion: { contains: term, mode: 'insensitive' } },
            ],
          },
          select: { vendedorId: true, titulo: true },
          take: 20,
        });
        const vendedoresMap = new Map<number, string>();
        for (const i of items) {
          if (!vendedoresMap.has(i.vendedorId)) vendedoresMap.set(i.vendedorId, i.titulo);
        }
        for (const [vId, titulo] of vendedoresMap) {
          notificationService
            .create({
              userId: vId,
              tipo: 'apareciste_busquedas',
              titulo: 'Apareciste en una búsqueda',
              mensaje: `"${titulo}" coincidió con una búsqueda reciente.`,
              metadata: { producto: titulo },
            })
            .catch(() => {});
        }
      }

      res.status(201).json({ ok: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
