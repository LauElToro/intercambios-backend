/**
 * Alinea verificado=true para usuarios con KYC Didit aprobado (campo legado del admin export).
 * Uso: npx tsx scripts/backfill-verificado-from-kyc.ts
 */

import 'dotenv/config';
import prisma from '../src/infrastructure/database/prisma.js';

async function main() {
  const result = await prisma.user.updateMany({
    where: { kycVerificado: true, verificado: false },
    data: { verificado: true },
  });
  console.log(`Actualizados ${result.count} usuario(s): verificado=true (tenían kycVerificado=true)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
