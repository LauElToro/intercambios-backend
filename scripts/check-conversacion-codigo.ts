import prisma from '../src/infrastructure/database/prisma.js';

async function main() {
  const email = process.argv[2] ?? 'ezewiman';
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { email: { contains: email, mode: 'insensitive' } },
        { nombre: { contains: 'Ezequiel', mode: 'insensitive' } },
      ],
    },
    select: { id: true, nombre: true, email: true, saldo: true },
  });
  console.log('Usuarios:', users);

  for (const u of users) {
    const convs = await prisma.conversacion.findMany({
      where: { OR: [{ compradorId: u.id }, { vendedorId: u.id }] },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      select: {
        id: true,
        compradorId: true,
        vendedorId: true,
        marketItemId: true,
        intercambioCodigo: true,
        intercambioCodigoExpiresAt: true,
        registroIntercambioCompletadoAt: true,
        updatedAt: true,
      },
    });
    console.log(`\nConversaciones de ${u.nombre} (#${u.id}):`);
    for (const c of convs) {
      const intercambios = await prisma.intercambio.findMany({
        where: { conversacionId: c.id },
        orderBy: { createdAt: 'desc' },
        select: { id: true, creditos: true, descripcion: true, createdAt: true },
      });
      console.log(JSON.stringify({ ...c, intercambios }, null, 2));
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
