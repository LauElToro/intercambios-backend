import prisma from '../src/infrastructure/database/prisma.js';
import {
  acuerdoPendienteDeConfirmar,
  parseUltimoAcuerdoAceptado,
  mensajeEsAceptacionPropuesta,
} from '../src/domain/services/chatPropuesta.js';

async function main() {
  const conversacionId = Number(process.argv[2] ?? 34);
  const c = await prisma.conversacion.findUnique({ where: { id: conversacionId } });
  if (!c) {
    console.log('No existe');
    return;
  }
  const mensajes = await prisma.mensaje.findMany({
    where: { conversacionId },
    orderBy: { createdAt: 'asc' },
    select: { id: true, senderId: true, contenido: true, createdAt: true },
  });

  console.log('Conversación', c);
  console.log('\nMensajes relevantes:');
  for (const m of mensajes) {
    const t = m.contenido.trim();
    if (
      t.startsWith('{') ||
      mensajeEsAceptacionPropuesta(t) ||
      /propongo cerrar|Registro de intercambio|Código de verificación/i.test(t)
    ) {
      console.log(`[${m.createdAt.toISOString()}] #${m.senderId}: ${t.slice(0, 120)}`);
    }
  }

  const ultimo = parseUltimoAcuerdoAceptado(mensajes);
  console.log('\nÚltimo acuerdo:', ultimo);
  console.log(
    'Pendiente confirmar:',
    acuerdoPendienteDeConfirmar(ultimo, c.registroIntercambioCompletadoAt)
  );
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
