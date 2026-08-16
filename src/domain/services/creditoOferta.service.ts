import prisma from '../../infrastructure/database/prisma.js';
import { DEFAULT_CREDIT_LIMIT_IOX } from '../../config/economy.js';

export type CreditoOfertaResult = {
  applied: boolean;
  credito?: number;
  saldo?: number;
  limite?: number;
};

/** Monto de crédito según precio de publicación (tope DEFAULT_CREDIT_LIMIT_IOX). */
export function calcCreditoOfertaMonto(precioPublicacion: number): number {
  const p = Math.floor(precioPublicacion);
  if (!Number.isFinite(p) || p < 1) return 0;
  return Math.min(p, DEFAULT_CREDIT_LIMIT_IOX);
}

/**
 * Habilita la línea de crédito IOX al publicar (o retroactivamente si ya publicó).
 * Solo toca el límite: el saldo no cambia. Baja cuando hay una compra real.
 */
export async function tryApplyCreditoOferta(
  userId: number,
  precioPublicacion?: number,
): Promise<CreditoOfertaResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      aceptaTerminosCredito: true,
      creditoOfertaAplicado: true,
    },
  });

  if (!user) return { applied: false };
  if (user.aceptaTerminosCredito !== true) return { applied: false };
  if (user.creditoOfertaAplicado) return { applied: false };

  let precio = precioPublicacion;
  if (precio == null) {
    const firstItem = await prisma.marketItem.findFirst({
      where: { vendedorId: userId },
      orderBy: { createdAt: 'asc' },
      select: { precio: true },
    });
    if (!firstItem) return { applied: false };
    precio = firstItem.precio;
  }

  const credito = calcCreditoOfertaMonto(precio);
  if (credito < 1) return { applied: false };

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      limite: credito,
      creditoOfertaAplicado: true,
      creditoOfertaAplicadoAt: new Date(),
    },
    select: { saldo: true, limite: true },
  });

  return {
    applied: true,
    credito,
    saldo: updated.saldo,
    limite: updated.limite,
  };
}
