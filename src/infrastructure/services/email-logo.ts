function trimEnv(v: string | undefined): string | undefined {
  if (v == null) return undefined;
  const t = v.replace(/^["']|["']$/g, '').trim();
  return t || undefined;
}

/** Banner del mail servido desde el front (public/intercambius_banner_1.png). HTML liviano, sin adjuntos. */
export function getEmailBannerUrl(frontendUrl: string): string {
  const override = trimEnv(process.env.EMAIL_BANNER_URL);
  if (override) return override;
  return `${frontendUrl.replace(/\/$/, '')}/intercambius_banner_1.png`;
}
