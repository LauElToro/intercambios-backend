import { Response } from 'express';
import prisma from '../../infrastructure/database/prisma.js';
import { AuthRequest } from '../../infrastructure/middleware/auth.js';

function normalizarSlug(raw: string) {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function slugValido(slug: string) {
  if (slug.length < 3 || slug.length > 32) return false;
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug);
}

async function buildMeResponse(userId: number) {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      referralCode: true,
      referralSlug: true,
      referredUsers: {
        select: { id: true, nombre: true, email: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      },
      _count: { select: { referredUsers: true } },
    },
  });
  if (!u) return null;
  return {
    codigo: u.referralCode,
    slugPersonalizado: u.referralSlug,
    totalReferidos: u._count.referredUsers,
    referidos: u.referredUsers.map((r) => ({
      id: r.id,
      nombre: r.nombre,
      email: r.email,
      fechaRegistro: r.createdAt.toISOString(),
    })),
  };
}

export class ReferidosController {
  static async getMe(req: AuthRequest, res: Response) {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'No autorizado' });
    const data = await buildMeResponse(userId);
    if (!data) return res.status(404).json({ error: 'Usuario no encontrado' });
    return res.json(data);
  }

  static async updateSlug(req: AuthRequest, res: Response) {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'No autorizado' });

    const slugRaw = req.body?.slug;
    const slug = normalizarSlug(slugRaw);
    if (!slugValido(slug)) {
      return res.status(400).json({ error: 'Slug inválido' });
    }

    const existente = await prisma.user.findFirst({
      where: { referralSlug: slug, id: { not: userId } },
      select: { id: true },
    });
    if (existente) {
      return res.status(409).json({ error: 'Ese enlace ya está en uso' });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { referralSlug: slug },
    });

    const data = await buildMeResponse(userId);
    return res.json(data);
  }
}

