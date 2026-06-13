import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import type { Attachment } from 'nodemailer/lib/mailer';
import { EMAIL_BANNER_URL } from '../config/email.constants.js';

/** CID estable para el banner embebido en todos los correos. */
export const EMAIL_LOGO_CID = 'intercambius-logo@brand';

export const EMAIL_LOGO_SRC = `cid:${EMAIL_LOGO_CID}`;

let cachedBanner: { content: Buffer; contentType: string } | null = null;

function trimEnv(v: string | undefined): string | undefined {
  if (v == null) return undefined;
  const t = v.replace(/^["']|["']$/g, '').trim();
  return t || undefined;
}

function resolveBannerUrl(): string {
  return trimEnv(process.env.EMAIL_BANNER_URL) || trimEnv(process.env.LOGO_URL) || EMAIL_BANNER_URL;
}

function loadBannerFromAssets(): { content: Buffer; contentType: string } | null {
  const assetPath = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'assets', 'email-banner.png');
  try {
    return { content: readFileSync(assetPath), contentType: 'image/png' };
  } catch {
    return null;
  }
}

async function loadBannerFromUrl(url: string): Promise<{ content: Buffer; contentType: string }> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`No se pudo cargar el banner de email (${res.status}): ${url}`);
  }
  const contentType = res.headers.get('content-type')?.split(';')[0]?.trim() || 'image/png';
  const content = Buffer.from(await res.arrayBuffer());
  return { content, contentType };
}

async function getBannerBinary(): Promise<{ content: Buffer; contentType: string }> {
  if (cachedBanner) return cachedBanner;

  cachedBanner = loadBannerFromAssets() ?? (await loadBannerFromUrl(resolveBannerUrl()));
  return cachedBanner;
}

/** Banner embebido inline: evita que Gmail muestre “Descargar” sobre imágenes remotas. */
export async function getEmailLogoAttachment(): Promise<Attachment> {
  const { content, contentType } = await getBannerBinary();
  return {
    filename: 'intercambius-banner.png',
    content,
    cid: EMAIL_LOGO_CID,
    contentType,
    contentDisposition: 'inline',
  };
}
