/** Normaliza número de documento (DNI u otro) para comparación y almacenamiento. */
export function normalizeDocumentNumber(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length >= 6) return digits;
  return trimmed.toUpperCase().replace(/\s+/g, '');
}
