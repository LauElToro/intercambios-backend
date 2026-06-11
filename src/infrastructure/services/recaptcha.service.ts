function recaptchaSecret(): string | undefined {
  return process.env.RECAPTCHA_SECRET_KEY?.trim() || undefined;
}

export function isRecaptchaConfigured(): boolean {
  return Boolean(recaptchaSecret());
}

/** Verifica token reCAPTCHA v2/v3 con Google. Si no hay secret configurado, omite (solo dev). */
export async function verifyRecaptchaToken(token: string | undefined | null): Promise<boolean> {
  const secret = recaptchaSecret();
  if (!secret) {
    console.warn('[RECAPTCHA] RECAPTCHA_SECRET_KEY no configurado — verificación omitida');
    return true;
  }
  if (!token?.trim()) return false;

  const body = new URLSearchParams({
    secret,
    response: token.trim(),
  });

  const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) return false;
  const data = (await res.json()) as { success?: boolean; score?: number };
  if (!data.success) return false;

  // v3 opcional: score mínimo
  if (typeof data.score === 'number' && data.score < 0.5) return false;
  return true;
}
