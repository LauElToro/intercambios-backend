import { IUserRepository } from '../../../domain/repositories/IUserRepository.js';
import { IMarketItemRepository } from '../../../domain/repositories/IMarketItemRepository.js';
import { IIntercambioRepository } from '../../../domain/repositories/IIntercambioRepository.js';
import { Intercambio } from '../../../domain/entities/Intercambio.js';
import prisma from '../../../infrastructure/database/prisma.js';
import { emailService } from '../../../infrastructure/services/email.service.js';
import { notificationService } from '../../../infrastructure/services/notification.service.js';
import { DEFAULT_CREDIT_LIMIT_IOX } from '../../../config/credit.js';
import { assertVendedorSaldoNoExcedeTope, computeDeudaEnLimiteDesde } from '../../../domain/services/economyRules.js';

export interface CheckoutResult {
  intercambio: Intercambio;
  conversacionId: number;
}

export class CheckoutUseCase {
  constructor(
    private userRepository: IUserRepository,
    private marketItemRepository: IMarketItemRepository,
    private intercambioRepository: IIntercambioRepository
  ) {}

  async execute(data: { compradorId: number; marketItemId: number }): Promise<CheckoutResult> {
    const item = await this.marketItemRepository.findById(data.marketItemId);
    if (!item) {
      throw new Error('Producto no encontrado');
    }

    const comprador = await this.userRepository.findById(data.compradorId);
    if (!comprador) {
      throw new Error('Usuario no encontrado');
    }

    if (!comprador.kycVerificado) {
      const err = new Error('KYC_REQUIRED') as Error & { code: string };
      err.code = 'KYC_REQUIRED';
      throw err;
    }

    const vendedor = await this.userRepository.findById(item.vendedorId);
    if (!vendedor) {
      throw new Error('Vendedor no encontrado');
    }

    if (comprador.id === vendedor.id) {
      throw new Error('No podés comprar tu propio producto');
    }

    if (item.rubro === 'servicios') {
      const compraExistente = await this.intercambioRepository.findByCompradorAndMarketItem(
        data.compradorId,
        data.marketItemId
      );
      if (compraExistente) {
        throw new Error('Ya contrataste este servicio. Podés coordinar la entrega por chat.');
      }
    }

    const limite = comprador.limite ?? DEFAULT_CREDIT_LIMIT_IOX;
    if (!comprador.puedeRealizarIntercambio(item.precio, limite)) {
      throw new Error(`Saldo insuficiente. Podés gastar hasta ${Math.abs(comprador.saldo) + limite} IOX (tu saldo + límite negativo)`);
    }

    const result = await prisma.$transaction(async (tx) => {
      const row = await tx.marketItem.findUnique({ where: { id: data.marketItemId } });
      if (!row || row.status !== 'active') {
        throw new Error('Producto no disponible');
      }
      if (row.rubro !== 'servicios') {
        const s = row.stock;
        if (s == null || s < 1) {
          throw new Error('Sin stock disponible');
        }
      }

      const compradorActual = await tx.user.findUnique({ where: { id: data.compradorId } });
      const vendedorActual = await tx.user.findUnique({ where: { id: item.vendedorId } });
      if (!compradorActual || !vendedorActual) {
        throw new Error('Usuario no encontrado');
      }

      const precio = row.precio;
      const nuevoSaldoComprador = compradorActual.saldo - precio;
      if (nuevoSaldoComprador < -limite) {
        throw new Error('Límite de crédito excedido');
      }

      assertVendedorSaldoNoExcedeTope(vendedorActual.saldo, precio);

      const deudaDesde = computeDeudaEnLimiteDesde(
        compradorActual.saldo,
        nuevoSaldoComprador,
        limite,
        compradorActual.deudaEnLimiteDesde ?? null
      );

      await tx.user.update({
        where: { id: data.compradorId },
        data: {
          saldo: nuevoSaldoComprador,
          deudaEnLimiteDesde: deudaDesde,
        },
      });

      await tx.user.update({
        where: { id: item.vendedorId },
        data: { saldo: vendedorActual.saldo + precio },
      });

      const intercambio = await tx.intercambio.create({
        data: {
          usuarioId: data.compradorId,
          otraPersonaId: item.vendedorId,
          otraPersonaNombre: vendedor.nombre,
          marketItemId: data.marketItemId,
          descripcion: `Compra: ${row.titulo}`,
          creditos: -precio,
          fecha: new Date(),
          estado: 'confirmado',
        },
      });

      let conversacion = await tx.conversacion.findFirst({
        where: { intercambioId: intercambio.id },
      });
      if (!conversacion) {
        try {
          conversacion = await tx.conversacion.create({
            data: {
              compradorId: data.compradorId,
              vendedorId: item.vendedorId,
              marketItemId: data.marketItemId,
              intercambioId: intercambio.id,
            },
          });
        } catch {
          conversacion = await tx.conversacion.findFirst({ where: { intercambioId: intercambio.id } });
        }
      }

      if (row.rubro !== 'servicios') {
        const current = row.stock ?? 1;
        const newStock = current - 1;
        await tx.marketItem.update({
          where: { id: data.marketItemId },
          data: {
            stock: newStock,
            availability: newStock <= 0 ? 'out_of_stock' : 'in_stock',
          },
        });
      }

      return {
        intercambio: Intercambio.create({
          id: intercambio.id,
          usuarioId: intercambio.usuarioId,
          otraPersonaId: intercambio.otraPersonaId,
          otraPersonaNombre: intercambio.otraPersonaNombre,
          descripcion: intercambio.descripcion,
          creditos: intercambio.creditos,
          fecha: intercambio.fecha,
          estado: 'confirmado',
          marketItemId: intercambio.marketItemId ?? undefined,
          createdAt: intercambio.createdAt,
          updatedAt: intercambio.updatedAt,
        }),
        conversacionId: conversacion!.id,
      };
    });

    notificationService.onCompra(data.compradorId, item.titulo, item.precio).catch(() => {});
    notificationService.onVenta(item.vendedorId, item.titulo, comprador.nombre, item.precio).catch(() => {});

    emailService.sendPurchase(comprador.email!, comprador.nombre, item.titulo, item.precio).catch((err) =>
      console.error('[CheckoutUseCase] Error email compra:', err)
    );
    emailService.sendSale(vendedor.email!, vendedor.nombre, item.titulo, item.precio, comprador.nombre).catch((err) =>
      console.error('[CheckoutUseCase] Error email venta:', err)
    );

    return result;
  }
}
