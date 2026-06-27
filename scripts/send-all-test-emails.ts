/**
 * Envía un ejemplo de cada plantilla de email (prueba de integración SMTP/OAuth).
 *
 * Uso (desde backend/):
 *   npm run email:test-all
 *   npm run email:test-all -- lautaro.figueroa@libertyclub.io
 */
import '../src/infrastructure/config/load-env.js';

process.env.NODE_ENV = 'production';

const to = process.argv[2]?.trim() || process.env.EMAIL_TEST_TO?.trim() || 'lautaro.figueroa@libertyclub.io';

async function main() {
  const { emailService, isEmailDeliveryConfigured } = await import(
    '../src/infrastructure/services/email.service.js'
  );
  const { NOREPLY_EMAIL } = await import('../src/infrastructure/config/email.constants.js');

  if (!isEmailDeliveryConfigured()) {
    console.error('Falta SMTP/OAuth en .env (SMTP_USER + OAuth o SMTP_PASS).');
    process.exit(1);
  }

  console.log(`Destino de prueba: ${to}`);
  console.log(`Remitente configurado: ${process.env.SMTP_FROM || process.env.SMTP_USER || NOREPLY_EMAIL}\n`);

  const steps: { label: string; run: () => Promise<void> }[] = [
    {
      label: 'MFA (código de verificación login)',
      run: () => emailService.sendMfaCode(to, '847291'),
    },
    {
      label: 'Restablecer contraseña',
      run: () =>
        emailService.sendPasswordResetLink(
          to,
          `${process.env.FRONTEND_URL?.replace(/\/$/, '') || 'https://intercambius.com.ar'}/restablecer-contrasena?token=test-token`,
          30,
        ),
    },
    {
      label: 'Bienvenida (registro)',
      run: () => emailService.sendWelcome(to, 'Lautaro (prueba)'),
    },
    {
      label: 'Login exitoso',
      run: () => emailService.sendLoginSuccess(to, 'Lautaro (prueba)'),
    },
    {
      label: 'Compra confirmada',
      run: () => emailService.sendPurchase(to, 'Lautaro (prueba)', 'Bicicleta de prueba', 15000),
    },
    {
      label: 'Venta',
      run: () => emailService.sendSale(to, 'Lautaro (prueba)', 'Bicicleta de prueba', 15000, 'Comprador Test'),
    },
    {
      label: 'Nuevo mensaje en chat',
      run: () =>
        emailService.sendNewMessage(to, 'Lautaro (prueba)', 'María Test', 'Hola, ¿seguimos con el intercambio?', 1),
    },
    {
      label: 'Formulario de contacto (inbox)',
      run: () =>
        emailService.sendContactInquiry({
          inboxTo: to,
          replyTo: 'usuario-prueba@example.com',
          nombre: 'Usuario de prueba',
          categoria: 'consulta',
          mensaje: 'Mensaje de prueba del formulario Contactanos. Si llegó, el SMTP y la plantilla están OK.',
        }),
    },
    {
      label: 'Código de intercambio',
      run: () =>
        emailService.sendIntercambioVerificationCode({
          to,
          nombreDestinatario: 'Lautaro (prueba)',
          nombreQuienAprueba: 'María Test',
          codigo: '392817',
          acuerdoResumen: '15.000 IOX — intercambio de prueba',
          conversacionId: 1,
        }),
    },
    {
      label: 'Newsletter',
      run: () =>
        emailService.sendNewsletter(
          to,
          'Lautaro (prueba)',
          'Newsletter de prueba — Intercambius',
          '<p>Este es un <strong>envío de prueba</strong> del panel admin.</p><p>Si lo ves bien formateado, la plantilla newsletter funciona.</p>',
          'Envío de prueba del newsletter de Intercambius.',
        ),
    },
  ];

  let ok = 0;
  const failed: string[] = [];

  for (const step of steps) {
    try {
      console.log(`→ ${step.label}...`);
      await step.run();
      console.log(`  ✓ ${step.label}\n`);
      ok++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  ✗ ${step.label}: ${msg}\n`);
      failed.push(`${step.label}: ${msg}`);
    }
  }

  console.log('---');
  console.log(`Enviados: ${ok}/${steps.length}`);
  if (failed.length) {
    console.error('Fallidos:');
    failed.forEach((f) => console.error(`  - ${f}`));
    process.exit(1);
  }
  console.log(`Revisá la bandeja de ${to} (y spam).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
