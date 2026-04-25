/**
 * Envío manual de email con código de 6 dígitos (misma plantilla que el flujo automático).
 *
 * Uso (desde backend/):
 *   npx tsx scripts/enviar-codigo-intercambio-manual.ts
 *   npx tsx scripts/enviar-codigo-intercambio-manual.ts --codigo 123456
 *
 * Requiere SMTP/OAuth configurado en .env
 */
import 'dotenv/config';
import { randomInt } from 'node:crypto';
import { emailService, isEmailDeliveryConfigured } from '../src/infrastructure/services/email.service.js';

async function main() {
  const args = process.argv.slice(2);
  let codigo: string | undefined;
  const rest: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--codigo' && args[i + 1]) {
      codigo = args[i + 1].replace(/\D/g, '').slice(0, 6);
      i++;
    } else {
      rest.push(args[i]);
    }
  }
  if (codigo && (codigo.length !== 6 || !/^\d{6}$/.test(codigo))) {
    console.error('El código debe ser exactamente 6 dígitos numéricos.');
    process.exit(1);
  }
  const finalCode = codigo || String(randomInt(100000, 1_000_000));

  if (!isEmailDeliveryConfigured()) {
    console.error('Falta configurar envío de email (SMTP u OAuth Gmail) en .env');
    process.exit(1);
  }

  await emailService.sendIntercambioVerificationCode({
    to: 'ezewiman@gmail.com',
    nombreDestinatario: 'Ezequiel Matias Rodriguez Wiman',
    nombreQuienAprueba: 'Hernando Vila',
    codigo: finalCode,
    acuerdoResumen:
      '25.000 IOX — acuerdo en el chat: «Acepto la propuesta de 25000 IOX. ¡Cerramos el intercambio!»',
  });

  console.log('Email enviado a ezewiman@gmail.com con código:', finalCode);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
