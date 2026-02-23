import { Response } from 'express';
import { AuthRequest } from '../../infrastructure/middleware/auth.js';
import prisma from '../../infrastructure/database/prisma.js';
import { emailService } from '../../infrastructure/services/email.service.js';
import { notificationService } from '../../infrastructure/services/notification.service.js';

export class ChatController {
  static async getConversaciones(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId;
      if (!userId) return res.status(401).json({ error: 'No autorizado' });

      const conversaciones = await prisma.conversacion.findMany({
        where: { OR: [{ compradorId: userId }, { vendedorId: userId }] },
        include: {
          comprador: { select: { id: true, nombre: true } },
          vendedor: { select: { id: true, nombre: true } },
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
          otroUsuario: { id: otro.id, nombre: otro.nombre },
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

  /** Iniciar o obtener conversación con un vendedor. Acepta marketItemId o vendedorId */
  static async iniciarConversacion(req: AuthRequest, res: Response) {
    try {
      const compradorId = req.userId;
      const marketItemId = req.body.marketItemId != null ? parseInt(req.body.marketItemId) : null;
      const vendedorIdParam = req.body.vendedorId != null ? parseInt(req.body.vendedorId) : null;
      if (!compradorId) return res.status(401).json({ error: 'No autorizado' });

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

      if (vendedorId === compradorId) return res.status(400).json({ error: 'No podés contactarte a vos mismo' });

      const conversacion = await prisma.conversacion.upsert({
        where: {
          compradorId_vendedorId: { compradorId, vendedorId },
        },
        create: {
          compradorId,
          vendedorId,
          marketItemId: marketItemIdFinal,
        },
        update: {
          ...(marketItemIdFinal && { marketItemId: marketItemIdFinal }),
          updatedAt: new Date(),
        },
      });

      res.status(200).json({ conversacionId: conversacion.id });
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
          comprador: { select: { id: true, nombre: true } },
          vendedor: { select: { id: true, nombre: true } },
          marketItem: { select: { id: true, titulo: true, rubro: true, imagen: true, precio: true } },
        },
      });

      if (!conversacion) return res.status(404).json({ error: 'Conversación no encontrada' });
      if (conversacion.compradorId !== userId && conversacion.vendedorId !== userId) {
        return res.status(403).json({ error: 'No tenés acceso a esta conversación' });
      }

      const mensajes = await prisma.mensaje.findMany({
        where: { conversacionId },
        include: { sender: { select: { id: true, nombre: true } } },
        orderBy: { createdAt: 'asc' },
      });

      const otro = conversacion.compradorId === userId ? conversacion.vendedor : conversacion.comprador;

      res.json({
        conversacion: {
          id: conversacion.id,
          otroUsuario: { id: otro.id, nombre: otro.nombre },
          marketItem: conversacion.marketItem,
        },
        mensajes: mensajes.map((m) => ({
          id: m.id,
          senderId: m.senderId,
          senderNombre: m.sender.nombre,
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
      const mensaje = await prisma.mensaje.create({
        data: { conversacionId, senderId: userId, contenido: contenidoTrim },
        include: { sender: { select: { id: true, nombre: true } } },
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
        contenido: mensaje.contenido,
        leido: mensaje.leido,
        createdAt: mensaje.createdAt,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
