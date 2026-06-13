import sharp from 'sharp';

const { data } = await sharp('../public/intercambius_banner_transparent.png').ensureAlpha().raw().toBuffer({ resolveWithObject: true });
let fringe = 0;
let gold = 0;
for (let i = 0; i < data.length; i += 4) {
  if (data[i + 3] === 0) continue;
  const r = data[i], g = data[i + 1], b = data[i + 2];
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  if (lum < 60) fringe++;
  else gold++;
}
console.log({ fringe, gold });
