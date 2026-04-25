import { put, PutBlobResult } from '@vercel/blob';

const BLOB_READ_WRITE_TOKEN = process.env.BLOB_READ_WRITE_TOKEN || '';
const BLOB_BASE_URL = 'https://iuw1gnctn1hxzcnx.public.blob.vercel-storage.com';

export interface UploadResult {
  url: string;
  pathname: string;
}

export async function uploadImage(file: File | Buffer | Uint8Array | Blob, filename: string): Promise<UploadResult> {
  try {
    if (!BLOB_READ_WRITE_TOKEN) {
      throw new Error('BLOB_READ_WRITE_TOKEN no configurado');
    }

    // @vercel/blob acepta Buffer directamente, pero TypeScript puede necesitar el cast
    const blob: PutBlobResult = await put(filename, file as any, {
      access: 'public',
      token: BLOB_READ_WRITE_TOKEN,
      addRandomSuffix: true, // Evita colisiones de nombres
    });

    return {
      url: blob.url,
      pathname: blob.pathname,
    };
  } catch (error) {
    console.error('Error uploading to Vercel Blob:', error);
    const reason = error instanceof Error ? error.message : String(error);
    if (/BLOB_READ_WRITE_TOKEN|no configurado|not configured/i.test(reason)) {
      throw new Error('BLOB_READ_WRITE_TOKEN no configurado en el servidor (revisá variables de entorno en Vercel).');
    }
    if (/401|403|unauthori|invalid token|forbidden|not allowed/i.test(reason)) {
      throw new Error('Token de Vercel Blob inválido o revocado. Generá un nuevo BLOB_READ_WRITE_TOKEN en el dashboard y actualizá Vercel.');
    }
    if (/body.*limit|413|too large|payload|4\.5|4,5|mb/i.test(reason)) {
      throw new Error('El archivo no cabe en el límite de subida del servidor; probá un archivo más pequeño.');
    }
    throw new Error('Error al subir la imagen');
  }
}

export function getImageUrl(pathname: string): string {
  return `${BLOB_BASE_URL}/${pathname}`;
}
