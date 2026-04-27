import { put, PutBlobResult } from '@vercel/blob';

/** URL base del store (solo referencia para construir URLs desde pathname; las subidas usan la URL que devuelve `put`). */
const BLOB_BASE_URL = 'https://iuw1gnctn1hxzcnx.public.blob.vercel-storage.com';

/**
 * Token de escritura: `BLOB_READ_WRITE_TOKEN` o, si en Vercel creaste el store con prefijo personalizado,
 * una variable que termine en `_BLOB_READ_WRITE_TOKEN` (solo si hay una; si hay varias, definí `BLOB_READ_WRITE_TOKEN` a mano).
 * @see https://vercel.com/docs/vercel-blob/using-blob-sdk#read-write-token
 */
function resolveBlobReadWriteToken(): string {
  const primary = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (primary) return primary;

  const fromPrefixed: string[] = [];
  for (const key of Object.keys(process.env)) {
    if (key.endsWith('_BLOB_READ_WRITE_TOKEN')) {
      const v = process.env[key]?.trim();
      if (v) fromPrefixed.push(v);
    }
  }
  if (fromPrefixed.length === 1) return fromPrefixed[0];
  if (fromPrefixed.length > 1) {
    console.error(
      '[vercel-blob] Varios env * _BLOB_READ_WRITE_TOKEN. Definí BLOB_READ_WRITE_TOKEN con el token del almacén (Storage → tu Blob store).',
    );
  }
  return '';
}

/**
 * Debe coincidir con el tipo de almacén en Vercel (público / privado).
 * Para mostrar imágenes en el front con URL directa hace falta almacén Blob público y BLOB_STORE_ACCESS=public.
 * @see https://vercel.com/docs/vercel-blob#private-and-public-storage
 */
function resolveBlobAccess(): 'public' | 'private' {
  const raw = (process.env.BLOB_STORE_ACCESS || '').trim().toLowerCase();
  if (raw === 'private') return 'private';
  return 'public';
}

export interface UploadResult {
  url: string;
  pathname: string;
}

export async function uploadImage(
  file: File | Buffer | Blob,
  filename: string,
  contentType?: string
): Promise<UploadResult> {
  try {
    const token = resolveBlobReadWriteToken();
    if (!token) {
      throw new Error('BLOB_READ_WRITE_TOKEN no configurado');
    }

    const access = resolveBlobAccess();

    const blob: PutBlobResult = await put(filename, file, {
      access,
      token,
      addRandomSuffix: true,
      ...(contentType ? { contentType } : {}),
    });

    return {
      url: blob.url,
      pathname: blob.pathname,
    };
  } catch (error) {
    console.error('Error uploading to Vercel Blob:', error);
    const reason = error instanceof Error ? error.message : String(error);
    if (/BLOB_READ_WRITE_TOKEN|no configurado|not configured|No token found/i.test(reason)) {
      throw new Error('BLOB_READ_WRITE_TOKEN no configurado en el servidor (revisá variables de entorno en Vercel).');
    }
    if (/401|403|unauthori|invalid token|forbidden|not allowed|Access denied|valid token/i.test(reason)) {
      throw new Error(
        'Token de Vercel Blob inválido o no corresponde al almacén. En Vercel: Storage → tu store → .env local / Read-Write Token, y asignalo a BLOB_READ_WRITE_TOKEN.',
      );
    }
    if (/access|public|private|store/i.test(reason) && /mismatch|invalid|not match|must/i.test(reason)) {
      throw new Error(
        'El parámetro de acceso no coincide con el tipo de almacén Blob. Definí BLOB_STORE_ACCESS=public o BLOB_STORE_ACCESS=private según el store (Settings del almacén en Vercel).',
      );
    }
    if (/body.*limit|413|too large|payload|4\.5|4,5|mb|file too large/i.test(reason)) {
      throw new Error('El archivo no cabe en el límite de subida del servidor; probá un archivo más pequeño.');
    }
    throw new Error('Error al subir la imagen');
  }
}

export function getImageUrl(pathname: string): string {
  return `${BLOB_BASE_URL}/${pathname}`;
}
