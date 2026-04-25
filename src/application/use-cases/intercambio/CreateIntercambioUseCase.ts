import { Intercambio } from '../../../domain/entities/Intercambio.js';
import { User } from '../../../domain/entities/User.js';
import { DEFAULT_CREDIT_LIMIT_IOX } from '../../../config/credit.js';
import { assertVendedorSaldoNoExcedeTope, computeDeudaEnLimiteDesde } from '../../../domain/services/economyRules.js';
import prisma from '../../../infrastructure/database/prisma.js';

/**
 * Registro manual de un intercambio (sin código de chat).
 * `creditos` visto desde `usuarioId`: negativo = pagó IOX, positivo = recibió IOX, 0 = solo anotación.
 * Actualiza saldo de **ambas** partes.
 */
export class CreateIntercambioUseCase {
  constructor() {}

  async execute(data: {
    usuarioId: number;
    otraPersonaId: number;
    otraPersonaNombre: string;
    descripcion: string;
    creditos: number;
    fecha?: Date;
  }): Promise<Intercambio> {
    if (data.usuarioId === data.otraPersonaId) {
      throw new Error('Debe ser otra persona distinta a vos');
    }

    return await prisma.$transaction(async (tx) => {
      const aRow = await tx.user.findUnique({ where: { id: data.usuarioId } });
      const bRow = await tx.user.findUnique({ where: { id: data.otraPersonaId } });
      if (!aRow || !bRow) {
        throw new Error('Usuario no encontrado');
      }

      const usuario = User.create({
        id: aRow.id,
        nombre: aRow.nombre,
        contacto: aRow.contacto,
        saldo: aRow.saldo,
        limite: aRow.limite ?? DEFAULT_CREDIT_LIMIT_IOX,
        email: aRow.email,
        kycVerificado: aRow.kycVerificado ?? false,
        ubicacion: aRow.ubicacion,
        verificado: aRow.verificado,
      });
      const otra = User.create({
        id: bRow.id,
        nombre: bRow.nombre,
        contacto: bRow.contacto,
        saldo: bRow.saldo,
        limite: bRow.limite ?? DEFAULT_CREDIT_LIMIT_IOX,
        email: bRow.email,
        kycVerificado: bRow.kycVerificado ?? false,
        ubicacion: bRow.ubicacion,
        verificado: bRow.verificado,
      });

      const limA = usuario.limite ?? DEFAULT_CREDIT_LIMIT_IOX;
      const limB = otra.limite ?? DEFAULT_CREDIT_LIMIT_IOX;
      const c = data.creditos;

      if (c < 0) {
        const pago = -c;
        if (!usuario.puedeRealizarIntercambio(pago, limA)) {
          throw new Error('Límite de crédito negativo excedido (tu saldo)');
        }
        assertVendedorSaldoNoExcedeTope(otra.saldo, pago);
      } else if (c > 0) {
        if (!otra.puedeRealizarIntercambio(c, limB)) {
          throw new Error('Límite de crédito negativo excedido (la otra parte no puede afrontar el pago en IOX)');
        }
        assertVendedorSaldoNoExcedeTope(usuario.saldo, c);
      }

      usuario.actualizarSaldo(c, limA);
      otra.actualizarSaldo(-c, limB);

      const deudaA = computeDeudaEnLimiteDesde(
        aRow.saldo,
        usuario.saldo,
        limA,
        aRow.deudaEnLimiteDesde
      );
      const deudaB = computeDeudaEnLimiteDesde(
        bRow.saldo,
        otra.saldo,
        limB,
        bRow.deudaEnLimiteDesde
      );

      await tx.user.update({
        where: { id: data.usuarioId },
        data: { saldo: usuario.saldo, deudaEnLimiteDesde: deudaA },
      });
      await tx.user.update({
        where: { id: data.otraPersonaId },
        data: { saldo: otra.saldo, deudaEnLimiteDesde: deudaB },
      });

      const intercambioData = await tx.intercambio.create({
        data: {
          usuarioId: data.usuarioId,
          otraPersonaId: data.otraPersonaId,
          otraPersonaNombre: data.otraPersonaNombre,
          descripcion: data.descripcion,
          creditos: c,
          fecha: data.fecha ?? new Date(),
          estado: 'confirmado',
        },
      });

      return Intercambio.create({
        id: intercambioData.id,
        usuarioId: intercambioData.usuarioId,
        otraPersonaId: intercambioData.otraPersonaId,
        otraPersonaNombre: intercambioData.otraPersonaNombre,
        descripcion: intercambioData.descripcion,
        creditos: intercambioData.creditos,
        fecha: intercambioData.fecha,
        estado: 'confirmado',
        conversacionId: intercambioData.conversacionId ?? null,
        marketItemId: (intercambioData as { marketItemId?: number | null }).marketItemId ?? undefined,
        createdAt: intercambioData.createdAt,
        updatedAt: intercambioData.updatedAt,
      });
    });
  }
}
