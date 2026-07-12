import { randomInt } from 'node:crypto';
import { Response } from 'express';
import { AuthRequest } from '../../infrastructure/middleware/auth.js';
import prisma from '../../infrastructure/database/prisma.js';
import { emailService, isEmailDeliveryConfigured } from '../../infrastructure/services/email.service.js';
import { notificationService } from '../../infrastructure/services/notification.service.js';
import { RegistroIntercambioTruequeUseCase } from '../../application/use-cases/intercambio/RegistroIntercambioTruequeUseCase.js';
import {
  encontrarUltimaPropuestaPago,
  mensajeEsAceptacionPropuesta,
  mensajeEsRechazoPropuesta,
  parseAcuerdoAceptadoDesdeMensajes,
  acuerdoPendienteDeConfirmar,
  parseUltimoAcuerdoAceptado,
  parsePropuestaPagoJson,
  propuestaPagoToResumen,
  formatearPreviewMensaje,
  resolverPagadorId,
  tienePropuestaIntercambioEnHilo,
} from '../../domain/services/chatPropuesta.js';
import {
  minimoIoxRequerido,
  validarMinimoIoxEnPropuesta,
  validarSaldoPagador,
} from '../../domain/services/propuestaEconomy.js';
import { DEFAULT_CREDIT_LIMIT_IOX } from '../../config/economy.js';
import {
  buscarCodigoActivoParaAcuerdo,
  codigoAcuerdoEstaVigente,
  emitirCodigoParaAcuerdo,
} from '../../domain/services/codigoIntercambioAcuerdo.js';
import { assertKycVerificado } from '../../domain/services/kycPolicy.js';

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

const registroIntercambioTrueque = new RegistroIntercambioTruequeUseCase();

export class ChatController {
  /**
   * POST con código de 6 dígitos: valida, aplica acuerdo en IOX (o asiento 0 en pesos/USD) y cierra el flujo.
   */
  static async registroIntercambioConCodigo(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId;
      const conversacionId = parseInt(req.params.conversacionId, 10);
      if (!userId) return res.status(401).json({ error: 'No autorizado' });
      if (isNaN(conversacionId)) return res.status(400).json({ error: 'ID inválido' });

      const { codigo, descripcion, fecha } = req.body as {
        codigo?: string;
        descripcion?: string;
        fecha?: string;
      };
      if (!codigo || !String(descripcion).trim()) {
        return res.status(400).json({ error: 'Código y descripción son obligatorios' });
      }

      const result = await registroIntercambioTrueque.execute({
        userId,
        conversacionId,
        codigo: String(codigo),
        descripcion: String(descripcion).trim(),
        fecha: fecha ? new Date(fecha) : new Date(),
      });
      return res.status(201).json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Error al registrar' });
    }
  }

  static async getConversaciones(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId;
      if (!userId) return res.status(401).json({ error: 'No autorizado' });

      const conversaciones = await prisma.conversacion.findMany({
        where: { OR: [{ compradorId: userId }, { vendedorId: userId }] },
        include: {
          comprador: { select: { id: true, nombre: true, kycVerificado: true } },
          vendedor: { select: { id: true, nombre: true, kycVerificado: true } },
          marketItem: { select: { id: true, titulo: true, rubro: true, imagen: true } },
          mensajes: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { updatedAt: 'desc' },
      });

      const mapped = await Promise.all(
        conversaciones.map(async (c) => {
          const otro = c.compradorId === userId ? c.vendedor : c.comprador;
          const ultimoMensaje = c.mensajes[0];
          const mensajesNoLeidos = await prisma.mensaje.count({
            where: {
              conversacionId: c.id,
              senderId: { not: userId },
              leido: false,
            },
          });
          return {
            id: c.id,
            otroUsuario: { id: otro.id, nombre: otro.nombre, kycVerificado: otro.kycVerificado },
            marketItem: c.marketItem,
            ultimoMensaje: ultimoMensaje
              ? {
                  contenido: formatearPreviewMensaje(ultimoMensaje.contenido),
                  createdAt: ultimoMensaje.createdAt,
                }
              : null,
            mensajesNoLeidos,
            updatedAt: c.updatedAt,
          };
        })
      );

      res.json(mapped);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /** Iniciar o obtener conversación con un vendedor. Acepta intercambioId, marketItemId o vendedorId */
  static async iniciarConversacion(req: AuthRequest, res: Response) {
    try {
      const requesterId = req.userId;
      const intercambioId = req.body.intercambioId != null ? parseInt(req.body.intercambioId) : null;
      const marketItemId = req.body.marketItemId != null ? parseInt(req.body.marketItemId) : null;
      const vendedorIdParam = req.body.vendedorId != null ? parseInt(req.body.vendedorId) : null;
      if (!requesterId) return res.status(401).json({ error: 'No autorizado' });

      // Caso 1: conversación por intercambio (una por compra/operación)
      if (intercambioId && !isNaN(intercambioId)) {
        const intercambio = await prisma.intercambio.findUnique({
          where: { id: intercambioId },
          select: { id: true, usuarioId: true, otraPersonaId: true, marketItemId: true },
        });
        if (!intercambio) return res.status(404).json({ error: 'Intercambio no encontrado' });
        if (requesterId !== intercambio.usuarioId && requesterId !== intercambio.otraPersonaId) {
          return res.status(403).json({ error: 'No tenés acceso a este intercambio' });
        }

        const compradorId = intercambio.usuarioId;
        const vendedorId = intercambio.otraPersonaId;

        let conversacion = await prisma.conversacion.findFirst({
          where: { intercambioId: intercambio.id },
          select: { id: true },
        });
        if (!conversacion) {
          try {
            conversacion = await prisma.conversacion.create({
              data: {
                compradorId,
                vendedorId,
                marketItemId: intercambio.marketItemId ?? null,
                intercambioId: intercambio.id,
              },
              select: { id: true },
            });
          } catch {
            // carrera: si ya la creó otro request, volver a buscar
            conversacion = await prisma.conversacion.findFirst({
              where: { intercambioId: intercambio.id },
              select: { id: true },
            });
          }
        }

        return res.status(200).json({ conversacionId: conversacion!.id });
      }

      let vendedorId: number;
      let marketItemIdFinal: number | null = null;

      if (marketItemId && !isNaN(marketItemId)) {
        const item = await prisma.marketItem.findUnique({
          where: { id: marketItemId },
          select: { vendedorId: true },
        });
        if (!item) return res.status(404).json({ error: 'Producto no encontrado' });
        vendedorId = item.vendedorId;
        marketItemIdFinal = marketItemId;
      } else if (vendedorIdParam && !isNaN(vendedorIdParam)) {
        vendedorId = vendedorIdParam;
      } else {
        return res.status(400).json({ error: 'Falta marketItemId o vendedorId' });
      }

      const compradorId = requesterId;
      if (vendedorId === compradorId) return res.status(400).json({ error: 'No podés contactarte a vos mismo' });

      // Caso 2: conversación por marketItem (pre-compra) o por vendedor (genérica)
      const whereConv: any = marketItemIdFinal
        ? { compradorId, vendedorId, marketItemId: marketItemIdFinal, intercambioId: null }
        : { compradorId, vendedorId, marketItemId: null, intercambioId: null };

      let conversacion = await prisma.conversacion.findFirst({ where: whereConv, select: { id: true } });
      if (!conversacion) {
        try {
          conversacion = await prisma.conversacion.create({
            data: {
              compradorId,
              vendedorId,
              marketItemId: marketItemIdFinal,
            },
            select: { id: true },
          });
        } catch {
          conversacion = await prisma.conversacion.findFirst({ where: whereConv, select: { id: true } });
        }
      } else {
        await prisma.conversacion.update({ where: { id: conversacion.id }, data: { updatedAt: new Date() } }).catch(() => {});
      }

      res.status(200).json({ conversacionId: conversacion!.id });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getMensajes(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId;
      const conversacionId = parseInt(req.params.conversacionId);
      if (!userId) return res.status(401).json({ error: 'No autorizado' });
      if (isNaN(conversacionId)) return res.status(400).json({ error: 'ID inválido' });

      const conversacion = await prisma.conversacion.findUnique({
        where: { id: conversacionId },
        include: {
          comprador: { select: { id: true, nombre: true, kycVerificado: true } },
          vendedor: { select: { id: true, nombre: true, kycVerificado: true } },
          marketItem: { select: { id: true, titulo: true, rubro: true, imagen: true, precio: true } },
        },
      });

      if (!conversacion) return res.status(404).json({ error: 'Conversación no encontrada' });
      if (conversacion.compradorId !== userId && conversacion.vendedorId !== userId) {
        return res.status(403).json({ error: 'No tenés acceso a esta conversación' });
      }

      const mensajes = await prisma.mensaje.findMany({
        where: { conversacionId },
        include: { sender: { select: { id: true, nombre: true, kycVerificado: true } } },
        orderBy: { createdAt: 'asc' },
      });

      const otro = conversacion.compradorId === userId ? conversacion.vendedor : conversacion.comprador;

      const mensajesPropuesta = mensajes.map((m) => ({
        id: m.id,
        senderId: m.senderId,
        contenido: m.contenido,
        createdAt: m.createdAt,
      }));
      const ultimoAcuerdo = parseUltimoAcuerdoAceptado(mensajesPropuesta);
      const acuerdoPendiente = acuerdoPendienteDeConfirmar(
        ultimoAcuerdo,
        conversacion.registroIntercambioCompletadoAt
      );
      const codigoAcuerdo =
        ultimoAcuerdo && acuerdoPendiente
          ? await buscarCodigoActivoParaAcuerdo(prisma, conversacionId, ultimoAcuerdo)
          : null;
      const codigoVigente = codigoAcuerdoEstaVigente(codigoAcuerdo);
      const intercambioCodigoVigente = Boolean(
        conversacion.intercambioCodigo &&
          conversacion.intercambioCodigoExpiresAt &&
          conversacion.intercambioCodigoExpiresAt > new Date() &&
          !conversacion.registroIntercambioCompletadoAt
      );
      const codigoIntercambioEnviado = codigoVigente || intercambioCodigoVigente;

      let codeRecipientId = conversacion.compradorId;
      if (ultimoAcuerdo) {
        codeRecipientId = resolverPagadorId(
          conversacion.compradorId,
          conversacion.vendedorId,
          mensajesPropuesta,
          ultimoAcuerdo.pagadorId
        );
      }

      const puedeConfirmarRegistro =
        userId === codeRecipientId &&
        ((acuerdoPendiente && codigoVigente) || intercambioCodigoVigente);

      res.json({
        conversacion: {
          id: conversacion.id,
          compradorId: conversacion.compradorId,
          vendedorId: conversacion.vendedorId,
          soyComprador: conversacion.compradorId === userId,
          otroUsuario: { id: otro.id, nombre: otro.nombre, kycVerificado: otro.kycVerificado },
          marketItem: conversacion.marketItem,
          puedeConfirmarRegistro,
          registroCompletado: !!conversacion.registroIntercambioCompletadoAt && !acuerdoPendiente,
          acuerdoPendienteConfirmacion: acuerdoPendiente,
          necesitaReenvioCodigo: acuerdoPendiente && !codigoVigente,
          codigoIntercambioEnviado,
        },
        mensajes: mensajes.map((m) => ({
          id: m.id,
          senderId: m.senderId,
          senderNombre: m.sender.nombre,
          senderKycVerificado: m.sender.kycVerificado ?? false,
          contenido: m.contenido,
          leido: m.leido,
          createdAt: m.createdAt,
        })),
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Tras aceptar una propuesta, se envía el código por email al comprador (libera el pago).
   * No se muestra el código en el chat.
   */
  static async enviarCodigoIntercambio(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId;
      const conversacionId = parseInt(req.params.conversacionId, 10);
      if (!userId) return res.status(401).json({ error: 'No autorizado' });
      if (isNaN(conversacionId)) return res.status(400).json({ error: 'ID inválido' });

      if (!isEmailDeliveryConfigured()) {
        return res.status(503).json({
          error: 'El envío de códigos por email no está configurado en el servidor (SMTP / OAuth).',
        });
      }

      const me = await prisma.user.findUnique({
        where: { id: userId },
        select: { kycVerificado: true, nombre: true },
      });
      try {
        assertKycVerificado(me?.kycVerificado, 'Debés verificar tu identidad antes de enviar el código.');
      } catch (e: any) {
        return res.status(403).json({ error: e.message, code: 'KYC_REQUIRED' });
      }
      if (!me) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      const conversacion = await prisma.conversacion.findUnique({
        where: { id: conversacionId },
        include: { marketItem: { select: { titulo: true } } },
      });
      if (!conversacion) return res.status(404).json({ error: 'Conversación no encontrada' });
      if (conversacion.compradorId !== userId && conversacion.vendedorId !== userId) {
        return res.status(403).json({ error: 'No tenés acceso a esta conversación' });
      }

      const mensajes = await prisma.mensaje.findMany({
        where: { conversacionId },
        orderBy: { createdAt: 'asc' },
        select: { id: true, senderId: true, contenido: true, createdAt: true },
      });

      const mensajesPropuesta = mensajes.map((m) => ({
        id: m.id,
        senderId: m.senderId,
        contenido: m.contenido,
        createdAt: m.createdAt,
      }));

      const ultimoAcuerdo = parseUltimoAcuerdoAceptado(mensajesPropuesta);
      if (
        conversacion.registroIntercambioCompletadoAt &&
        !acuerdoPendienteDeConfirmar(ultimoAcuerdo, conversacion.registroIntercambioCompletadoAt)
      ) {
        return res.status(400).json({
          error:
            'El último acuerdo de este chat ya fue confirmado. Para comprar otra unidad, hacé una nueva propuesta en el chat.',
        });
      }

      const propuestaPago = encontrarUltimaPropuestaPago(mensajesPropuesta);
      const firstPropIntercambio = mensajes.find((m) => esPropuestaIntercambioContenido(m.contenido));

      if (!propuestaPago && !firstPropIntercambio) {
        return res.status(400).json({ error: 'No hay una propuesta de pago o intercambio en esta conversación' });
      }

      if (propuestaPago) {
        const aceptada = mensajes.some((m) => mensajeEsAceptacionPropuesta(m.contenido));
        if (!aceptada) {
          return res.status(400).json({
            error: 'Primero debe aceptarse la propuesta de pago en el chat antes de enviar el código',
          });
        }
        if (!ultimoAcuerdo) {
          return res.status(400).json({ error: 'No se encontró el acuerdo aceptado en el chat' });
        }

        const pagadorId = resolverPagadorId(
          conversacion.compradorId,
          conversacion.vendedorId,
          mensajesPropuesta,
          ultimoAcuerdo.pagadorId
        );
        const montoIox = ultimoAcuerdo.iox ?? 0;
        if (montoIox > 0) {
          const pagador = await prisma.user.findUnique({
            where: { id: pagadorId },
            select: { saldo: true, limite: true, kycVerificado: true },
          });
          if (!pagador?.kycVerificado) {
            return res.status(400).json({
              error: 'Quien paga en IOX debe tener la identidad verificada antes de enviar el código.',
            });
          }
          const errSaldo = validarSaldoPagador(
            pagador.saldo,
            pagador.limite ?? DEFAULT_CREDIT_LIMIT_IOX,
            montoIox
          );
          if (errSaldo) {
            return res.status(400).json({ error: errSaldo });
          }
        }
      }

      const codeRecipientId = ultimoAcuerdo
        ? resolverPagadorId(
            conversacion.compradorId,
            conversacion.vendedorId,
            mensajesPropuesta,
            ultimoAcuerdo.pagadorId
          )
        : conversacion.compradorId;

      const destinatario = await prisma.user.findUnique({
        where: { id: codeRecipientId },
        select: { id: true, email: true, nombre: true },
      });
      if (!destinatario?.email?.trim()) {
        return res.status(400).json({ error: 'Quien debe confirmar no tiene un email en la cuenta' });
      }

      const code = String(randomInt(100000, 1_000_000));
      const intercambioCodigoExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const acuerdoResumen = propuestaPago
        ? propuestaPagoToResumen(propuestaPago.propuesta)
        : ultimoAcuerdo
          ? propuestaPagoToResumen(ultimoAcuerdo)
          : undefined;
      const tituloProducto = conversacion.marketItem?.titulo?.trim() || undefined;

      try {
        await emailService.sendIntercambioVerificationCode({
          to: destinatario.email.trim(),
          nombreDestinatario: destinatario.nombre,
          nombreQuienAprueba: me.nombre,
          codigo: code,
          acuerdoResumen,
          tituloProducto,
          conversacionId,
        });
      } catch (e) {
        console.error('[ChatController] enviarCodigoIntercambio email', e);
        return res.status(502).json({ error: 'No se pudo enviar el email. Intentá de nuevo en unos minutos.' });
      }

      if (ultimoAcuerdo) {
        await prisma.$transaction(async (tx) => {
          await emitirCodigoParaAcuerdo(tx, {
            conversacionId,
            acuerdo: ultimoAcuerdo,
            codigo: code,
            expiresAt: intercambioCodigoExpiresAt,
          });
        });
      } else {
        await prisma.conversacion.update({
          where: { id: conversacionId },
          data: { intercambioCodigo: code, intercambioCodigoExpiresAt, updatedAt: new Date() },
        });
      }

      const infoMsg = `Código de verificación enviado por email a ${destinatario.nombre} (quien paga la diferencia). Revisá tu casilla si sos esa persona e ingresalo en «Registrar intercambio» solo cuando te encuentres y/o recibas el producto.`;
      await prisma.mensaje.create({
        data: { conversacionId, senderId: userId, contenido: infoMsg },
      });
      await prisma.conversacion.update({ where: { id: conversacionId }, data: { updatedAt: new Date() } });

      if (destinatario.id) {
        const preview = infoMsg.replace(/\s+/g, ' ').slice(0, 150);
        notificationService
          .onNuevoMensaje(destinatario.id, me.nombre, conversacionId, preview)
          .catch(() => {});
      }

      return res.status(201).json({
        ok: true,
        emailEnviadoA: destinatario.nombre,
        mensaje:
          'Se envió un código de 6 dígitos por email a quien paga la diferencia. Solo esa persona puede confirmar el intercambio.',
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async enviarMensaje(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId;
      const conversacionId = parseInt(req.params.conversacionId);
      const { contenido } = req.body;
      if (!userId) return res.status(401).json({ error: 'No autorizado' });
      if (isNaN(conversacionId) || !contenido?.trim()) {
        return res.status(400).json({ error: 'Faltan datos' });
      }

      const conversacion = await prisma.conversacion.findUnique({ where: { id: conversacionId } });
      if (!conversacion) return res.status(404).json({ error: 'Conversación no encontrada' });
      if (conversacion.compradorId !== userId && conversacion.vendedorId !== userId) {
        return res.status(403).json({ error: 'No tenés acceso a esta conversación' });
      }

      const contenidoTrim = contenido.trim();

      if (contenidoEsPropuestaIntercambioJson(contenidoTrim) || parsePropuestaPagoJson(contenidoTrim)) {
        const u = await prisma.user.findUnique({
          where: { id: userId },
          select: { kycVerificado: true, saldo: true, limite: true },
        });
        try {
          const msg = parsePropuestaPagoJson(contenidoTrim)
            ? 'Debés verificar tu identidad antes de enviar una propuesta de pago.'
            : 'Debés verificar tu identidad antes de proponer un intercambio.';
          assertKycVerificado(u?.kycVerificado, msg);
        } catch (e: any) {
          return res.status(403).json({ error: e.message, code: 'KYC_REQUIRED' });
        }

        const propuestaJson = parsePropuestaPagoJson(contenidoTrim);
        if (propuestaJson) {
          const mensajesPrevios = await prisma.mensaje.findMany({
            where: { conversacionId },
            orderBy: { createdAt: 'asc' },
            select: { id: true, senderId: true, contenido: true, createdAt: true },
          });

          let valorReferencia = 0;
          if (conversacion.marketItemId) {
            const item = await prisma.marketItem.findUnique({
              where: { id: conversacion.marketItemId },
              select: { precio: true },
            });
            valorReferencia = item?.precio ?? 0;
          }
          if (tienePropuestaIntercambioEnHilo(mensajesPrevios)) {
            const msgInter = mensajesPrevios.find((m) => /"_t":"intercambio"/.test(m.contenido));
            if (msgInter) {
              try {
                const parsed = JSON.parse(msgInter.contenido) as {
                  miProducto?: { precio?: number };
                  tuProducto?: { precio?: number };
                };
                const mi = Number(parsed.miProducto?.precio ?? 0) || 0;
                const tu = Number(parsed.tuProducto?.precio ?? 0) || 0;
                valorReferencia = Math.max(mi, tu, valorReferencia);
              } catch {
                /* ignore */
              }
            }
          }

          const errMin = validarMinimoIoxEnPropuesta(propuestaJson, valorReferencia);
          if (errMin) {
            return res.status(400).json({ error: errMin });
          }

          const pagadorId = resolverPagadorId(
            conversacion.compradorId,
            conversacion.vendedorId,
            mensajesPrevios,
            userId
          );
          const montoIox = propuestaJson.iox ?? 0;
          if (montoIox > 0) {
            const pagador = await prisma.user.findUnique({
              where: { id: pagadorId },
              select: { saldo: true, limite: true },
            });
            if (pagador) {
              const errSaldo = validarSaldoPagador(
                pagador.saldo,
                pagador.limite ?? DEFAULT_CREDIT_LIMIT_IOX,
                montoIox
              );
              if (errSaldo) {
                return res.status(400).json({ error: errSaldo });
              }
            }
          }
        }

        // Nueva propuesta invalida código anterior pendiente
        await prisma.conversacion.update({
          where: { id: conversacionId },
          data: { intercambioCodigo: null, intercambioCodigoExpiresAt: null },
        });
      }

      if (mensajeEsRechazoPropuesta(contenidoTrim)) {
        await prisma.conversacion.update({
          where: { id: conversacionId },
          data: { intercambioCodigo: null, intercambioCodigoExpiresAt: null },
        });
      }

      const mensaje = await prisma.mensaje.create({
        data: { conversacionId, senderId: userId, contenido: contenidoTrim },
        include: { sender: { select: { id: true, nombre: true, kycVerificado: true } } },
      });

      await prisma.conversacion.update({
        where: { id: conversacionId },
        data: { updatedAt: new Date() },
      });

      const convConUsuarios = await prisma.conversacion.findUnique({
        where: { id: conversacionId },
        include: {
          comprador: { select: { id: true, nombre: true, email: true } },
          vendedor: { select: { id: true, nombre: true, email: true } },
        },
      });
      if (convConUsuarios) {
        const destinatario = convConUsuarios.compradorId === userId ? convConUsuarios.vendedor : convConUsuarios.comprador;
        if (destinatario?.id) {
          const preview = formatearPreviewMensaje(contenidoTrim).replace(/\s+/g, ' ').slice(0, 150);
          notificationService.onNuevoMensaje(destinatario.id, mensaje.sender.nombre, conversacionId, preview).catch(() => {});
        }
        if (destinatario?.email) {
          const preview = formatearPreviewMensaje(contenidoTrim).replace(/\s+/g, ' ').slice(0, 150);
          emailService.sendNewMessage(destinatario.email, destinatario.nombre, mensaje.sender.nombre, preview, conversacionId).catch((err) =>
            console.error('[ChatController] Error enviando email nuevo mensaje:', err)
          );
        }
      }

      res.status(201).json({
        id: mensaje.id,
        senderId: mensaje.senderId,
        senderNombre: mensaje.sender.nombre,
        senderKycVerificado: mensaje.sender.kycVerificado ?? false,
        contenido: mensaje.contenido,
        leido: mensaje.leido,
        createdAt: mensaje.createdAt,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /** Marca como leídos los mensajes del otro usuario en la conversación. */
  static async marcarConversacionLeida(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId;
      const conversacionId = parseInt(req.params.conversacionId, 10);
      if (!userId) return res.status(401).json({ error: 'No autorizado' });
      if (isNaN(conversacionId)) return res.status(400).json({ error: 'ID inválido' });

      const conversacion = await prisma.conversacion.findUnique({ where: { id: conversacionId } });
      if (!conversacion) return res.status(404).json({ error: 'Conversación no encontrada' });
      if (conversacion.compradorId !== userId && conversacion.vendedorId !== userId) {
        return res.status(403).json({ error: 'No tenés acceso a esta conversación' });
      }

      const result = await prisma.mensaje.updateMany({
        where: { conversacionId, senderId: { not: userId }, leido: false },
        data: { leido: true },
      });

      res.json({ ok: true, marcados: result.count });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /** Conversaciones donde el usuario debe confirmar con el código recibido por email. */
  static async getRegistroPendiente(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId;
      if (!userId) return res.status(401).json({ error: 'No autorizado' });

      const conversaciones = await prisma.conversacion.findMany({
        where: {
          OR: [{ compradorId: userId }, { vendedorId: userId }],
        },
        include: {
          comprador: { select: { id: true, nombre: true } },
          vendedor: { select: { id: true, nombre: true } },
          marketItem: { select: { id: true, titulo: true } },
          mensajes: {
            orderBy: { createdAt: 'asc' },
            select: { id: true, senderId: true, contenido: true, createdAt: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
      });

      const pendientes = (
        await Promise.all(
          conversaciones.map(async (c) => {
            const mensajesPropuesta = c.mensajes.map((m) => ({
              id: m.id,
              senderId: m.senderId,
              contenido: m.contenido,
              createdAt: m.createdAt,
            }));
            const ultimoAcuerdo = parseUltimoAcuerdoAceptado(mensajesPropuesta);
            const otro = c.compradorId === userId ? c.vendedor : c.comprador;

            if (
              ultimoAcuerdo &&
              acuerdoPendienteDeConfirmar(ultimoAcuerdo, c.registroIntercambioCompletadoAt)
            ) {
              const pagadorId = resolverPagadorId(
                c.compradorId,
                c.vendedorId,
                mensajesPropuesta,
                ultimoAcuerdo.pagadorId
              );
              if (pagadorId !== userId) return null;

              const codigoRow = await buscarCodigoActivoParaAcuerdo(prisma, c.id, ultimoAcuerdo);
              if (!codigoAcuerdoEstaVigente(codigoRow)) return null;
              return {
                conversacionId: c.id,
                otroUsuario: { id: otro.id, nombre: otro.nombre },
                marketItem: c.marketItem,
                propuesta: { ...ultimoAcuerdo, pagadorId },
                acuerdoResumen: propuestaPagoToResumen(ultimoAcuerdo),
              };
            }

            const intercambioCodigoVigente = Boolean(
              c.intercambioCodigo &&
                c.intercambioCodigoExpiresAt &&
                c.intercambioCodigoExpiresAt > new Date() &&
                !c.registroIntercambioCompletadoAt
            );
            const tienePropuestaIntercambio = c.mensajes.some((m) =>
              esPropuestaIntercambioContenido(m.contenido)
            );
            if (intercambioCodigoVigente && tienePropuestaIntercambio && !ultimoAcuerdo && c.compradorId === userId) {
              return {
                conversacionId: c.id,
                otroUsuario: { id: otro.id, nombre: otro.nombre },
                marketItem: c.marketItem,
                propuesta: {},
                acuerdoResumen: 'Intercambio sin diferencia en IOX',
              };
            }

            return null;
          })
        )
      ).filter(Boolean);

      res.json(pendientes);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
