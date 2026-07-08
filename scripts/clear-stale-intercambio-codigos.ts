import prisma from '../src/infrastructure/database/prisma.js';

/** Limpia códigos huérfanos en conversaciones ya confirmadas. */
async function main() {
  const result = await prisma.conversacion.updateMany({
    where: {
      registroIntercambioCompletadoAt: { not: null },
      intercambioCodigo: { not: null },
    },
    data: {
      intercambioCodigo: null,
      intercambioCodigoExpiresAt: null,
    },
  });
  console.log(`Códigos limpiados en ${result.count} conversación(es).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
