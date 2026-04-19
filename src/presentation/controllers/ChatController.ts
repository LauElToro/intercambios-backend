import { Response } from 'express';
import { AuthRequest } from '../../infrastructure/middleware/auth.js';
import prisma from '../../infrastructure/database/prisma.js';
import { emailService } from '../../infrastructure/services/email.service.js';
import { notificationService } from '../../infrastructure/services/notification.service.js';

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

export class ChatController {
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

      const mapped = conversaciones.map((c) => {
        const otro = c.compradorId === userId ? c.vendedor : c.comprador;
        const ultimoMensaje = c.mensajes[0];
        return {
          id: c.id,
          otroUsuario: { id: otro.id, nombre: otro.nombre, kycVerificado: otro.kycVerificado },
          marketItem: c.marketItem,
          ultimoMensaje: ultimoMensaje
            ? { contenido: ultimoMensaje.contenido, createdAt: ultimoMensaje.createdAt }
            : null,
          updatedAt: c.updatedAt,
        };
      });

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

      res.json({
        conversacion: {
          id: conversacion.id,
          otroUsuario: { id: otro.id, nombre: otro.nombre, kycVerificado: otro.kycVerificado },
          marketItem: conversacion.marketItem,
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

      if (contenidoEsPropuestaIntercambioJson(contenidoTrim)) {
        const u = await prisma.user.findUnique({ where: { id: userId }, select: { kycVerificado: true } });
        if (!u?.kycVerificado) {
          return res.status(403).json({
            error: 'Debés verificar tu identidad antes de proponer un intercambio.',
            code: 'KYC_REQUIRED',
          });
        }
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
          const preview = contenidoTrim.replace(/\s+/g, ' ').slice(0, 150);
          notificationService.onNuevoMensaje(destinatario.id, mensaje.sender.nombre, conversacionId, preview).catch(() => {});
        }
        if (destinatario?.email) {
          const preview = contenidoTrim.replace(/\s+/g, ' ').slice(0, 150);
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
}
