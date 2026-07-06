import { randomBytes } from 'node:crypto';
import prisma from '../infrastructure/database/prisma.js';

const SLUG_SUFFIX_LEN = 8;
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

const RESERVED_SLUGS = new Set([
  'me', 'admin', 'api', 'auth', 'login', 'register', 'market', 'checkout', 'chat',
  'dashboard', 'perfil', 'evaluar', 'contact', 'coincidencias', 'producto',
  'mis-compras', 'mis-publicaciones', 'historial', 'registro-intercambio',
  'users', 'intercambios', 'upload', 'health', 'webhooks', 'favoritos',
  'busquedas', 'notificaciones', 'referidos', 'evaluaciones', 'kyc', 'geo',
]);

function randomSlugPart(len = SLUG_SUFFIX_LEN): string {
  const bytes = randomBytes(len);
  let out = '';
  for (let i = 0; i < len; i++) {
    out += ALPHABET[bytes[i]! % ALPHABET.length];
  }
  return out;
}

/** Normaliza texto de usuario a slug de URL (minúsculas, guiones). */
export function sanitizeProfileSlugInput(raw: string): string {
  return raw
    .trim()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 48);
}

export function slugifyNombre(nombre: string): string {
  const s = sanitizeProfileSlugInput(nombre.replace(/\s+/g, '-'));
  return s || 'usuario';
}

export function validateProfileSlug(slug: string): string | null {
  if (!slug) return 'La URL del perfil no puede estar vacía';
  if (slug.length < 3) return 'La URL debe tener al menos 3 caracteres';
  if (slug.length > 48) return 'La URL puede tener como máximo 48 caracteres';
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug) && !/^[a-z0-9]{3}$/.test(slug)) {
    return 'Usá solo letras, números y guiones (sin espacios ni caracteres especiales)';
  }
  if (/^\d+$/.test(slug)) return 'La URL no puede ser solo números';
  if (RESERVED_SLUGS.has(slug)) return 'Esa URL está reservada, elegí otra';
  return null;
}

export function isNumericUserIdParam(param: string): boolean {
  return /^\d+$/.test(param.trim());
}

async function isSlugTaken(slug: string, excludeUserId?: number): Promise<boolean> {
  const row = await prisma.user.findFirst({
    where: {
      profileSlug: { equals: slug, mode: 'insensitive' },
      ...(excludeUserId ? { NOT: { id: excludeUserId } } : {}),
    },
    select: { id: true },
  });
  return !!row;
}

/** Slug por defecto al registrarse: lautaro-figueroa-b7324s23 */
export async function generateDefaultProfileSlug(nombre: string, maxAttempts = 10): Promise<string> {
  const base = slugifyNombre(nombre);
  for (let i = 0; i < maxAttempts; i++) {
    const candidate = `${base}-${randomSlugPart()}`;
    if (validateProfileSlug(candidate)) continue;
    if (!(await isSlugTaken(candidate))) return candidate;
  }
  return `usuario-${randomSlugPart(12)}`;
}

/** Legacy opaco u_xxxxxxxxxxxx (fallback). */
export function buildOpaqueProfileSlug(): string {
  return `u_${randomSlugPart(12)}`;
}

export async function generateUniqueProfileSlug(seedNombre?: string): Promise<string> {
  if (seedNombre?.trim()) {
    return generateDefaultProfileSlug(seedNombre);
  }
  for (let i = 0; i < 8; i++) {
    const slug = buildOpaqueProfileSlug();
    if (!(await isSlugTaken(slug))) return slug;
  }
  return buildOpaqueProfileSlug();
}

export async function assignProfileSlugIfMissing(userId: number, nombre: string): Promise<string | null> {
  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: { profileSlug: true },
  });
  if (row?.profileSlug?.trim()) return row.profileSlug;
  const slug = await generateDefaultProfileSlug(nombre);
  await prisma.user.update({ where: { id: userId }, data: { profileSlug: slug } });
  return slug;
}

export async function updateUserProfileSlug(
  userId: number,
  rawSlug: string,
): Promise<{ slug: string } | { error: string }> {
  const slug = sanitizeProfileSlugInput(rawSlug);
  const validationError = validateProfileSlug(slug);
  if (validationError) return { error: validationError };
  if (await isSlugTaken(slug, userId)) {
    return { error: 'Esa URL ya está en uso. Probá con otra.' };
  }
  await prisma.user.update({ where: { id: userId }, data: { profileSlug: slug } });
  return { slug };
}
