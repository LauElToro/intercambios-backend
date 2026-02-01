import { IUserRepository } from '../../../domain/repositories/IUserRepository.js';
import { IMarketItemRepository } from '../../../domain/repositories/IMarketItemRepository.js';
import { IIntercambioRepository } from '../../../domain/repositories/IIntercambioRepository.js';
import { Intercambio } from '../../../domain/entities/Intercambio.js';
import prisma from '../../../infrastructure/database/prisma.js';

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

    const vendedor = await this.userRepository.findById(item.vendedorId);
    if (!vendedor) {
      throw new Error('Vendedor no encontrado');
    }

    if (comprador.id === vendedor.id) {
      throw new Error('No podés comprar tu propio producto');
    }

    const limite = comprador.limite ?? 150000;
    if (!comprador.puedeRealizarIntercambio(item.precio, limite)) {
      throw new Error(`Saldo insuficiente. Podés gastar hasta ${Math.abs(comprador.saldo) + limite} IX (tu saldo + límite negativo)`);
    }

    return await prisma.$transaction(async (tx) => {
      const compradorActual = await tx.user.findUnique({ where: { id: data.compradorId } });
      const vendedorActual = await tx.user.findUnique({ where: { id: item.vendedorId } });
      if (!compradorActual || !vendedorActual) {
        throw new Error('Usuario no encontrado');
      }

      const nuevoSaldoComprador = compradorActual.saldo - item.precio;
      if (nuevoSaldoComprador < -limite) {
        throw new Error('Límite de crédito excedido');
      }

      await tx.user.update({
        where: { id: data.compradorId },
        data: { saldo: nuevoSaldoComprador },
      });

      await tx.user.update({
        where: { id: item.vendedorId },
        data: { saldo: vendedorActual.saldo + item.precio },
      });

      const intercambio = await tx.intercambio.create({
        data: {
          usuarioId: data.compradorId,
          otraPersonaId: item.vendedorId,
          otraPersonaNombre: vendedor.nombre,
          marketItemId: data.marketItemId,
          descripcion: `Compra: ${item.titulo}`,
          creditos: -item.precio,
          fecha: new Date(),
          estado: 'confirmado',
        },
      });

      const conversacion = await tx.conversacion.upsert({
        where: {
          compradorId_vendedorId: { compradorId: data.compradorId, vendedorId: item.vendedorId },
        },
        create: {
          compradorId: data.compradorId,
          vendedorId: item.vendedorId,
          marketItemId: data.marketItemId,
          intercambioId: intercambio.id,
        },
        update: { marketItemId: data.marketItemId, intercambioId: intercambio.id, updatedAt: new Date() },
      });

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
        conversacionId: conversacion.id,
      };
    });
  }
}
