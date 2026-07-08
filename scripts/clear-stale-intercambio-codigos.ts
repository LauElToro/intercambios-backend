import prisma from '../src/infrastructure/database/prisma.js';
import {
  acuerdoPendienteDeConfirmar,
  parseUltimoAcuerdoAceptado,
} from '../src/domain/services/chatPropuesta.js';

/** Limpia códigos huérfanos solo si el último acuerdo ya fue confirmado. */
async function main() {
  const conversaciones = await prisma.conversacion.findMany({
    where: {
      registroIntercambioCompletadoAt: { not: null },
      intercambioCodigo: { not: null },
    },
    select: {
      id: true,
      registroIntercambioCompletadoAt: true,
      mensajes: {
        orderBy: { createdAt: 'asc' },
        select: { senderId: true, contenido: true, createdAt: true },
      },
    },
  });

  let limpiados = 0;
  for (const c of conversaciones) {
    const ultimo = parseUltimoAcuerdoAceptado(
      c.mensajes.map((m) => ({ ...m, createdAt: m.createdAt }))
    );
    if (acuerdoPendienteDeConfirmar(ultimo, c.registroIntercambioCompletadoAt)) {
      continue;
    }
    await prisma.conversacion.update({
      where: { id: c.id },
      data: { intercambioCodigo: null, intercambioCodigoExpiresAt: null },
    });
    limpiados++;
  }
  console.log(`Códigos limpiados en ${limpiados} conversación(es).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
