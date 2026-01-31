import { Response } from 'express';
import prisma from '../../infrastructure/database/prisma.js';
import { AuthRequest } from '../../infrastructure/middleware/auth.js';

export class FavoritosController {
  static async getFavoritos(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ error: 'No autorizado' });
      }

      const favoritos = await prisma.favorito.findMany({
        where: { userId },
        include: {
          marketItem: {
            include: {
              detalles: true,
              caracteristicas: true,
              images: { orderBy: { position: 'asc' } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const items = favoritos.map((f) => ({
        ...f.marketItem,
        detalles: Object.fromEntries(f.marketItem.detalles.map((d) => [d.clave, d.valor])),
        caracteristicas: f.marketItem.caracteristicas.map((c) => c.texto),
      }));

      res.json(items);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async toggleFavorito(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId;
      const marketItemId = parseInt(req.params.marketItemId);

      if (!userId) {
        return res.status(401).json({ error: 'No autorizado' });
      }

      const existe = await prisma.favorito.findUnique({
        where: { userId_marketItemId: { userId, marketItemId } },
      });

      if (existe) {
        await prisma.favorito.delete({
          where: { id: existe.id },
        });
        return res.json({ favorito: false, message: 'Eliminado de favoritos' });
      } else {
        await prisma.favorito.create({
          data: { userId, marketItemId },
        });
        return res.json({ favorito: true, message: 'Agregado a favoritos' });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async isFavorito(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId;
      const marketItemId = parseInt(req.params.marketItemId);

      if (!userId) {
        return res.json({ favorito: false });
      }

      const existe = await prisma.favorito.findUnique({
        where: { userId_marketItemId: { userId, marketItemId } },
      });

      res.json({ favorito: !!existe });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
