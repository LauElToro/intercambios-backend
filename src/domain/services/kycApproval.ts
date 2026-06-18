import prisma from '../../infrastructure/database/prisma.js';
import {
  fetchDiditSessionDecisionFull,
  extractDocumentNumberFromDiditDecision,
} from '../../infrastructure/services/diditSession.service.js';
import { normalizeDocumentNumber } from '../../utils/normalizeDocumentNumber.js';

export class KycDuplicateDocumentError extends Error {
  readonly code = 'KYC_DUPLICATE_DOCUMENT';

  constructor() {
    super('Ya existe una cuenta verificada con este documento de identidad.');
    this.name = 'KycDuplicateDocumentError';
  }
}

async function findOtherUserWithDocument(
  documentNumber: string,
  excludeUserId: number
): Promise<{ id: number } | null> {
  return prisma.user.findFirst({
    where: {
      kycDocumentNumber: documentNumber,
      kycVerificado: true,
      id: { not: excludeUserId },
    },
    select: { id: true },
  });
}

/**
 * Marca KYC aprobado solo si el documento no está asociado a otra cuenta verificada.
 * Si Didit no devuelve número de documento, se aprueba igual (compatibilidad).
 */
export async function approveKycForUser(
  userId: number,
  opts: {
    sessionId?: string | null;
    apiKey?: string;
    decision?: Record<string, unknown>;
  }
): Promise<{ documentNumber: string | null }> {
  let decision = opts.decision;
  if (!decision && opts.sessionId && opts.apiKey) {
    decision = await fetchDiditSessionDecisionFull(opts.sessionId, opts.apiKey);
  }

  const rawDoc = decision ? extractDocumentNumberFromDiditDecision(decision) : null;
  const documentNumber = normalizeDocumentNumber(rawDoc);

  if (documentNumber) {
    const duplicado = await findOtherUserWithDocument(documentNumber, userId);
    if (duplicado) {
      throw new KycDuplicateDocumentError();
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      kycVerificado: true,
      kycVerificadoAt: new Date(),
      ...(documentNumber ? { kycDocumentNumber: documentNumber } : {}),
    },
  });

  return { documentNumber };
}

export async function assertNoSelfDealByDocument(
  compradorId: number,
  vendedorId: number
): Promise<void> {
  const [comprador, vendedor] = await Promise.all([
    prisma.user.findUnique({
      where: { id: compradorId },
      select: { kycDocumentNumber: true },
    }),
    prisma.user.findUnique({
      where: { id: vendedorId },
      select: { kycDocumentNumber: true },
    }),
  ]);

  const docComprador = comprador?.kycDocumentNumber;
  const docVendedor = vendedor?.kycDocumentNumber;
  if (docComprador && docVendedor && docComprador === docVendedor) {
    throw new Error('No podés comprar ni vender entre cuentas con la misma identidad verificada.');
  }
}
