/**
 * Verifica OAuth Gmail (refresh token + access token) sin enviar correo.
 * Uso: npm run email:verify-oauth
 */
import '../src/infrastructure/config/load-env.js';
import { OAuth2Client } from 'google-auth-library';

const clientId = process.env.GMAIL_OAUTH_CLIENT_ID?.trim();
const clientSecret = process.env.GMAIL_OAUTH_CLIENT_SECRET?.trim();
const refreshToken = process.env.GMAIL_OAUTH_REFRESH_TOKEN?.trim();
const smtpUser = process.env.SMTP_USER?.trim();

async function main() {
  if (!clientId || !clientSecret || !refreshToken) {
    console.error('\nFaltan GMAIL_OAUTH_CLIENT_ID, GMAIL_OAUTH_CLIENT_SECRET o GMAIL_OAUTH_REFRESH_TOKEN.');
    process.exit(1);
  }

  console.log('SMTP_USER (.env):', smtpUser || '(vacío)');
  const winSmtp = process.env.SMTP_USER;
  if (smtpUser && winSmtp && smtpUser !== winSmtp) {
    console.warn('⚠ SMTP_USER del sistema difiere del .env — load-env debería haber aplicado override.');
  }
  console.log('Tip: SMTP_USER debe ser la misma cuenta con la que autorizás OAuth (noreply@intercambius.com.ar).\n');

  const client = new OAuth2Client(clientId, clientSecret);
  client.setCredentials({ refresh_token: refreshToken });

  try {
    const { token } = await client.getAccessToken();
    if (!token) {
      console.error('\nOAuth respondió sin access token. Regenerá el refresh token: npm run gmail-oauth-token');
      process.exit(1);
    }
    console.log('\n✓ Access token OAuth OK');
    console.log('  Próximo paso: npm run email:test-all -- tu@email.com');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('\n✗ OAuth falló:', msg);
    console.error('\nSolución:');
    console.error('  1. Revocá acceso previo en https://myaccount.google.com/permissions');
    console.error('  2. cd backend && npm run gmail-oauth-token');
    console.error('  3. Iniciá sesión con noreply@intercambius.com.ar (la misma que SMTP_USER)');
    console.error('  4. Copiá GMAIL_OAUTH_REFRESH_TOKEN a backend/.env y Vercel (proyecto backend)');
    process.exit(1);
  }
}

main();
