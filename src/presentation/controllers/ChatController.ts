import { Response } from 'express';
import { AuthRequest } from '../../infrastructure/middleware/auth.js';
import prisma from '../../infrastructure/database/prisma.js';

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

      const mensaje = await prisma.mensaje.create({
        data: { conversacionId, senderId: userId, contenido: contenido.trim() },
        include: { sender: { select: { id: true, nombre: true } } },
      });

      await prisma.conversacion.update({
        where: { id: conversacionId },
        data: { updatedAt: new Date() },
      });

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
