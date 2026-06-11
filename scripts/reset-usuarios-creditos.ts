/**
 * Reinicia saldo (créditos IOX) de todos los usuarios y restablece el límite negativo al default del schema.
 * También limpia deudaEnLimiteDesde.
 *
 * Ejecutar: npx tsx scripts/reset-usuarios-creditos.ts
 * O: npm run db:reset-creditos (desde backend/)
 */

import 'dotenv/config';
import prisma from '../src/infrastructure/database/prisma.js';

/** Coincide con User.limite @default en schema.prisma */
const LIMITE_DEFAULT = 50_000;

async function main() {
  const result = await prisma.user.updateMany({
    data: {
      saldo: 0,
      limite: LIMITE_DEFAULT,
      deudaEnLimiteDesde: null,
    },
  });

  console.log(`Actualizados ${result.count} usuario(s): saldo=0, limite=${LIMITE_DEFAULT}, deudaEnLimiteDesde=null`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
