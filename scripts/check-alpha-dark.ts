import sharp from 'sharp';

const { data, info } = await sharp('assets/intercambius_banner_transparent.png').ensureAlpha().raw().toBuffer({ resolveWithObject: true });
let opaqueDark = 0;
let opaqueGold = 0;
for (let i = 0; i < data.length; i += 4) {
  if (data[i + 3] === 0) continue;
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  if (lum < 80) opaqueDark++;
  else opaqueGold++;
}
console.log({ opaqueDark, opaqueGold, totalOpaque: opaqueDark + opaqueGold });
