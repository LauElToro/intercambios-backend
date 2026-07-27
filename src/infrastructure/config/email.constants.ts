/** Remitente transaccional (MFA, bienvenida, etc.). */
export const NOREPLY_EMAIL = 'noreply@intercambius.com.ar';

/** Inbox de consultas del formulario. Requiere alias/usuario en Google Workspace. */
export const CONTACT_INBOX_EMAIL_DEFAULT = 'contacto@intercambius.com.ar';

/** Inbox de quejas y sugerencias. Requiere alias/usuario en Google Workspace. */
export const RECLAMOS_INBOX_EMAIL_DEFAULT = 'reclamos@intercambius.com.ar';

export const DEFAULT_SMTP_FROM = `"Intercambius" <${NOREPLY_EMAIL}>`;

/** Logo vertical de marca (Vercel Blob). */
export const BRAND_LOGO_URL =
  'https://iuw1gnctn1hxzcnx.public.blob.vercel-storage.com/brand/logo-intercambius.jpg';

/** Destino del formulario según categoría. */
export function resolveContactInbox(categoria: string): string {
  const isReclamo = categoria === 'queja' || categoria === 'sugerencia';
  if (isReclamo) {
    return (
      process.env.RECLAMOS_INBOX_EMAIL?.trim() ||
      RECLAMOS_INBOX_EMAIL_DEFAULT ||
      NOREPLY_EMAIL
    );
  }
  return (
    process.env.CONTACT_INBOX_EMAIL?.trim() ||
    CONTACT_INBOX_EMAIL_DEFAULT ||
    NOREPLY_EMAIL
  );
}
