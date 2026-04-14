/**
 * Elimina todas las publicaciones (MarketItem) y datos ligados:
 * imágenes, favoritos, detalles, características.
 * Intercambios y conversaciones conservan el registro pero pierden la referencia al producto (SET NULL).
 *
 * Uso: npx tsx scripts/delete-all-products.ts
 */
import 'dotenv/config';
import prisma from '../src/infrastructure/database/prisma.js';

async function main() {
  const before = await prisma.marketItem.count();
  if (before === 0) {
    console.log('No hay publicaciones para borrar.');
    return;
  }

  console.log(`Publicaciones a eliminar: ${before}`);

  await prisma.$transaction(async (tx) => {
    await tx.intercambio.updateMany({
      where: { marketItemId: { not: null } },
      data: { marketItemId: null },
    });
    await tx.conversacion.updateMany({
      where: { marketItemId: { not: null } },
      data: { marketItemId: null },
    });
    const del = await tx.marketItem.deleteMany({});
    console.log(`MarketItem eliminados: ${del.count}`);
  });

  const after = await prisma.marketItem.count();
  console.log(`Listo. Publicaciones restantes: ${after}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
