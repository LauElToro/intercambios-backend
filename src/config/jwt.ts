/**
 * Secreto JWT. En producción exige JWT_SECRET real (sin fallback).
 */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (secret) return secret;

  const isProd =
    process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';

  if (isProd) {
    throw new Error('JWT_SECRET no está configurado. Definilo en las variables de entorno.');
  }

  console.warn('[jwt] JWT_SECRET ausente; usando secreto de desarrollo (NO usar en producción).');
  return 'your-secret-key';
}
