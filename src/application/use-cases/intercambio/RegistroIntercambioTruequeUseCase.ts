import prisma from '../../../infrastructure/database/prisma.js';
import { DEFAULT_CREDIT_LIMIT_IOX } from '../../../config/credit.js';
import { assertVendedorSaldoNoExcedeTope, computeDeudaEnLimiteDesde } from '../../../domain/services/economyRules.js';
import { notificationService } from '../../../infrastructure/services/notification.service.js';

type TipoAcuerdo = 'iox' | 'pesos' | 'usd';

function parseAcuerdoDesdeMensajes(
  mensajes: { senderId: number; contenido: string; createdAt: Date }[]
): { tipo: TipoAcuerdo; monto: number; pagadorId: number } | null {
  const sorted = [...mensajes].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  const rxAceptaIox = /Acepto la propuesta de (\d+) IOX/i;
  const rxProponeIox = /propongo pagar (\d+)\s*(?:IX|IOX)/i;
  const rxAceptaPesos = /Acepto la propuesta de (\d+) pesos/i;
  const rxProponePesos = /propongo pagar (\d+)\s*pesos/i;
  const rxAceptaUsd = /Acepto la propuesta de (\d+) USD/i;
  const rxProponeUsd = /propongo pagar (\d+)\s*USD/i;

  for (let i = sorted.length - 1; i >= 0; i--) {
    const m = sorted[i];
    let matchA = m.contenido.match(rxAceptaIox);
    if (matchA) {
      const n = parseInt(matchA[1], 10);
      for (let j = i - 1; j >= 0; j--) {
        const p = sorted[j];
        const pm = p.contenido.match(rxProponeIox);
        if (pm && parseInt(pm[1], 10) === n && p.senderId !== m.senderId) {
          return { tipo: 'iox', monto: n, pagadorId: p.senderId };
        }
      }
      continue;
    }
    matchA = m.contenido.match(rxAceptaPesos);
    if (matchA) {
      const n = parseInt(matchA[1], 10);
      for (let j = i - 1; j >= 0; j--) {
        const p = sorted[j];
        const pm = p.contenido.match(rxProponePesos);
        if (pm && parseInt(pm[1], 10) === n && p.senderId !== m.senderId) {
          return { tipo: 'pesos', monto: n, pagadorId: p.senderId };
        }
      }
      continue;
    }
    matchA = m.contenido.match(rxAceptaUsd);
    if (matchA) {
      const n = parseInt(matchA[1], 10);
      for (let j = i - 1; j >= 0; j--) {
        const p = sorted[j];
        const pm = p.contenido.match(rxProponeUsd);
        if (pm && parseInt(pm[1], 10) === n && p.senderId !== m.senderId) {
          return { tipo: 'usd', monto: n, pagadorId: p.senderId };
        }
      }
    }
  }
  return null;
}

function contenidoEsPropuestaIntercambioJson(raw: string): boolean {
  const t = raw.trim();
  if (!t.startsWith('{')) return false;
  try {
    const o = JSON.parse(t) as { _t?: string };
    return o && o._t === 'intercambio';
  } catch {
    return false;
  }
}

function esPropuestaIntercambioContenido(c: string): boolean {
  if (contenidoEsPropuestaIntercambioJson(c)) return true;
  return /quiero realizar un intercambio/i.test(c) && (/ver mi producto/i.test(c) || /imagen del producto/i.test(c));
}

/**
 * Completar registro con código: solo quien recibió el mail (autor de la 1.ª propuesta
 * con cards en el hilo) y coincide el código. Para IOX mueve saldos; para pesos/USD solo
 * deja asiento informativo (0 IOX en cuenta).
 */
export class RegistroIntercambioTruequeUseCase {
  async execute(params: {
    userId: number; // quien confirma (debe ser el destinatario del email: autor propuesta intercambio)
    conversacionId: number;
    codigo: string;
    descripcion: string;
    fecha: Date;
  }): Promise<{ intercambioId: number; tipo: TipoAcuerdo; monto: number; creditosAplicados: number }> {
    const { userId, conversacionId, codigo, descripcion, fecha } = params;
    const cod = String(codigo).trim().replace(/\D/g, '');
    if (cod.length !== 6) {
      throw new Error('El código debe tener 6 dígitos');
    }
    if (!descripcion?.trim()) {
      throw new Error('La descripción es obligatoria');
    }

    return await prisma.$transaction(async (tx) => {
      const conversacion = await tx.conversacion.findUnique({ where: { id: conversacionId } });
      if (!conversacion) {
        throw new Error('Conversación no encontrada');
      }
      if (conversacion.compradorId !== userId && conversacion.vendedorId !== userId) {
        throw new Error('No tenés acceso a esta conversación');
      }
      if (conversacion.registroIntercambioCompletadoAt) {
        throw new Error('Este intercambio ya fue registrado');
      }
      if (!conversacion.intercambioCodigo || conversacion.intercambioCodigo !== cod) {
        throw new Error('Código inválido o vencido');
      }
      if (conversacion.intercambioCodigoExpiresAt && conversacion.intercambioCodigoExpiresAt < new Date()) {
        throw new Error('El código expiró. Pedí un nuevo código desde el chat');
      }

      const mensajes = await tx.mensaje.findMany({
        where: { conversacionId },
        orderBy: { createdAt: 'asc' },
        select: { senderId: true, contenido: true, createdAt: true },
      });
      const firstProp = mensajes.find((m) => esPropuestaIntercambioContenido(m.contenido));
      if (!firstProp) {
        throw new Error('No hay propuesta de intercambio en este hilo');
      }
      const proposerId = firstProp.senderId; // quien hizo la propuesta "es" el que recibe el email
      if (proposerId !== userId) {
        throw new Error('Solo quien hizo la propuesta de intercambio (y recibió el código por email) puede confirmar con este flujo');
      }

      const acuerdo = parseAcuerdoDesdeMensajes(
        mensajes.map((m) => ({ ...m, createdAt: m.createdAt }))
      );
      if (!acuerdo) {
        throw new Error('No se encontró un acuerdo aceptado (propongo pagar + acepto) en el chat. Coordiná y aceptá la propuesta en el hilo primero');
      }

      const pagadorId = acuerdo.pagadorId;
      if (pagadorId !== conversacion.compradorId && pagadorId !== conversacion.vendedorId) {
        throw new Error('El acuerdo en el chat no coincide con los participantes de la conversación');
      }
      const recepId = pagadorId === conversacion.compradorId ? conversacion.vendedorId : conversacion.compradorId;

      const pagador = await tx.user.findUnique({ where: { id: pagadorId } });
      const recep = await tx.user.findUnique({ where: { id: recepId } });
      if (!pagador || !recep) {
        throw new Error('Usuario no encontrado');
      }

      let montoAplicado = 0;
      if (acuerdo.tipo === 'iox') {
        montoAplicado = acuerdo.monto;
        if (!pagador.kycVerificado || !recep.kycVerificado) {
          throw new Error('Intercambios en IOX: ambas partes deben tener la identidad verificada (KYC)');
        }

        const limiteP = pagador.limite ?? DEFAULT_CREDIT_LIMIT_IOX;
        const limiteR = recep.limite ?? DEFAULT_CREDIT_LIMIT_IOX;

        const nuevoSaldoPagador = pagador.saldo - montoAplicado;
        if (nuevoSaldoPagador < -limiteP) {
          throw new Error('Límite de crédito: quien paga en IOX no puede completar el movimiento');
        }

        assertVendedorSaldoNoExcedeTope(recep.saldo, montoAplicado);

        const deudaDesdeP = computeDeudaEnLimiteDesde(
          pagador.saldo,
          nuevoSaldoPagador,
          limiteP,
          pagador.deudaEnLimiteDesde ?? null
        );

        await tx.user.update({
          where: { id: pagadorId },
          data: {
            saldo: nuevoSaldoPagador,
            deudaEnLimiteDesde: deudaDesdeP,
          },
        });
        await tx.user.update({
          where: { id: recepId },
          data: { saldo: { increment: montoAplicado } },
        });
      } else {
        montoAplicado = 0; // no mueve saldo: acuerdo por fuera
      }

      const extra =
        acuerdo.tipo === 'pesos'
          ? ` — Acuerdo por fuera: ${acuerdo.monto} pesos`
          : acuerdo.tipo === 'usd'
            ? ` — Acuerdo por fuera: ${acuerdo.monto} USD`
            : '';

      const intercambio = await tx.intercambio.create({
        data: {
          usuarioId: pagadorId,
          otraPersonaId: recepId,
          otraPersonaNombre: recep.nombre,
          descripcion: descripcion.trim() + extra,
          creditos: montoAplicado > 0 ? -montoAplicado : 0,
          fecha,
          estado: 'confirmado',
          conversacionId: conversacion.id,
        },
      });

      await tx.conversacion.update({
        where: { id: conversacionId },
        data: {
          intercambioCodigo: null,
          intercambioCodigoExpiresAt: null,
          registroIntercambioCompletadoAt: new Date(),
          updatedAt: new Date(),
        },
      });

      const info = `Registro de intercambio confirmado (${acuerdo.tipo === 'iox' ? `${montoAplicado} IOX` : 'sin movimiento de IOX — pago acordado por fuera'}).`;
      await tx.mensaje.create({
        data: {
          conversacionId,
          senderId: userId,
          contenido: info,
        },
      });
      await tx.conversacion.update({ where: { id: conversacionId }, data: { updatedAt: new Date() } });

      if (montoAplicado > 0) {
        notificationService.onVenta(recepId, 'Intercambio (trueque)', pagador.nombre, montoAplicado).catch(() => {});
        notificationService.onCompra(pagadorId, 'Intercambio (trueque)', montoAplicado).catch(() => {});
      }

      return {
        intercambioId: intercambio.id,
        tipo: acuerdo.tipo,
        monto: acuerdo.monto,
        creditosAplicados: montoAplicado,
      };
    });
  }
}
