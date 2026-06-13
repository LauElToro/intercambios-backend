import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { put } from '@vercel/blob';
import dotenv from 'dotenv';

dotenv.config();

const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
if (!token) {
  throw new Error('BLOB_READ_WRITE_TOKEN no configurado');
}

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const files = [
  {
    path: join(rootDir, 'public', 'logo.jpg'),
    name: 'brand/logo-intercambius.jpg',
    contentType: 'image/jpeg',
  },
];

for (const file of files) {
  const buffer = readFileSync(file.path);
  const result = await put(file.name, buffer, {
    access: 'public',
    token,
    addRandomSuffix: false,
    contentType: file.contentType,
  });
  console.log(`${file.name} => ${result.url}`);
}
