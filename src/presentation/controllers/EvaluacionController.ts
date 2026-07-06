import { Response } from 'express';
import { AuthRequest } from '../../infrastructure/middleware/auth.js';
import prisma from '../../infrastructure/database/prisma.js';

function clampScore(n: unknown): number | null {
  const v = typeof n === 'number' ? n : parseInt(String(n ?? ''), 10);
  if (!Number.isFinite(v) || v < 1 || v > 5) return null;
  return Math.floor(v);
}

async function recalcUserRating(userId: number): Promise<void> {
  const agg = await prisma.evaluacionIntercambio.aggregate({
    where: { evaluadoId: userId },
    _avg: { puntuacionAtencion: true },
    _count: { id: true },
  });
  await prisma.user.update({
    where: { id: userId },
    data: {
      rating: agg._avg.puntuacionAtencion ?? 0,
      totalResenas: agg._count.id,
    },
  });
}

export class EvaluacionController {
  /** Intercambios confirmados donde el usuario aún no evaluó a la otra parte. */
  static async getPendientes(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId;
      if (!userId) return res.status(401).json({ error: 'No autorizado' });

      const intercambios = await prisma.intercambio.findMany({
        where: {
          estado: 'confirmado',
          OR: [{ usuarioId: userId }, { otraPersonaId: userId }],
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          marketItem: { select: { id: true, titulo: true, rubro: true, imagen: true } },
          evaluaciones: { select: { evaluadorId: true } },
        },
      });

      const pendientes = intercambios
        .filter((i) => !i.evaluaciones.some((e) => e.evaluadorId === userId))
        .map((i) => {
          const soyComprador = i.usuarioId === userId;
          const evaluadoId = soyComprador ? i.otraPersonaId : i.usuarioId;
          const evaluadoNombre = soyComprador ? i.otraPersonaNombre : null;
          return {
            intercambioId: i.id,
            soyComprador,
            evaluadoId,
            evaluadoNombre,
            descripcion: i.descripcion,
            fecha: i.fecha,
            marketItem: i.marketItem,
            rubro: i.marketItem?.rubro ?? 'productos',
          };
        });

      res.json(pendientes);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Error al listar evaluaciones pendientes';
      res.status(500).json({ error: msg });
    }
  }

  /** Contexto para la pantalla de evaluación. */
  static async getContexto(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId;
      const intercambioId = parseInt(req.params.intercambioId, 10);
      if (!userId) return res.status(401).json({ error: 'No autorizado' });
      if (!Number.isFinite(intercambioId)) return res.status(400).json({ error: 'ID inválido' });

      const intercambio = await prisma.intercambio.findUnique({
        where: { id: intercambioId },
        include: {
          marketItem: { select: { id: true, titulo: true, rubro: true, imagen: true } },
          evaluaciones: true,
        },
      });
      if (!intercambio) return res.status(404).json({ error: 'Intercambio no encontrado' });
      if (intercambio.usuarioId !== userId && intercambio.otraPersonaId !== userId) {
        return res.status(403).json({ error: 'No tenés acceso a este intercambio' });
      }
      if (intercambio.estado !== 'confirmado') {
        return res.status(400).json({ error: 'Solo podés evaluar intercambios confirmados' });
      }

      const soyComprador = intercambio.usuarioId === userId;
      const evaluadoId = soyComprador ? intercambio.otraPersonaId : intercambio.usuarioId;
      const evaluado = await prisma.user.findUnique({
        where: { id: evaluadoId },
        select: { id: true, nombre: true, nombreTienda: true, profileSlug: true, fotoPerfil: true },
      });
      const yaEvaluado = intercambio.evaluaciones.some((e) => e.evaluadorId === userId);
      const rubro = intercambio.marketItem?.rubro ?? 'productos';
      const esServicio = rubro === 'servicios' || rubro === 'experiencias';

      res.json({
        intercambioId: intercambio.id,
        soyComprador,
        yaEvaluado,
        evaluado,
        marketItem: intercambio.marketItem,
        rubro,
        esServicio,
        labels: {
          item: esServicio ? 'Servicio' : 'Producto',
          atencion: 'Atención',
        },
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Error al cargar contexto';
      res.status(500).json({ error: msg });
    }
  }

  static async crear(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId;
      if (!userId) return res.status(401).json({ error: 'No autorizado' });

      const intercambioId = parseInt(String(req.body?.intercambioId ?? ''), 10);
      const puntuacionAtencion = clampScore(req.body?.puntuacionAtencion);
      const puntuacionItemRaw = req.body?.puntuacionItem;
      const puntuacionItem =
        puntuacionItemRaw == null || puntuacionItemRaw === ''
          ? null
          : clampScore(puntuacionItemRaw);
      const comentario = String(req.body?.comentario ?? '').trim().slice(0, 2000) || null;

      if (!Number.isFinite(intercambioId)) {
        return res.status(400).json({ error: 'intercambioId inválido' });
      }
      if (puntuacionAtencion == null) {
        return res.status(400).json({ error: 'La puntuación de atención debe ser entre 1 y 5' });
      }

      const intercambio = await prisma.intercambio.findUnique({
        where: { id: intercambioId },
        include: { marketItem: { select: { rubro: true } } },
      });
      if (!intercambio) return res.status(404).json({ error: 'Intercambio no encontrado' });
      if (intercambio.usuarioId !== userId && intercambio.otraPersonaId !== userId) {
        return res.status(403).json({ error: 'No tenés acceso a este intercambio' });
      }
      if (intercambio.estado !== 'confirmado') {
        return res.status(400).json({ error: 'Solo podés evaluar intercambios confirmados' });
      }

      const soyComprador = intercambio.usuarioId === userId;
      const evaluadoId = soyComprador ? intercambio.otraPersonaId : intercambio.usuarioId;
      const rubro = intercambio.marketItem?.rubro ?? 'productos';

      if (soyComprador && puntuacionItem == null) {
        return res.status(400).json({
          error: `La puntuación de ${rubro === 'servicios' ? 'servicio' : 'producto'} debe ser entre 1 y 5`,
        });
      }

      const existing = await prisma.evaluacionIntercambio.findUnique({
        where: { intercambioId_evaluadorId: { intercambioId, evaluadorId: userId } },
      });
      if (existing) {
        return res.status(400).json({ error: 'Ya evaluaste este intercambio' });
      }

      const evaluacion = await prisma.evaluacionIntercambio.create({
        data: {
          intercambioId,
          evaluadorId: userId,
          evaluadoId,
          puntuacionItem: soyComprador ? puntuacionItem : puntuacionItem,
          puntuacionAtencion,
          comentario,
          rubro,
        },
      });

      await recalcUserRating(evaluadoId);

      res.status(201).json({ ok: true, evaluacion });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Error al guardar evaluación';
      res.status(500).json({ error: msg });
    }
  }
}
