import { Request, Response } from 'express';
import { GetMarketItemsUseCase } from '../../application/use-cases/market/GetMarketItemsUseCase.js';
import { MarketItemRepository } from '../../infrastructure/repositories/MarketItemRepository.js';
import { MarketItem } from '../../domain/entities/MarketItem.js';
import { AuthRequest } from '../../infrastructure/middleware/auth.js';
import prisma from '../../infrastructure/database/prisma.js';

const marketItemRepository = new MarketItemRepository();
const getMarketItemsUseCase = new GetMarketItemsUseCase(marketItemRepository);

export class MarketController {
  static async getMarketItems(req: Request, res: Response) {
    try {
      const filters = {
        rubro: req.query.rubro as string,
        tipo: req.query.tipo as 'productos' | 'servicios',
        precioMin: req.query.precioMin ? Number(req.query.precioMin) : undefined,
        precioMax: req.query.precioMax ? Number(req.query.precioMax) : undefined,
        vendedorId: req.query.vendedorId ? Number(req.query.vendedorId) : undefined,
      };

      const items = await getMarketItemsUseCase.execute(filters);
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: 'Error al obtener items del market' });
    }
  }

  static async getMarketItemById(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const item = await marketItemRepository.findById(id);
      
      if (!item) {
        return res.status(404).json({ error: 'Item no encontrado' });
      }

      const user = await prisma.user.findUnique({
        where: { id: item.vendedorId },
        select: { id: true, nombre: true, contacto: true, ubicacion: true, rating: true, totalResenas: true, miembroDesde: true, verificado: true },
      });

      res.json({
        ...item,
        vendedor: user ? {
          id: user.id,
          nombre: user.nombre,
          contacto: user.contacto,
          ubicacion: user.ubicacion,
          rating: user.rating ?? 0,
          totalResenas: user.totalResenas ?? 0,
          miembroDesde: user.miembroDesde,
          verificado: user.verificado,
          avatar: user.nombre.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase(),
        } : null,
      });
    } catch (error) {
      res.status(500).json({ error: 'Error al obtener item' });
    }
  }

  static async createMarketItem(req: Request, res: Response) {
    try {
      const userId = (req as AuthRequest).userId;
      if (!userId) {
        return res.status(401).json({ error: 'Debes iniciar sesión para crear un producto' });
      }
      const body = { ...req.body, vendedorId: userId };
      const item = await marketItemRepository.save(body as any);
      res.status(201).json(item);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async updateMarketItem(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const existingItem = await marketItemRepository.findById(id);
      
      if (!existingItem) {
        return res.status(404).json({ error: 'Item no encontrado' });
      }

      const updatedItem = MarketItem.create({
        id: existingItem.id,
        titulo: req.body.titulo ?? existingItem.titulo,
        descripcion: req.body.descripcion ?? existingItem.descripcion,
        precio: req.body.precio ?? existingItem.precio,
        rubro: req.body.rubro ?? existingItem.rubro,
        vendedorId: existingItem.vendedorId,
        descripcionCompleta: req.body.descripcionCompleta ?? existingItem.descripcionCompleta,
        ubicacion: req.body.ubicacion ?? existingItem.ubicacion,
        distancia: req.body.distancia ?? existingItem.distancia,
        imagen: req.body.imagen ?? existingItem.imagen,
        rating: req.body.rating ?? existingItem.rating,
        detalles: req.body.detalles ?? existingItem.detalles,
        caracteristicas: req.body.caracteristicas ?? existingItem.caracteristicas,
        createdAt: existingItem.createdAt,
        updatedAt: existingItem.updatedAt,
      });

      const savedItem = await marketItemRepository.update(updatedItem);
      res.json(savedItem);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async deleteMarketItem(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      await marketItemRepository.delete(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Error al eliminar item' });
    }
  }
}
