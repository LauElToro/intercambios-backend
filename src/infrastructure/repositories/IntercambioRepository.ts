import { Intercambio } from '../../domain/entities/Intercambio.js';
import { IIntercambioRepository } from '../../domain/repositories/IIntercambioRepository.js';
import prisma from '../database/prisma.js';

function parseModo(raw: unknown): 'compra' | 'permuta' | null {
  if (raw === 'compra' || raw === 'permuta') return raw;
  return null;
}

function toEntity(data: {
  id: number;
  usuarioId: number;
  otraPersonaId: number;
  otraPersonaNombre: string;
  descripcion: string;
  creditos: number;
  fecha: Date;
  estado: string;
  marketItemId?: number | null;
  conversacionId?: number | null;
  otroMarketItemId?: number | null;
  modo?: string | null;
  createdAt: Date;
  updatedAt: Date;
}): Intercambio {
  return Intercambio.create({
    id: data.id,
    usuarioId: data.usuarioId,
    otraPersonaId: data.otraPersonaId,
    otraPersonaNombre: data.otraPersonaNombre,
    descripcion: data.descripcion,
    creditos: data.creditos,
    fecha: data.fecha,
    estado: data.estado as 'pendiente' | 'confirmado' | 'cancelado',
    marketItemId: data.marketItemId ?? undefined,
    conversacionId: data.conversacionId ?? null,
    otroMarketItemId: data.otroMarketItemId ?? null,
    modo: parseModo(data.modo),
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  });
}

export class IntercambioRepository implements IIntercambioRepository {
  async findById(id: number): Promise<Intercambio | null> {
    const intercambioData = await prisma.intercambio.findUnique({
      where: { id },
    });

    if (!intercambioData) return null;
    return toEntity(intercambioData);
  }

  async findByCompradorAndMarketItem(compradorId: number, marketItemId: number): Promise<Intercambio | null> {
    const intercambioData = await prisma.intercambio.findFirst({
      where: { usuarioId: compradorId, marketItemId },
    });
    if (!intercambioData) return null;
    return toEntity(intercambioData);
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

    return intercambiosData.map((data) => toEntity(data));
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
        conversacionId: intercambio.conversacionId ?? null,
        otroMarketItemId: intercambio.otroMarketItemId ?? null,
        modo: intercambio.modo ?? null,
      },
    });

    return toEntity(intercambioData);
  }

  async update(intercambio: Intercambio): Promise<Intercambio> {
    const intercambioData = await prisma.intercambio.update({
      where: { id: intercambio.id },
      data: {
        estado: intercambio.estado,
      },
    });

    return toEntity(intercambioData);
  }
}
