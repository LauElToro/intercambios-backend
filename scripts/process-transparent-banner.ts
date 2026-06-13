import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
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
const sourcePath = join(
  assetsDir,
  'c__Users_Lautaro_AppData_Roaming_Cursor_User_workspaceStorage_c56e74923857c1db982820fd6db2afb4_images_intercambius_banner_transparent-3398f291-6bf6-4bcb-924a-7480c67decd0.png',
);
const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const localOut = join(rootDir, 'assets', 'intercambius_banner_transparent.png');

/** Convierte fondo oscuro (negro/gris) en alpha real para PNG. */
async function removeDarkBackground(input: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const pixels = Buffer.from(data);

  const isGoldish = (r: number, g: number, b: number): boolean => {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const saturation = max === 0 ? 0 : (max - min) / max;
    return saturation > 0.22 && r >= g - 8 && r > b + 6 && max > 45;
  };

  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    if (isGoldish(r, g, b)) continue;

    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    if (luminance < 95) {
      pixels[i + 3] = 0;
    } else if (luminance < 120) {
      const t = (luminance - 95) / 25;
      pixels[i + 3] = Math.round(Math.min(pixels[i + 3], t * 255));
    }
  }

  return sharp(pixels, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .trim({ threshold: 8 })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

const source = readFileSync(sourcePath);
const meta = await sharp(source).metadata();
const transparent = await removeDarkBackground(source);
const outMeta = await sharp(transparent).metadata();

writeFileSync(localOut, transparent);
console.log(`Local: ${meta.width}x${meta.height} -> ${outMeta.width}x${outMeta.height} (alpha)`);

const result = await put('brand/intercambius_banner_transparent.png', transparent, {
  access: 'public',
  token,
  addRandomSuffix: false,
  allowOverwrite: true,
  contentType: 'image/png',
});
console.log(`Blob: ${result.url}`);
