import type { Prisma } from '@prisma/client';
import type { AcuerdoAceptado } from './chatPropuesta.js';

type Tx = Prisma.TransactionClient;

export async function emitirCodigoParaAcuerdo(
  tx: Tx,
  params: {
    conversacionId: number;
    acuerdo: AcuerdoAceptado;
    codigo: string;
    expiresAt: Date;
  }
): Promise<void> {
  const { conversacionId, acuerdo, codigo, expiresAt } = params;
  if (!acuerdo.aceptacionMensajeId) {
    throw new Error('No se pudo identificar el acuerdo en el chat');
  }

  await tx.codigoIntercambioAcuerdo.upsert({
    where: {
      conversacionId_aceptacionMensajeId: {
        conversacionId,
        aceptacionMensajeId: acuerdo.aceptacionMensajeId,
      },
    },
    create: {
      conversacionId,
      aceptacionMensajeId: acuerdo.aceptacionMensajeId,
      aceptadoAt: acuerdo.aceptadoAt,
      codigo,
      expiresAt,
    },
    update: {
      codigo,
      expiresAt,
      usadoAt: null,
      aceptadoAt: acuerdo.aceptadoAt,
    },
  });

  // Puntero rápido en la conversación (siempre el del acuerdo activo)
  await tx.conversacion.update({
    where: { id: conversacionId },
    data: {
      intercambioCodigo: codigo,
      intercambioCodigoExpiresAt: expiresAt,
      updatedAt: new Date(),
    },
  });
}

export async function buscarCodigoActivoParaAcuerdo(
  tx: Tx,
  conversacionId: number,
  acuerdo: AcuerdoAceptado
) {
  if (!acuerdo.aceptacionMensajeId) return null;
  return tx.codigoIntercambioAcuerdo.findUnique({
    where: {
      conversacionId_aceptacionMensajeId: {
        conversacionId,
        aceptacionMensajeId: acuerdo.aceptacionMensajeId,
      },
    },
  });
}

export async function validarCodigoParaAcuerdo(
  tx: Tx,
  conversacionId: number,
  acuerdo: AcuerdoAceptado,
  codigo: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const row = await buscarCodigoActivoParaAcuerdo(tx, conversacionId, acuerdo);
  if (!row) {
    return {
      ok: false,
      error:
        'No hay código para este acuerdo. Pedí que reenvíen el código desde el chat (cada acuerdo tiene el suyo).',
    };
  }
  if (row.usadoAt) {
    return {
      ok: false,
      error: 'Este código ya fue usado para confirmar ese acuerdo. Si comprás otra unidad, hacé una nueva propuesta.',
    };
  }
  if (row.expiresAt && row.expiresAt < new Date()) {
    return { ok: false, error: 'El código expiró. Pedí un nuevo código desde el chat.' };
  }
  if (row.codigo !== codigo) {
    return {
      ok: false,
      error:
        'El código no corresponde a este acuerdo. Usá el del último email o pedí que reenvíen el código desde el chat.',
    };
  }
  return { ok: true };
}

export async function marcarCodigoAcuerdoUsado(
  tx: Tx,
  conversacionId: number,
  acuerdo: AcuerdoAceptado
): Promise<void> {
  if (!acuerdo.aceptacionMensajeId) return;
  await tx.codigoIntercambioAcuerdo.updateMany({
    where: {
      conversacionId,
      aceptacionMensajeId: acuerdo.aceptacionMensajeId,
      usadoAt: null,
    },
    data: { usadoAt: new Date() },
  });
}

export function codigoAcuerdoEstaVigente(row: {
  codigo: string;
  expiresAt: Date | null;
  usadoAt: Date | null;
} | null): boolean {
  if (!row || row.usadoAt) return false;
  if (row.expiresAt && row.expiresAt < new Date()) return false;
  return true;
}
