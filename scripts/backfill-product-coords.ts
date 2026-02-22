/**
 * Backfill: añade lat/lng a productos que tienen ubicacion pero no coordenadas.
 * Mapea textos de ubicación a coordenadas conocidas.
 * Ejecutar: npx tsx scripts/backfill-product-coords.ts
 */

import prisma from '../src/infrastructure/database/prisma.js';

const UBICACION_COORDS: Record<string, { lat: number; lng: number }> = {
  'CABA': { lat: -34.6037, lng: -58.3816 },
  'CABA - Centro': { lat: -34.6037, lng: -58.3816 },
  'CABA - Palermo': { lat: -34.5885, lng: -58.4204 },
  'CABA - Belgrano': { lat: -34.5631, lng: -58.4584 },
  'CABA - Caballito': { lat: -34.6208, lng: -58.4414 },
  'CABA - San Telmo': { lat: -34.6208, lng: -58.3731 },
  'Caballito': { lat: -34.6208, lng: -58.4414 },
  'Palermo': { lat: -34.5885, lng: -58.4204 },
  'Belgrano': { lat: -34.5631, lng: -58.4584 },
  'San Telmo': { lat: -34.6208, lng: -58.3731 },
  'Recoleta': { lat: -34.5875, lng: -58.3934 },
  'Villa Crespo': { lat: -34.6014, lng: -58.4394 },
  'Puerto Madero': { lat: -34.6127, lng: -58.3636 },
  'La Boca': { lat: -34.6341, lng: -58.3636 },
  'Almagro': { lat: -34.6089, lng: -58.4239 },
  'Flores': { lat: -34.6345, lng: -58.4661 },
  'Villa Urquiza': { lat: -34.5798, lng: -58.4954 },
  'La Plata': { lat: -34.9215, lng: -57.9545 },
  'Mar del Plata': { lat: -38.0055, lng: -57.5426 },
  'Córdoba': { lat: -31.4201, lng: -64.1888 },
  'Rosario': { lat: -32.9442, lng: -60.6505 },
};

function findCoords(ubicacion: string): { lat: number; lng: number } | null {
  const ub = (ubicacion || '').trim();
  if (!ub) return null;
  const exact = UBICACION_COORDS[ub];
  if (exact) return exact;
  const ubLower = ub.toLowerCase();
  for (const [key, coords] of Object.entries(UBICACION_COORDS)) {
    if (ubLower.includes(key.toLowerCase())) return coords;
  }
  return null;
}

async function main() {
  const items = await prisma.marketItem.findMany({
    where: { OR: [{ lat: null }, { lng: null }] },
    select: { id: true, ubicacion: true },
  });

  let updated = 0;
  for (const item of items) {
    const coords = findCoords(item.ubicacion);
    if (coords) {
      await prisma.marketItem.update({
        where: { id: item.id },
        data: { lat: coords.lat, lng: coords.lng },
      });
      updated++;
    }
  }

  console.log(`✅ Actualizados ${updated} de ${items.length} productos con lat/lng`);
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
