import { Intercambio } from '../../domain/entities/Intercambio.js';
import { IIntercambioRepository } from '../../domain/repositories/IIntercambioRepository.js';
import prisma from '../database/prisma.js';

export class IntercambioRepository implements IIntercambioRepository {
  async findById(id: number): Promise<Intercambio | null> {
    const intercambioData = await prisma.intercambio.findUnique({
      where: { id },
    });

    if (!intercambioData) return null;

    return Intercambio.create({
      id: intercambioData.id,
      usuarioId: intercambioData.usuarioId,
      otraPersonaId: intercambioData.otraPersonaId,
      otraPersonaNombre: intercambioData.otraPersonaNombre,
      descripcion: intercambioData.descripcion,
      creditos: intercambioData.creditos,
      fecha: intercambioData.fecha,
      estado: intercambioData.estado as 'pendiente' | 'confirmado' | 'cancelado',
      marketItemId: (intercambioData as any).marketItemId ?? undefined,
      createdAt: intercambioData.createdAt,
      updatedAt: intercambioData.updatedAt,
    });
  }

  async findByUserId(userId: number): Promise<Intercambio[]> {
    const intercambiosData = await prisma.intercambio.findMany({
      where: {
        OR: [
          { usuarioId: userId },
          { otraPersonaId: userId },
        ],
      },
      orderBy: { fecha: 'desc' },
    });

    return intercambiosData.map((data: any) => Intercambio.create({
      id: data.id,
      usuarioId: data.usuarioId,
      otraPersonaId: data.otraPersonaId,
      otraPersonaNombre: data.otraPersonaNombre,
      descripcion: data.descripcion,
      creditos: data.creditos,
      fecha: data.fecha,
      estado: data.estado as 'pendiente' | 'confirmado' | 'cancelado',
      marketItemId: data.marketItemId ?? undefined,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    }));
  }

  async save(intercambio: Intercambio): Promise<Intercambio> {
    const intercambioData = await prisma.intercambio.create({
      data: {
        usuarioId: intercambio.usuarioId,
        otraPersonaId: intercambio.otraPersonaId,
        otraPersonaNombre: intercambio.otraPersonaNombre,
        descripcion: intercambio.descripcion,
        creditos: intercambio.creditos,
        fecha: intercambio.fecha,
        estado: intercambio.estado,
        marketItemId: intercambio.marketItemId ?? null,
      },
    });

    return Intercambio.create({
      id: intercambioData.id,
      usuarioId: intercambioData.usuarioId,
      otraPersonaId: intercambioData.otraPersonaId,
      otraPersonaNombre: intercambioData.otraPersonaNombre,
      descripcion: intercambioData.descripcion,
      creditos: intercambioData.creditos,
      fecha: intercambioData.fecha,
      estado: intercambioData.estado as 'pendiente' | 'confirmado' | 'cancelado',
      marketItemId: (intercambioData as any).marketItemId ?? undefined,
      createdAt: intercambioData.createdAt,
      updatedAt: intercambioData.updatedAt,
    });
  }

  async update(intercambio: Intercambio): Promise<Intercambio> {
    const intercambioData = await prisma.intercambio.update({
      where: { id: intercambio.id },
      data: {
        estado: intercambio.estado,
      },
    });

    return Intercambio.create({
      id: intercambioData.id,
      usuarioId: intercambioData.usuarioId,
      otraPersonaId: intercambioData.otraPersonaId,
      otraPersonaNombre: intercambioData.otraPersonaNombre,
      descripcion: intercambioData.descripcion,
      creditos: intercambioData.creditos,
      fecha: intercambioData.fecha,
      estado: intercambioData.estado as 'pendiente' | 'confirmado' | 'cancelado',
      createdAt: intercambioData.createdAt,
      updatedAt: intercambioData.updatedAt,
    });
  }
}
