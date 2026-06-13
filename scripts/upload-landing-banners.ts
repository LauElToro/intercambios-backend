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
    path: new URL('../../public/logo.jpg', import.meta.url),
    name: 'brand/logo-intercambius.jpg',
    contentType: 'image/jpeg',
  },
  {
    path: `${assetsDir}/c__Users_Lautaro_AppData_Roaming_Cursor_User_workspaceStorage_c56e74923857c1db982820fd6db2afb4_images_intercambius_banner_transparent-e1456169-1b9c-4431-a33a-33ec9b573222.png`,
    name: 'brand/intercambius_banner_transparent.png',
    contentType: 'image/png',
  },
];

for (const file of files) {
  const filePath = typeof file.path === 'string' ? file.path : file.path.pathname.replace(/^\//, '').replace(/\//g, '\\').replace(/^([A-Z]:)/, '$1');
  const resolvedPath = typeof file.path === 'string' ? file.path : filePath;
  const buffer = readFileSync(resolvedPath.startsWith('E:') || resolvedPath.startsWith('e:') ? resolvedPath : file.path);
  const result = await put(file.name, buffer, {
    access: 'public',
    token,
    addRandomSuffix: false,
    contentType: file.contentType,
  });
  console.log(`${file.name} => ${result.url}`);
}
