import 'dotenv/config';
import prisma from '../src/infrastructure/database/prisma.js';

function normalizeEmail(e: string): string {
  return e.trim().toLowerCase();
}

async function main() {
  const emails = process.argv.slice(2).map(normalizeEmail).filter(Boolean);
  if (emails.length === 0) {
    console.error('Uso: npm run kyc:approve -- email1 email2 ...');
    process.exit(1);
  }

  const now = new Date();
  const results: Array<{ email: string; updated: number; found: boolean }> = [];

  for (const email of emails) {
    const found = await prisma.user.findUnique({ where: { email }, select: { id: true, kycVerificado: true } });
    if (!found) {
      results.push({ email, updated: 0, found: false });
      continue;
    }

    const r = await prisma.user.update({
      where: { email },
      data: {
        kycVerificado: true,
        kycVerificadoAt: now,
      },
      select: { id: true },
    });

    results.push({ email, updated: r.id ? 1 : 0, found: true });
  }

  const ok = results.filter((r) => r.found).map((r) => r.email);
  const missing = results.filter((r) => !r.found).map((r) => r.email);

  console.log('\nKYC aprobado en DB para:', ok.length ? ok.join(', ') : '(ninguno)');
  if (missing.length) console.log('No encontrados:', missing.join(', '));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
