/**
 * Servicio para crear notificaciones cuando ocurren acciones en la cuenta.
 */

import prisma from '../database/prisma.js';

export type TipoNotificacion =
  | 'mensaje'
  | 'compra'
  | 'venta'
  | 'apareciste_busquedas'
  | 'producto_mas_buscado'
  | 'nuevo_favorito';

export interface CreateNotificationParams {
  userId: number;
  tipo: TipoNotificacion;
  titulo: string;
  mensaje?: string;
  metadata?: Record<string, unknown>;
}

export const notificationService = {
  async create(params: CreateNotificationParams): Promise<void> {
    try {
      await prisma.notificacion.create({
        data: {
          userId: params.userId,
          tipo: params.tipo,
          titulo: params.titulo,
          mensaje: params.mensaje ?? null,
          metadata: params.metadata ? (params.metadata as object) : null,
        },
      });
    } catch (err) {
      console.error('[notificationService] Error creando notificación:', err);
    }
  },

  /** Notificar al destinatario de un nuevo mensaje */
  async onNuevoMensaje(destinatarioId: number, nombreRemitente: string, conversacionId: number, preview?: string): Promise<void> {
    await this.create({
      userId: destinatarioId,
      tipo: 'mensaje',
      titulo: `Nuevo mensaje de ${nombreRemitente}`,
      mensaje: preview ? preview.slice(0, 100) : 'Tenés un nuevo mensaje',
      metadata: { conversacionId },
    });
  },

  /** Notificar al comprador: compra confirmada */
  async onCompra(compradorId: number, producto: string, creditos: number): Promise<void> {
    await this.create({
      userId: compradorId,
      tipo: 'compra',
      titulo: 'Compra confirmada',
      mensaje: `${producto} — coordiná la entrega por chat.`,
      metadata: {},
    });
  },

  /** Notificar al vendedor: nueva venta */
  async onVenta(vendedorId: number, producto: string, nombreComprador: string, creditos: number): Promise<void> {
    await this.create({
      userId: vendedorId,
      tipo: 'venta',
      titulo: 'Nueva venta',
      mensaje: `${nombreComprador} compró: ${producto}`,
      metadata: {},
    });
  },

  /** Notificar: apareciste en X búsquedas */
  async onAparecisteEnBusquedas(userId: number, cantidad: number, producto?: string): Promise<void> {
    const titulo = cantidad === 1 ? 'Apareciste en 1 búsqueda' : `Apareciste en ${cantidad} búsquedas`;
    const mensaje = producto ? `Tu producto "${producto}" coincidió con búsquedas recientes.` : 'Tus productos coincidieron con búsquedas recientes.';
    await this.create({
      userId,
      tipo: 'apareciste_busquedas',
      titulo,
      mensaje,
      metadata: { cantidad, producto },
    });
  },

  /** Notificar: tu producto más buscado */
  async onProductoMasBuscado(userId: number, tituloProducto: string, veces: number): Promise<void> {
    await this.create({
      userId,
      tipo: 'producto_mas_buscado',
      titulo: 'Tu producto más buscado',
      mensaje: `"${tituloProducto}" apareció en ${veces} búsquedas.`,
      metadata: { veces },
    });
  },
};
