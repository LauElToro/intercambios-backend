import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const publicDir = join(rootDir, 'public');
const assetsDir =
  'C:/Users/Lautaro/.cursor/projects/e-intercambius-el-club-de-confianza/assets';

const sources = {
  dark: join(
    assetsDir,
    'c__Users_Lautaro_AppData_Roaming_Cursor_User_workspaceStorage_c56e74923857c1db982820fd6db2afb4_images_intercambius_banner_1-0ab99c13-d3c3-4e71-b3c1-42eb4fbf1428.png',
  ),
  light: join(
    assetsDir,
    'c__Users_Lautaro_AppData_Roaming_Cursor_User_workspaceStorage_c56e74923857c1db982820fd6db2afb4_images_intercambius_banner_transparent-c4c84482-1a5d-4028-a99d-28832741b32e.png',
  ),
};

/** Genera alpha real quitando fondo negro y limpiando halos oscuros en bordes. */
async function makeTransparentPng(input: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(input).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const rgba = Buffer.alloc(info.width * info.height * 4);

  for (let i = 0, j = 0; i < data.length; i += 3, j += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const saturation = max === 0 ? 0 : (max - min) / max;
    const warmth = r - b;

    let alpha = 0;
    const isGold = saturation > 0.16 && warmth > -5 && max > 42;

    if (max <= 14 || (!isGold && max <= 28)) {
      alpha = 0;
    } else if (isGold && max >= 64) {
      alpha = 255;
    } else if (isGold) {
      alpha = Math.round(((max - 28) / 36) * 255);
    } else {
      alpha = 0;
    }

    if (alpha > 0 && alpha < 255) {
      const lift = 255 / alpha;
      r = Math.min(255, Math.round(r * lift));
      g = Math.min(255, Math.round(g * lift));
      b = Math.min(255, Math.round(b * lift));
    }

    if (alpha > 0) {
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      if (lum < 72) alpha = Math.round(alpha * (lum / 72));
      if (alpha < 24) alpha = 0;
    }

    rgba[j] = r;
    rgba[j + 1] = g;
    rgba[j + 2] = b;
    rgba[j + 3] = alpha;
  }

  return sharp(rgba, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .trim({ threshold: 12 })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
}

async function trimOpaquePng(input: Buffer): Promise<Buffer> {
  return sharp(input).trim({ threshold: 12 }).png({ compressionLevel: 9 }).toBuffer();
}

mkdirSync(publicDir, { recursive: true });

const darkInput = readFileSync(sources.dark);
const lightInput = readFileSync(sources.light);

const darkMeta = await sharp(darkInput).metadata();
const lightMeta = await sharp(lightInput).metadata();
console.log('Source dark:', darkMeta.format, darkMeta.width, darkMeta.height, 'alpha:', darkMeta.hasAlpha);
console.log('Source light:', lightMeta.format, lightMeta.width, lightMeta.height, 'alpha:', lightMeta.hasAlpha);

const darkOut = await trimOpaquePng(darkInput);
const lightOut = await makeTransparentPng(lightInput);

const darkPath = join(publicDir, 'intercambius_banner_1.png');
const lightPath = join(publicDir, 'intercambius_banner_transparent.png');
writeFileSync(darkPath, darkOut);
writeFileSync(lightPath, lightOut);

const darkFinal = await sharp(darkOut).metadata();
const lightFinal = await sharp(lightOut).metadata();
console.log('Dark out:', darkFinal.width, 'x', darkFinal.height);
console.log('Light out:', lightFinal.width, 'x', lightFinal.height, 'alpha:', lightFinal.hasAlpha);

const { data: lightData } = await sharp(lightOut).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
let transparentPx = 0;
for (let i = 3; i < lightData.length; i += 4) {
  if (lightData[i] === 0) transparentPx++;
}
console.log('Transparent pixels:', transparentPx, '/', lightData.length / 4);
