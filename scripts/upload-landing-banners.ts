import { readFileSync } from 'fs';
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
    path: `${assetsDir}/c__Users_Lautaro_AppData_Roaming_Cursor_User_workspaceStorage_c56e74923857c1db982820fd6db2afb4_images_intercambius_banner_1-0b92cf28-7028-429c-a818-557d2d8564b0.png`,
    name: 'brand/intercambius_banner_1.png',
  },
  {
    path: `${assetsDir}/c__Users_Lautaro_AppData_Roaming_Cursor_User_workspaceStorage_c56e74923857c1db982820fd6db2afb4_images_intercambius_banner_transparent-e1456169-1b9c-4431-a33a-33ec9b573222.png`,
    name: 'brand/intercambius_banner_transparent.png',
  },
];

for (const file of files) {
  const buffer = readFileSync(file.path);
  const result = await put(file.name, buffer, {
    access: 'public',
    token,
    addRandomSuffix: false,
    contentType: 'image/png',
  });
  console.log(`${file.name} => ${result.url}`);
}
