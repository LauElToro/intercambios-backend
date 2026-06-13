import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const assetsDir =
  'C:/Users/Lautaro/.cursor/projects/e-intercambius-el-club-de-confianza/assets';
const sourcePath = join(
  assetsDir,
  'c__Users_Lautaro_AppData_Roaming_Cursor_User_workspaceStorage_c56e74923857c1db982820fd6db2afb4_images_intercambius_banner_1-0ab99c13-d3c3-4e71-b3c1-42eb4fbf1428.png',
);
const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const outputPath = join(rootDir, 'public', 'intercambius_banner_1.png');

const input = readFileSync(sourcePath);
const meta = await sharp(input).metadata();
const trimmed = await sharp(input).trim({ threshold: 12 }).png({ compressionLevel: 9 }).toBuffer();
const trimmedMeta = await sharp(trimmed).metadata();

writeFileSync(outputPath, trimmed);
console.log(`intercambius_banner_1.png: ${meta.width}x${meta.height} -> ${trimmedMeta.width}x${trimmedMeta.height}`);
console.log(`Saved to ${outputPath} (usado en mails vía ${'{FRONTEND_URL}'}/intercambius_banner_1.png)`);
