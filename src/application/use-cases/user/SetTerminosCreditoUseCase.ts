import prisma from '../../../infrastructure/database/prisma.js';
import { tryApplyCreditoOferta } from '../../../domain/services/creditoOferta.service.js';

export type SetTerminosCreditoResult = {
  aceptaTerminosCredito: boolean;
  terminosCreditoRespondidosAt: Date;
  creditoAplicado: boolean;
  saldo?: number;
  limite?: number;
  credito?: number;
};

export class SetTerminosCreditoUseCase {
  async execute(userId: number, acepta: boolean): Promise<SetTerminosCreditoResult> {
    const now = new Date();

    if (!acepta) {
      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          aceptaTerminosCredito: false,
          terminosCreditoRespondidosAt: now,
          limite: 0,
        },
        select: {
          aceptaTerminosCredito: true,
          terminosCreditoRespondidosAt: true,
          saldo: true,
          limite: true,
        },
      });

      return {
        aceptaTerminosCredito: user.aceptaTerminosCredito!,
        terminosCreditoRespondidosAt: user.terminosCreditoRespondidosAt!,
        creditoAplicado: false,
        saldo: user.saldo,
        limite: user.limite,
      };
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        aceptaTerminosCredito: true,
        terminosCreditoRespondidosAt: now,
        limite: 0,
      },
    });

    const creditoResult = await tryApplyCreditoOferta(userId);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        aceptaTerminosCredito: true,
        terminosCreditoRespondidosAt: true,
        saldo: true,
        limite: true,
      },
    });

    if (!user?.aceptaTerminosCredito || !user.terminosCreditoRespondidosAt) {
      throw new Error('No se pudo guardar la respuesta de términos IOX');
    }

    return {
      aceptaTerminosCredito: user.aceptaTerminosCredito,
      terminosCreditoRespondidosAt: user.terminosCreditoRespondidosAt,
      creditoAplicado: creditoResult.applied,
      saldo: creditoResult.saldo ?? user.saldo,
      limite: creditoResult.limite ?? user.limite,
      credito: creditoResult.credito,
    };
  }
}
