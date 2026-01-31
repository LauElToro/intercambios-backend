import { put } from '@vercel/blob';

const BLOB_READ_WRITE_TOKEN = process.env.BLOB_READ_WRITE_TOKEN || '';
const BLOB_BASE_URL = 'https://iuw1gnctn1hxzcnx.public.blob.vercel-storage.com';

export interface UploadResult {
  url: string;
  pathname: string;
}

export async function uploadImage(file: File | Buffer, filename: string): Promise<UploadResult> {
  try {
    if (!BLOB_READ_WRITE_TOKEN) {
      throw new Error('BLOB_READ_WRITE_TOKEN no configurado');
    }

    const blob = await put(filename, file, {
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
    throw new Error('Error al subir la imagen');
  }
}

export function getImageUrl(pathname: string): string {
  return `${BLOB_BASE_URL}/${pathname}`;
}
