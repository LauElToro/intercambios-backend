import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const BANNER_PATH = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'assets', 'email-banner.png');

let cachedDataUri: string | null = null;

/**
 * Banner del mail embebido como data URI (sin adjuntos ni URLs externas).
 * Gmail no muestra “Descargar / Drive / Fotos” si la imagen no va como attachment.
 */
export function getEmailBannerDataUri(): string {
  if (cachedDataUri) return cachedDataUri;

  try {
    const content = readFileSync(BANNER_PATH);
    cachedDataUri = `data:image/png;base64,${content.toString('base64')}`;
    return cachedDataUri;
  } catch {
    throw new Error(
      `No se encontró el banner de email en ${BANNER_PATH}. Ejecutá: npx tsx scripts/prepare-email-banner.ts`,
    );
  }
}
