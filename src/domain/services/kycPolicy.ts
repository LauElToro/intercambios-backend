/** Error estándar cuando la acción requiere identidad verificada (Didit/KYC). */
export class KycRequiredError extends Error {
  readonly code = 'KYC_REQUIRED';

  constructor(message: string) {
    super(message);
    this.name = 'KycRequiredError';
  }
}

export function assertKycVerificado(
  kycVerificado: boolean | null | undefined,
  message = 'Debés verificar tu identidad para continuar.'
): void {
  if (!kycVerificado) {
    throw new KycRequiredError(message);
  }
}

export function isKycRequiredError(error: unknown): error is KycRequiredError {
  return (
    error instanceof KycRequiredError ||
    (typeof error === 'object' &&
      error !== null &&
      (error as { code?: string }).code === 'KYC_REQUIRED')
  );
}
