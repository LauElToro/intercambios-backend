/**
 * Vacía interesesQuiero (lo que me interesa / palabras clave).
 *
 * Por email(s):
 *   npx tsx scripts/clear-intereses-quiero-by-email.ts email@ejemplo.com
 *
 * Todos los usuarios con fila en UserPerfilMercado:
 *   npx tsx scripts/clear-intereses-quiero-by-email.ts --all
 */

import 'dotenv/config';
import prisma from '../src/infrastructure/database/prisma.js';

function normalizeEmail(e: string): string {
  return e.trim().toLowerCase();
}

async function main() {
  const raw = process.argv.slice(2);
  const allUsers = raw.some((a) => a === '--all');
  const emails = raw.filter((a) => a !== '--all').map(normalizeEmail).filter(Boolean);

  if (allUsers) {
    const result = await prisma.userPerfilMercado.updateMany({
      data: { interesesQuiero: [] },
    });
    console.log(
      `[ok] --all: ${result.count} perfil(es) en UserPerfilMercado con interesesQuiero=[] (usuarios sin fila de perfil no se tocan)`
    );
    return;
  }

  if (emails.length === 0) {
    console.error(
      'Uso: npx tsx scripts/clear-intereses-quiero-by-email.ts email1 [email2 ...]\n' +
        '  o: npx tsx scripts/clear-intereses-quiero-by-email.ts --all'
    );
    process.exit(1);
  }

  for (const email of emails) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, nombre: true, perfilMercado: { select: { id: true, interesesQuiero: true } } },
    });

    if (!user) {
      console.log(`[omitido] No existe usuario: ${email}`);
      continue;
    }

    const antes = user.perfilMercado?.interesesQuiero ?? [];

    await prisma.userPerfilMercado.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        interesesQuiero: [],
      },
      update: {
        interesesQuiero: [],
      },
    });

    console.log(`[ok] ${email} (${user.nombre}) — interesesQuiero antes: ${JSON.stringify(antes)} → []`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
