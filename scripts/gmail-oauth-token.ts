/**
 * Obtiene un refresh token de Google para enviar correo por SMTP con OAuth2 (sin contraseña de aplicación).
 *
 * Prerrequisitos:
 * 1. En Google Cloud Console: credenciales OAuth "Aplicación web" o "Escritorio".
 * 2. URI de redirección autorizada: la misma que GMAIL_OAUTH_REDIRECT_URI (default http://127.0.0.1:8787).
 * 3. En .env: GMAIL_OAUTH_CLIENT_ID y GMAIL_OAUTH_CLIENT_SECRET.
 *
 * Uso (desde backend/): npm run gmail-oauth-token
 */
import 'dotenv/config';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { OAuth2Client } from 'google-auth-library';

const clientId = process.env.GMAIL_OAUTH_CLIENT_ID?.trim();
const clientSecret = process.env.GMAIL_OAUTH_CLIENT_SECRET?.trim();
const redirectUri = process.env.GMAIL_OAUTH_REDIRECT_URI?.trim() || 'http://127.0.0.1:8787';

async function main() {
  if (!clientId || !clientSecret) {
    console.error('Definí GMAIL_OAUTH_CLIENT_ID y GMAIL_OAUTH_CLIENT_SECRET en backend/.env');
    process.exit(1);
  }

  const oAuth2Client = new OAuth2Client({ clientId, clientSecret, redirectUri });
  const url = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://mail.google.com/'],
  });

  console.log('\n1) Abrí esta URL en el navegador (sesión de la cuenta Gmail que enviará el correo):\n');
  console.log(url);
  console.log('\n2) Tras autorizar, copiá el parámetro "code" de la URL de redirección (o el código que muestre Google).\n');

  const rl = createInterface({ input, output });
  const code = (await rl.question('Pegá el código aquí: ')).trim();
  rl.close();

  if (!code) {
    console.error('Código vacío.');
    process.exit(1);
  }

  const { tokens } = await oAuth2Client.getToken(code);
  if (!tokens.refresh_token) {
    console.error(
      'No llegó refresh_token. Probá revocar acceso a la app en tu cuenta Google y repetir con prompt=consent (ya está en el script), o usá otra cuenta de prueba.',
    );
    process.exit(1);
  }

  console.log('\nAgregá a backend/.env (y en Vercel):\n');
  console.log(`GMAIL_OAUTH_REFRESH_TOKEN=${tokens.refresh_token}`);
  console.log('\nSMTP_USER debe ser el mismo email de la cuenta que autorizó.\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
