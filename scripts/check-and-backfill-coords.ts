/**
 * Script para revisar publicaciones existentes y completar lat/lng faltantes.
 * Ejecutar: npx tsx scripts/check-and-backfill-coords.ts
 *
 * Requiere DATABASE_URL en .env
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Mapeo de ubicaciones comunes a coordenadas (mismo que LocationPicker en frontend)
const UBICACIONES_COMUNES: Record<string, { lat: number; lng: number }> = {
  'CABA - Centro': { lat: -34.6037, lng: -58.3816 },
  'CABA - Palermo': { lat: -34.5885, lng: -58.4204 },
  'CABA - Belgrano': { lat: -34.5631, lng: -58.4584 },
  'CABA - Caballito': { lat: -34.6208, lng: -58.4414 },
  'CABA - San Telmo': { lat: -34.6208, lng: -58.3731 },
  'La Plata': { lat: -34.9215, lng: -57.9545 },
  'Mar del Plata': { lat: -38.0055, lng: -57.5426 },
  'Córdoba': { lat: -31.4201, lng: -64.1888 },
  'Rosario': { lat: -32.9442, lng: -60.6505 },
  // Variantes comunes que la gente puede escribir
  'CABA': { lat: -34.6037, lng: -58.3816 },
  'Ciudad Autónoma de Buenos Aires': { lat: -34.6037, lng: -58.3816 },
  'Buenos Aires': { lat: -34.6037, lng: -58.3816 },
};

function normalizarUbicacion(ubicacion: string): string {
  return ubicacion.trim();
}

function encontrarCoords(ubicacion: string): { lat: number; lng: number } | null {
  const normalizada = normalizarUbicacion(ubicacion);
  // Coincidencia exacta
  if (UBICACIONES_COMUNES[normalizada]) {
    return UBICACIONES_COMUNES[normalizada];
  }
  // Coincidencia parcial (ej: "Córdoba, Argentina" contiene "Córdoba")
  for (const [nombre, coords] of Object.entries(UBICACIONES_COMUNES)) {
    if (normalizada.toLowerCase().includes(nombre.toLowerCase())) {
      return coords;
    }
  }
  return null;
}

async function main() {
  console.log('=== Revisión de coordenadas en MarketItem ===\n');

  const items = await prisma.marketItem.findMany({
    select: { id: true, titulo: true, ubicacion: true, lat: true, lng: true },
    orderBy: { id: 'asc' },
  });

  const conCoords = items.filter((i) => i.lat != null && i.lng != null);
  const sinCoords = items.filter((i) => i.lat == null || i.lng == null);

  console.log(`Total de publicaciones: ${items.length}`);
  console.log(`Con coordenadas (lat/lng): ${conCoords.length}`);
  console.log(`Sin coordenadas: ${sinCoords.length}\n`);

  if (sinCoords.length > 0) {
    console.log('--- Publicaciones SIN coordenadas ---');
    for (const item of sinCoords) {
      const coords = encontrarCoords(item.ubicacion || '');
      const puedeBackfill = coords ? '✓ puede completar' : '✗ no hay match';
      console.log(`  ID ${item.id}: "${item.titulo}" | ubicación: "${item.ubicacion}" | ${puedeBackfill}`);
    }
    console.log('');

    const aActualizar = sinCoords.filter((i) => encontrarCoords(i.ubicacion || ''));
    if (aActualizar.length > 0) {
      console.log(`--- Completando lat/lng para ${aActualizar.length} publicación(es) ---`);
      for (const item of aActualizar) {
        const coords = encontrarCoords(item.ubicacion!);
        if (coords) {
          await prisma.marketItem.update({
            where: { id: item.id },
            data: { lat: coords.lat, lng: coords.lng },
          });
          console.log(`  ✓ ID ${item.id}: "${item.titulo}" → lat=${coords.lat}, lng=${coords.lng}`);
        }
      }
      console.log('\n✓ Backfill completado.');
    } else {
      console.log('No hay publicaciones que se puedan completar automáticamente.');
      console.log('Las ubicaciones deben coincidir con: CABA, Córdoba, Rosario, La Plata, Mar del Plata, etc.');
    }
  } else {
    console.log('✓ Todas las publicaciones tienen coordenadas.');
  }
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
