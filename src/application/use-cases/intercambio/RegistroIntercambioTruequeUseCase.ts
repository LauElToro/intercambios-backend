import prisma from '../../../infrastructure/database/prisma.js';
import { DEFAULT_CREDIT_LIMIT_IOX } from '../../../config/credit.js';
import { assertVendedorSaldoNoExcedeTope, computeDeudaEnLimiteDesde } from '../../../domain/services/economyRules.js';
import { acuerdoPendienteDeConfirmar, parseUltimoAcuerdoAceptado, resolverPagadorId } from '../../../domain/services/chatPropuesta.js';
import {
  marcarCodigoAcuerdoUsado,
  validarCodigoParaAcuerdo,
} from '../../../domain/services/codigoIntercambioAcuerdo.js';
import { notificationService } from '../../../infrastructure/services/notification.service.js';

type TipoAcuerdo = 'iox' | 'pesos' | 'usd';

/**
 * Completar registro con código: el comprador recibe el email y confirma aquí para liberar el pago.
 * Para IOX mueve saldos; pesos/USD quedan asentados sin movimiento de IOX.
 */
export class RegistroIntercambioTruequeUseCase {
  async execute(params: {
    userId: number;
    conversacionId: number;
    codigo: string;
    descripcion: string;
    fecha: Date;
  }): Promise<{
    intercambioId: number;
    tipo: TipoAcuerdo;
    monto: number;
    creditosAplicados: number;
    saldoPagador: number;
    saldoReceptor: number;
  }> {
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

      const mensajes = await tx.mensaje.findMany({
        where: { conversacionId },
        orderBy: { createdAt: 'asc' },
        select: { id: true, senderId: true, contenido: true, createdAt: true },
      });

      const ultimoAcuerdo = parseUltimoAcuerdoAceptado(
        mensajes.map((m) => ({ id: m.id, senderId: m.senderId, contenido: m.contenido, createdAt: m.createdAt }))
      );

      const tienePropuestaIntercambio = mensajes.some((m) =>
        /"_t":"intercambio"/.test(m.contenido) ||
        (/quiero realizar un intercambio/i.test(m.contenido) &&
          (/ver mi producto/i.test(m.contenido) || /imagen del producto/i.test(m.contenido)))
      );

      if (!ultimoAcuerdo) {
        if (
          !conversacion.intercambioCodigo ||
          conversacion.intercambioCodigo !== cod ||
          (conversacion.intercambioCodigoExpiresAt && conversacion.intercambioCodigoExpiresAt < new Date())
        ) {
          throw new Error('Código inválido o expirado');
        }
        if (conversacion.registroIntercambioCompletadoAt) {
          throw new Error('Este intercambio ya fue confirmado');
        }
        if (!tienePropuestaIntercambio) {
          throw new Error('No hay una propuesta de intercambio en esta conversación');
        }
        if (conversacion.compradorId !== userId) {
          throw new Error('Solo quien recibió el código por email puede confirmar este intercambio');
        }

        const recepId = conversacion.vendedorId;
        const recep = await tx.user.findUnique({ where: { id: recepId } });
        const pagador = await tx.user.findUnique({ where: { id: userId } });
        if (!pagador || !recep) throw new Error('Usuario no encontrado');

        const intercambio = await tx.intercambio.create({
          data: {
            usuarioId: userId,
            otraPersonaId: recepId,
            otraPersonaNombre: recep.nombre,
            descripcion: descripcion.trim(),
            creditos: 0,
            fecha,
            estado: 'confirmado',
            conversacionId: conversacion.id,
            marketItemId: conversacion.marketItemId ?? undefined,
          },
        });

        if (conversacion.marketItemId) {
          const marketItem = await tx.marketItem.findUnique({ where: { id: conversacion.marketItemId } });
          if (marketItem && marketItem.rubro !== 'servicios') {
            const current = marketItem.stock ?? 0;
            if (current > 0) {
              const newStock = current - 1;
              await tx.marketItem.update({
                where: { id: marketItem.id },
                data: {
                  stock: newStock,
                  availability: newStock <= 0 ? 'out_of_stock' : 'in_stock',
                },
              });
            }
          }
        }

        await tx.conversacion.update({
          where: { id: conversacionId },
          data: {
            intercambioCodigo: null,
            intercambioCodigoExpiresAt: null,
            registroIntercambioCompletadoAt: new Date(),
            updatedAt: new Date(),
          },
        });

        await tx.mensaje.create({
          data: {
            conversacionId,
            senderId: userId,
            contenido: 'Registro de intercambio confirmado (permuta sin diferencia en IOX).',
          },
        });

        return {
          intercambioId: intercambio.id,
          tipo: 'iox' as TipoAcuerdo,
          monto: 0,
          creditosAplicados: 0,
          saldoPagador: pagador.saldo,
          saldoReceptor: recep.saldo,
        };
      }

      if (!acuerdoPendienteDeConfirmar(ultimoAcuerdo, conversacion.registroIntercambioCompletadoAt)) {
        throw new Error(
          'Este acuerdo ya fue confirmado. Revisá tu historial. Para otra unidad, hacé una nueva propuesta en el chat.'
        );
      }

      const validacion = await validarCodigoParaAcuerdo(tx, conversacionId, ultimoAcuerdo, cod);
      if (!validacion.ok) {
        throw new Error(validacion.error);
      }

      const acuerdo = ultimoAcuerdo;

      const codeRecipientId = conversacion.compradorId;
      if (codeRecipientId !== userId) {
        throw new Error('Solo el comprador (quien recibió el código por email) puede confirmar con este flujo');
      }

      const mensajesPropuesta = mensajes.map((m) => ({
        id: m.id,
        senderId: m.senderId,
        contenido: m.contenido,
        createdAt: m.createdAt,
      }));

      const pagadorId = resolverPagadorId(
        conversacion.compradorId,
        conversacion.vendedorId,
        mensajesPropuesta,
        acuerdo.pagadorId
      );
      const recepId = pagadorId === conversacion.compradorId ? conversacion.vendedorId : conversacion.compradorId;

      const pagador = await tx.user.findUnique({ where: { id: pagadorId } });
      const recep = await tx.user.findUnique({ where: { id: recepId } });
      if (!pagador || !recep) {
        throw new Error('Usuario no encontrado');
      }

      const montoIox = acuerdo.iox ?? 0;
      let montoAplicado = 0;
      if (montoIox > 0) {
        montoAplicado = montoIox;
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
      }

      const extras: string[] = [];
      if (acuerdo.pesos) extras.push(`${acuerdo.pesos} pesos`);
      if (acuerdo.usd) extras.push(`${acuerdo.usd} USD`);
      const extra = extras.length > 0 ? ` — Acuerdo por fuera: ${extras.join(' + ')}` : '';

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
          marketItemId: conversacion.marketItemId ?? undefined,
        },
      });

      if (conversacion.marketItemId) {
        const marketItem = await tx.marketItem.findUnique({ where: { id: conversacion.marketItemId } });
        if (marketItem && marketItem.rubro !== 'servicios') {
          const current = marketItem.stock ?? 0;
          if (current > 0) {
            const newStock = current - 1;
            await tx.marketItem.update({
              where: { id: marketItem.id },
              data: {
                stock: newStock,
                availability: newStock <= 0 ? 'out_of_stock' : 'in_stock',
              },
            });
          }
        }
      }

      await marcarCodigoAcuerdoUsado(tx, conversacionId, ultimoAcuerdo);

      await tx.conversacion.update({
        where: { id: conversacionId },
        data: {
          intercambioCodigo: null,
          intercambioCodigoExpiresAt: null,
          registroIntercambioCompletadoAt: new Date(),
          updatedAt: new Date(),
        },
      });

      const info =
        montoAplicado > 0
          ? `Registro de intercambio confirmado (${montoAplicado} IOX${extras.length ? ` + ${extras.join(' + ')} por fuera` : ''}).`
          : `Registro de intercambio confirmado (sin movimiento de IOX — pago acordado por fuera${extras.length ? `: ${extras.join(' + ')}` : ''}).`;
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

      const tipoResp =
        montoAplicado > 0 ? 'iox' : acuerdo.pesos ? 'pesos' : acuerdo.usd ? 'usd' : 'iox';
      const montoResp = montoAplicado > 0 ? montoAplicado : acuerdo.pesos ?? acuerdo.usd ?? 0;

      const pagadorFinal = await tx.user.findUnique({ where: { id: pagadorId }, select: { saldo: true } });
      const recepFinal = await tx.user.findUnique({ where: { id: recepId }, select: { saldo: true } });

      return {
        intercambioId: intercambio.id,
        tipo: tipoResp,
        monto: montoResp,
        creditosAplicados: montoAplicado,
        saldoPagador: pagadorFinal?.saldo ?? pagador.saldo,
        saldoReceptor: recepFinal?.saldo ?? recep.saldo,
      };
    });
  }
}
