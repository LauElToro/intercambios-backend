import sharp from 'sharp';

const path = 'assets/intercambius_banner_transparent.png';
const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
let transparent = 0;
let opaque = 0;
for (let i = 3; i < data.length; i += 4) {
  if (data[i] === 0) transparent++;
  else if (data[i] === 255) opaque++;
}
console.log({ width: info.width, height: info.height, channels: info.channels, transparent, opaque, total: data.length / 4 });
