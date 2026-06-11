export const MFA_CODE_EXPIRY_MINUTES = 10;
export const MFA_TEMP_TOKEN_EXPIRY = '15m';
export const MFA_RESEND_COOLDOWN_MS = 5 * 60 * 1000;

export function mfaResendAvailableAt(sentAtMs: number): string {
  return new Date(sentAtMs + MFA_RESEND_COOLDOWN_MS).toISOString();
}

export function mfaResendSecondsRemaining(sentAtMs: number, nowMs = Date.now()): number {
  return Math.max(0, Math.ceil((sentAtMs + MFA_RESEND_COOLDOWN_MS - nowMs) / 1000));
}
