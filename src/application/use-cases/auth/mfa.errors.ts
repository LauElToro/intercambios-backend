export class MfaResendCooldownError extends Error {
  readonly retryAfterSeconds: number;
  readonly mfaResendAvailableAt: string;

  constructor(retryAfterSeconds: number, mfaResendAvailableAt: string) {
    super(`Podés reenviar el código en ${formatCooldown(retryAfterSeconds)}`);
    this.name = 'MfaResendCooldownError';
    this.retryAfterSeconds = retryAfterSeconds;
    this.mfaResendAvailableAt = mfaResendAvailableAt;
  }
}

function formatCooldown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes <= 0) return `${seconds} s`;
  if (seconds === 0) return `${minutes} min`;
  return `${minutes} min ${seconds} s`;
}
