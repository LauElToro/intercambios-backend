import sharp from 'sharp';

const path =
  'C:/Users/Lautaro/.cursor/projects/e-intercambius-el-club-de-confianza/assets/c__Users_Lautaro_AppData_Roaming_Cursor_User_workspaceStorage_c56e74923857c1db982820fd6db2afb4_images_intercambius_banner_transparent-c4c84482-1a5d-4028-a99d-28832741b32e.png';
const meta = await sharp(path).metadata();
const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
let transparent = 0;
let opaque = 0;
for (let i = 3; i < data.length; i += 4) {
  if (data[i] === 0) transparent++;
  else opaque++;
}
console.log({ meta, transparent, opaque, total: data.length / 4 });
