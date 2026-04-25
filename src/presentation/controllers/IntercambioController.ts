import { Request, Response } from 'express';
import { CreateIntercambioUseCase } from '../../application/use-cases/intercambio/CreateIntercambioUseCase.js';
import { GetIntercambiosUseCase } from '../../application/use-cases/intercambio/GetIntercambiosUseCase.js';
import { ConfirmIntercambioUseCase } from '../../application/use-cases/intercambio/ConfirmIntercambioUseCase.js';
import { IntercambioRepository } from '../../infrastructure/repositories/IntercambioRepository.js';
import { UserRepository } from '../../infrastructure/repositories/UserRepository.js';
import { MarketItemRepository } from '../../infrastructure/repositories/MarketItemRepository.js';
import { AuthRequest } from '../../infrastructure/middleware/auth.js';

const intercambioRepository = new IntercambioRepository();
const userRepository = new UserRepository();
const marketItemRepository = new MarketItemRepository();
const createIntercambioUseCase = new CreateIntercambioUseCase();
const getIntercambiosUseCase = new GetIntercambiosUseCase(intercambioRepository);
const confirmIntercambioUseCase = new ConfirmIntercambioUseCase(intercambioRepository);

function intercambioToJson(intercambio: any): Record<string, unknown> {
  return {
    id: intercambio.id,
    usuarioId: intercambio.usuarioId,
    otraPersonaId: intercambio.otraPersonaId,
    otraPersonaNombre: intercambio.otraPersonaNombre,
    descripcion: intercambio.descripcion,
    creditos: intercambio.creditos,
    fecha: intercambio.fecha,
    estado: intercambio.estado,
    marketItemId: intercambio.marketItemId,
    conversacionId: intercambio.conversacionId ?? null,
    createdAt: intercambio.createdAt,
    updatedAt: intercambio.updatedAt,
  };
}

function marketItemToJson(item: any): Record<string, unknown> | null {
  if (!item) return null;
  const primaryImage = item.images?.find((i: any) => i?.isPrimary) || item.images?.[0];
  return {
    id: item.id,
    titulo: item.titulo,
    descripcion: item.descripcion,
    descripcionCompleta: item.descripcionCompleta,
    precio: item.precio,
    rubro: item.rubro,
    ubicacion: item.ubicacion,
    imagen: item.imagen,
    imagenes: item.images?.map((img: any) => ({ url: img?.url, alt: img?.alt })) || [],
    imagenPrincipal: primaryImage?.url || item.imagen,
    condition: item.condition,
    availability: item.availability,
    tipoPago: item.tipoPago,
    detalles: item.detalles,
    caracteristicas: item.caracteristicas,
    rating: item.rating,
  };
}

export class IntercambioController {
  static async getIntercambios(req: AuthRequest, res: Response) {
    try {
      const userId = parseInt(req.params.userId);
      
      // Verificar que el usuario solo vea sus propios intercambios
      if (req.userId !== userId) {
        return res.status(403).json({ error: 'No autorizado' });
      }

      const intercambios = await getIntercambiosUseCase.execute(userId);
      const result = await Promise.all(intercambios.map(async (i: any) => {
        const base = intercambioToJson(i);
        if (i.marketItemId) {
          const item = await marketItemRepository.findById(i.marketItemId);
          if (item) {
            (base as any).marketItem = marketItemToJson(item);
          }
        }
        return base;
      }));
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async createIntercambio(req: AuthRequest, res: Response) {
    try {
      const { otraPersonaId, otraPersonaNombre, descripcion, creditos, fecha, otraEmail } = req.body as {
        otraPersonaId?: number;
        otraPersonaNombre?: string;
        descripcion?: string;
        creditos?: number;
        fecha?: string;
        otraEmail?: string;
      };

      if (!req.userId) {
        return res.status(401).json({ error: 'No autorizado' });
      }

      let otraId = otraPersonaId != null ? Number(otraPersonaId) : NaN;
      let otraNom = otraPersonaNombre?.trim() || '';
      if ((!otraId || otraId <= 0 || !otraNom) && otraEmail?.trim()) {
        const u = await userRepository.findByEmail(otraEmail.trim().toLowerCase());
        if (!u) {
          return res.status(400).json({ error: 'No encontramos un usuario con ese email' });
        }
        otraId = u.id!;
        otraNom = u.nombre;
      }

      if (!otraId || otraId <= 0 || !otraNom || !descripcion?.trim() || creditos === undefined) {
        return res.status(400).json({
          error:
            'Faltan datos: indicá la otra parte (id y nombre, o su email) y la descripción. Los créditos (IOX) son obligatorios (podés poner 0).',
        });
      }

      const intercambio = await createIntercambioUseCase.execute({
        usuarioId: req.userId,
        otraPersonaId: otraId,
        otraPersonaNombre: otraNom,
        descripcion: descripcion.trim(),
        creditos: Number(creditos),
        fecha: fecha ? new Date(fecha) : undefined,
      });

      res.status(201).json(intercambio);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async confirmIntercambio(req: AuthRequest, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const intercambio = await confirmIntercambioUseCase.execute(id);
      res.json(intercambio);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}
