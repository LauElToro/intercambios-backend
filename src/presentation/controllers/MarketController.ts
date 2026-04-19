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
      const userLat = req.query.userLat != null ? Number(req.query.userLat) : undefined;
      const userLng = req.query.userLng != null ? Number(req.query.userLng) : undefined;
      const distanciaMax = req.query.distanciaMax != null ? Number(req.query.distanciaMax) : undefined;

      // Validar coordenadas para filtro de distancia (evitar NaN)
      const hasValidLocation = typeof userLat === 'number' && !isNaN(userLat) &&
        typeof userLng === 'number' && !isNaN(userLng) &&
        typeof distanciaMax === 'number' && !isNaN(distanciaMax) && distanciaMax > 0;

      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 24));

      const searchParam = req.query.search;
      const search = typeof searchParam === 'string' && searchParam.trim() ? searchParam.trim() : undefined;

      let soloDisponibles = true;
      if (req.query.soloDisponibles === 'false' || req.query.soloDisponibles === '0') {
        soloDisponibles = false;
      }

      const filters = {
        rubro: req.query.rubro as string,
        tipo: req.query.tipo as 'productos' | 'servicios',
        precioMin: req.query.precioMin ? Number(req.query.precioMin) : undefined,
        precioMax: req.query.precioMax ? Number(req.query.precioMax) : undefined,
        vendedorId: req.query.vendedorId ? Number(req.query.vendedorId) : undefined,
        search,
        userLat: hasValidLocation ? userLat : undefined,
        userLng: hasValidLocation ? userLng : undefined,
        distanciaMax: hasValidLocation ? distanciaMax : undefined,
        page,
        limit,
        soloDisponibles: req.query.vendedorId ? false : soloDisponibles,
      };

      const result = await getMarketItemsUseCase.execute(filters);
      res.json({
        ...result,
        data: result.data.map((it) => it.toJSON()),
      });
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
        select: { id: true, nombre: true, contacto: true, ubicacion: true, rating: true, totalResenas: true, miembroDesde: true, verificado: true, kycVerificado: true },
      });

      res.json({
        ...item.toJSON(),
        vendedor: user ? {
          id: user.id,
          nombre: user.nombre,
          contacto: user.contacto,
          ubicacion: user.ubicacion,
          rating: user.rating ?? 0,
          totalResenas: user.totalResenas ?? 0,
          miembroDesde: user.miembroDesde,
          verificado: user.verificado,
          kycVerificado: user.kycVerificado,
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
      const rubro = req.body.rubro as string;
      let stock: number | null = null;
      if (rubro === 'servicios') {
        stock = null;
      } else {
        const raw = req.body.stock;
        const n = typeof raw === 'number' ? raw : parseInt(String(raw ?? ''), 10);
        if (!Number.isFinite(n) || n < 1) {
          return res.status(400).json({ error: 'Indicá la cantidad en stock (mínimo 1). Los servicios no llevan stock.' });
        }
        stock = Math.floor(n);
      }
      const body = { ...req.body, vendedorId: userId, stock };
      const item = await marketItemRepository.save(body as any);
      res.status(201).json(item.toJSON());
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

      const effectiveRubro = (req.body.rubro ?? existingItem.rubro) as string;
      let nextStock: number | null =
        effectiveRubro === 'servicios' ? null : (existingItem.stock ?? 1);
      if (effectiveRubro === 'servicios') {
        nextStock = null;
      } else if (req.body.stock !== undefined) {
        const raw = req.body.stock;
        const n = typeof raw === 'number' ? raw : parseInt(String(raw), 10);
        if (!Number.isFinite(n) || n < 0) {
          return res.status(400).json({ error: 'Stock inválido' });
        }
        nextStock = Math.floor(n);
      }

      const updatedItem = MarketItem.create({
        id: existingItem.id,
        titulo: req.body.titulo ?? existingItem.titulo,
        descripcion: req.body.descripcion ?? existingItem.descripcion,
        precio: req.body.precio ?? existingItem.precio,
        tipoPago: req.body.tipoPago !== undefined ? req.body.tipoPago : existingItem.tipoPago,
        rubro: effectiveRubro as 'servicios' | 'productos' | 'alimentos' | 'experiencias',
        vendedorId: existingItem.vendedorId,
        descripcionCompleta: req.body.descripcionCompleta ?? existingItem.descripcionCompleta,
        ubicacion: req.body.ubicacion ?? existingItem.ubicacion,
        lat: req.body.lat !== undefined ? req.body.lat : existingItem.lat,
        lng: req.body.lng !== undefined ? req.body.lng : existingItem.lng,
        distancia: req.body.distancia ?? existingItem.distancia,
        imagen: req.body.imagen ?? existingItem.imagen,
        rating: req.body.rating ?? existingItem.rating,
        detalles: req.body.detalles ?? existingItem.detalles,
        caracteristicas: req.body.caracteristicas ?? existingItem.caracteristicas,
        images: req.body.images ?? existingItem.images,
        stock: nextStock,
        status: existingItem.status,
        createdAt: existingItem.createdAt,
        updatedAt: existingItem.updatedAt,
      });

      const savedItem = await marketItemRepository.update(updatedItem as any);
      res.json(savedItem.toJSON());
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async deleteMarketItem(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const userId = (req as AuthRequest).userId;
      if (!userId) {
        return res.status(401).json({ error: 'No autorizado' });
      }
      const item = await marketItemRepository.findById(id);
      if (!item) {
        return res.status(404).json({ error: 'Item no encontrado' });
      }
      if (item.vendedorId !== userId) {
        return res.status(403).json({ error: 'Solo podés eliminar tus propias publicaciones' });
      }
      await marketItemRepository.delete(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Error al eliminar item' });
    }
  }
}
