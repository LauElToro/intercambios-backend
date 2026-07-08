import prisma from '../src/infrastructure/database/prisma.js';

async function main() {
  const rows = await prisma.intercambio.findMany({
    where: {
      OR: [
        { descripcion: { contains: 'MOUSE', mode: 'insensitive' } },
        { creditos: { in: [-1500, 1500] } },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      id: true,
      usuarioId: true,
      otraPersonaId: true,
      creditos: true,
      descripcion: true,
      conversacionId: true,
      marketItemId: true,
      createdAt: true,
    },
  });
  console.log('Intercambios:', JSON.stringify(rows, null, 2));

  for (const row of rows) {
    const u1 = await prisma.user.findUnique({
      where: { id: row.usuarioId },
      select: { id: true, nombre: true, saldo: true, kycVerificado: true },
    });
    const u2 = await prisma.user.findUnique({
      where: { id: row.otraPersonaId },
      select: { id: true, nombre: true, saldo: true, kycVerificado: true },
    });
    console.log(`Intercambio #${row.id}: pagador(usuarioId)=`, u1, 'receptor(otraPersonaId)=', u2);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
