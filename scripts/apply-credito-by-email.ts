/**
 * Aplica crédito IOX pendiente a un usuario por email (soporte / casos retroactivos).
 * Uso: npx tsx scripts/apply-credito-by-email.ts alcegar81@gmail.com
 */

import 'dotenv/config';
import prisma from '../src/infrastructure/database/prisma.js';
import { ensureSchema } from '../src/infrastructure/database/ensureSchema.js';
import { tryApplyCreditoOferta } from '../src/domain/services/creditoOferta.service.js';

const email = process.argv[2]?.trim();
if (!email) {
  console.error('Uso: npx tsx scripts/apply-credito-by-email.ts <email>');
  process.exit(1);
}

async function main() {
  await ensureSchema();

  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
    select: {
      id: true,
      nombre: true,
      email: true,
      saldo: true,
      limite: true,
      kycVerificado: true,
      aceptaTerminosCredito: true,
      creditoOfertaAplicado: true,
      marketItems: {
        orderBy: { createdAt: 'asc' },
        select: { id: true, titulo: true, precio: true, createdAt: true },
        take: 5,
      },
    },
  });

  if (!user) {
    console.log('Usuario no encontrado:', email);
    return;
  }

  console.log('ANTES:', JSON.stringify(user, null, 2));

  if (user.aceptaTerminosCredito !== true) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        aceptaTerminosCredito: true,
        terminosCreditoRespondidosAt: new Date(),
        limite: 0,
      },
    });
    console.log('→ Marcado aceptaTerminosCredito=true');
  }

  const result = await tryApplyCreditoOferta(user.id);
  console.log('→ tryApplyCreditoOferta:', result);

  const after = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      saldo: true,
      limite: true,
      aceptaTerminosCredito: true,
      creditoOfertaAplicado: true,
      creditoOfertaAplicadoAt: true,
    },
  });
  console.log('DESPUÉS:', JSON.stringify(after, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
