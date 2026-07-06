/** Buzón único de Intercambius (envío transaccional). */
export const NOREPLY_EMAIL = 'noreply@intercambius.com.ar';

/** Inbox del formulario web (quejas, contacto). Configurar en Vercel como CONTACT_INBOX_EMAIL. */
export const CONTACT_INBOX_EMAIL_DEFAULT = 'contactenos@intercambius.com.ar';

export const DEFAULT_SMTP_FROM = `"Intercambius" <${NOREPLY_EMAIL}>`;

/** Logo vertical de marca (Vercel Blob). */
export const BRAND_LOGO_URL =
  'https://iuw1gnctn1hxzcnx.public.blob.vercel-storage.com/brand/logo-intercambius.jpg';
