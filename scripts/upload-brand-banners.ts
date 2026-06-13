import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import { put } from '@vercel/blob';
import dotenv from 'dotenv';

dotenv.config();

const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
if (!token) {
  throw new Error('BLOB_READ_WRITE_TOKEN no configurado');
}

const assetsDir =
  'C:/Users/Lautaro/.cursor/projects/e-intercambius-el-club-de-confianza/assets';

const files = [
  {
    path: join(
      assetsDir,
      'c__Users_Lautaro_AppData_Roaming_Cursor_User_workspaceStorage_c56e74923857c1db982820fd6db2afb4_images_intercambius_banner_1-0ab99c13-d3c3-4e71-b3c1-42eb4fbf1428.png',
    ),
    name: 'brand/intercambius_banner_1.png',
  },
  {
    path: join(
      assetsDir,
      'c__Users_Lautaro_AppData_Roaming_Cursor_User_workspaceStorage_c56e74923857c1db982820fd6db2afb4_images_intercambius_banner_transparent-3398f291-6bf6-4bcb-924a-7480c67decd0.png',
    ),
    name: 'brand/intercambius_banner_transparent.png',
  },
];

for (const file of files) {
  const input = readFileSync(file.path);
  const meta = await sharp(input).metadata();
  const trimmed = await sharp(input)
    .trim({ threshold: 12 })
    .png({ compressionLevel: 9 })
    .toBuffer();
  const trimmedMeta = await sharp(trimmed).metadata();
  console.log(
    `${file.name}: ${meta.width}x${meta.height} -> ${trimmedMeta.width}x${trimmedMeta.height}`,
  );

  const result = await put(file.name, trimmed, {
    access: 'public',
    token,
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'image/png',
  });
  console.log(`${file.name} => ${result.url}`);
}
