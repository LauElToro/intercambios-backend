/** Email canónico: trim + minúsculas (login, registro, reset, envíos). */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizeEmailOrEmpty(email: string | null | undefined): string {
  if (email == null) return '';
  return normalizeEmail(email);
}
