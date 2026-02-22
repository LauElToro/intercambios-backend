import { Response } from 'express';
import { AdminRequest } from '../../infrastructure/middleware/adminAuth.js';
import prisma from '../../infrastructure/database/prisma.js';
import { emailService } from '../../infrastructure/services/email.service.js';

export class AdminController {
  /** Métricas globales para el dashboard */
  static async getMetrics(req: AdminRequest, res: Response) {
    try {
      const [
        usuariosTotal,
        productosTotal,
        productosActivos,
        intercambiosTotal,
        intercambiosConfirmados,
        conversacionesTotal,
        mensajesTotal,
        sumaSaldos,
        agregadosIntercambios,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.marketItem.count(),
        prisma.marketItem.count({ where: { status: 'active' } }),
        prisma.intercambio.count(),
        prisma.intercambio.count({ where: { estado: 'confirmado' } }),
        prisma.conversacion.count(),
        prisma.mensaje.count(),
        prisma.user.aggregate({ _sum: { saldo: true } }),
        prisma.intercambio.aggregate({
          _sum: { creditos: true },
          where: { estado: 'confirmado' },
        }),
      ]);

      const saldoTotal = sumaSaldos._sum.saldo ?? 0;
      const volumenTransacciones = agregadosIntercambios._sum.creditos ?? 0;
      const tokenGastadoCompras = Math.abs(
        (await prisma.intercambio.aggregate({
          where: { estado: 'confirmado', creditos: { lt: 0 } },
          _sum: { creditos: true },
        }))._sum.creditos ?? 0
      );
      const tokenRecibidoVentas = (await prisma.intercambio.aggregate({
        where: { estado: 'confirmado', creditos: { gt: 0 } },
        _sum: { creditos: true },
      }))._sum.creditos ?? 0;

      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const [usuariosPorMes, transaccionesPorMes, productosPorEstado, mensajesPorMes, busquedasTotal, busquedasPorMes, terminosPopulares] = await Promise.all([
        prisma.$queryRaw<{ mes: string; total: number }[]>`
          SELECT to_char(date_trunc('month', "createdAt"), 'YYYY-MM') as mes, count(*)::int as total
          FROM "User" WHERE "createdAt" >= ${sixMonthsAgo}
          GROUP BY date_trunc('month', "createdAt") ORDER BY 1`,
        prisma.$queryRaw<{ mes: string; cantidad: number; volumen: number }[]>`
          SELECT to_char(date_trunc('month', "fecha"), 'YYYY-MM') as mes, count(*)::int as cantidad, coalesce(sum(abs("creditos")), 0)::int as volumen
          FROM "Intercambio" WHERE "estado" = 'confirmado' AND "fecha" >= ${sixMonthsAgo}
          GROUP BY date_trunc('month', "fecha") ORDER BY 1`,
        prisma.marketItem.groupBy({
          by: ['status'],
          _count: { id: true },
        }),
        prisma.$queryRaw<{ mes: string; total: number }[]>`
          SELECT to_char(date_trunc('month', "createdAt"), 'YYYY-MM') as mes, count(*)::int as total
          FROM "Mensaje" WHERE "createdAt" >= ${sixMonthsAgo}
          GROUP BY date_trunc('month', "createdAt") ORDER BY 1`,
        prisma.busqueda.count(),
        prisma.$queryRaw<{ mes: string; total: number }[]>`
          SELECT to_char(date_trunc('month', "createdAt"), 'YYYY-MM') as mes, count(*)::int as total
          FROM "Busqueda" WHERE "createdAt" >= ${sixMonthsAgo}
          GROUP BY date_trunc('month', "createdAt") ORDER BY 1`,
        prisma.$queryRaw<{ termino: string; total: number }[]>`
          SELECT "termino" as termino, count(*)::int as total
          FROM "Busqueda" WHERE "termino" != '' AND "createdAt" >= ${sixMonthsAgo}
          GROUP BY "termino" ORDER BY total DESC LIMIT 20`,
      ]);

      const productosPorEstadoChart = productosPorEstado
        .map((p) => ({ estado: p.status, cantidad: p._count.id }))
        .sort((a, b) => b.cantidad - a.cantidad);

      res.json({
        usuarios: {
          total: usuariosTotal,
          porMes: usuariosPorMes,
        },
        productos: {
          total: productosTotal,
          activos: productosActivos,
          porEstado: productosPorEstadoChart,
        },
        ventasCompras: {
          transaccionesTotal: intercambiosConfirmados,
          comprasTotal: intercambiosConfirmados,
          ventasTotal: intercambiosConfirmados,
          porMes: transaccionesPorMes,
        },
        token: {
          saldoEnCirculacion: saldoTotal,
          volumenTransacciones: Math.abs(volumenTransacciones),
          tokenGastadoCompras,
          tokenRecibidoVentas,
        },
        contacto: {
          conversacionesTotal,
          mensajesTotal,
          paresUnicosContactados: conversacionesTotal,
          mensajesPorMes,
        },
        busquedas: {
          total: busquedasTotal,
          porMes: busquedasPorMes,
          terminosPopulares: terminosPopulares || [],
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /** Listado de usuarios con paginación */
  static async getUsers(req: AdminRequest, res: Response) {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
      const skip = (page - 1) * limit;

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            nombre: true,
            email: true,
            contacto: true,
            saldo: true,
            limite: true,
            ubicacion: true,
            miembroDesde: true,
            verificado: true,
            bannedAt: true,
            _count: { select: { marketItems: true, intercambios: true } },
          },
        }),
        prisma.user.count(),
      ]);

      res.json({
        data: users.map(({ _count, ...u }) => ({
          ...u,
          productosPublicados: _count.marketItems,
          intercambios: _count.intercambios,
        })),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /** Listado de productos con paginación */
  static async getProductos(req: AdminRequest, res: Response) {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
      const skip = (page - 1) * limit;

      const [items, total] = await Promise.all([
        prisma.marketItem.findMany({
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            vendedor: { select: { id: true, nombre: true, email: true } },
          },
        }),
        prisma.marketItem.count(),
      ]);

      res.json({
        data: items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /** Listado de intercambios/transacciones */
  static async getIntercambios(req: AdminRequest, res: Response) {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
      const skip = (page - 1) * limit;

      const [intercambios, total] = await Promise.all([
        prisma.intercambio.findMany({
          skip,
          take: limit,
          orderBy: { fecha: 'desc' },
          include: {
            usuario: { select: { id: true, nombre: true, email: true } },
            otraPersona: { select: { id: true, nombre: true, email: true } },
            marketItem: { select: { id: true, titulo: true, precio: true } },
          },
        }),
        prisma.intercambio.count(),
      ]);

      res.json({
        data: intercambios,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /** Enviar newsletter a todos los usuarios (o a una lista de emails) */
  static async sendNewsletter(req: AdminRequest, res: Response) {
    try {
      const { subject, bodyHtml, bodyText, enviarATodos } = req.body;

      if (!subject || (!bodyHtml && !bodyText)) {
        return res.status(400).json({
          error: 'Faltan campos: subject y (bodyHtml o bodyText) son requeridos',
        });
      }

      let emails: { email: string; nombre: string }[];
      if (enviarATodos) {
        const users = await prisma.user.findMany({
          where: { bannedAt: null },
          select: { email: true, nombre: true },
        });
        emails = users.map((u) => ({ email: u.email, nombre: u.nombre }));
      } else if (Array.isArray(req.body.emails) && req.body.emails.length > 0) {
        const users = await prisma.user.findMany({
          where: { email: { in: req.body.emails } },
          select: { email: true, nombre: true },
        });
        emails = users.map((u) => ({ email: u.email, nombre: u.nombre }));
      } else {
        return res.status(400).json({
          error: 'Indicá enviarATodos: true o un array de emails',
        });
      }

      const html = bodyHtml || (bodyText ? bodyText.replace(/\n/g, '<br>') : '');
      let enviados = 0;
      const errores: string[] = [];

      for (const { email, nombre } of emails) {
        try {
          await emailService.sendNewsletter(email, nombre, subject, html, bodyText || bodyHtml);
          enviados++;
        } catch (err: any) {
          errores.push(`${email}: ${err.message}`);
        }
      }

      res.json({
        message: `Enviados ${enviados} de ${emails.length}`,
        enviados,
        total: emails.length,
        errores: errores.length ? errores.slice(0, 20) : undefined,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /** Banear usuario */
  static async banUser(req: AdminRequest, res: Response) {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) return res.status(400).json({ error: 'ID inválido' });
      await prisma.user.update({
        where: { id: userId },
        data: { bannedAt: new Date() },
      });
      res.json({ message: 'Usuario baneado' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /** Desbanear usuario */
  static async unbanUser(req: AdminRequest, res: Response) {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) return res.status(400).json({ error: 'ID inválido' });
      await prisma.user.update({
        where: { id: userId },
        data: { bannedAt: null },
      });
      res.json({ message: 'Usuario desbaneado' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /** Eliminar usuario (cascade elimina sus productos, favoritos, etc.) */
  static async deleteUser(req: AdminRequest, res: Response) {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) return res.status(400).json({ error: 'ID inválido' });
      await prisma.user.delete({ where: { id: userId } });
      res.json({ message: 'Usuario eliminado' });
    } catch (error: any) {
      if ((error as any).code === 'P2025') {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }
      res.status(500).json({ error: error.message });
    }
  }
}
