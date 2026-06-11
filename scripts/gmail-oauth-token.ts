/**
 * Obtiene un refresh token de Google para enviar correo por SMTP con OAuth2.
 *
 * Prerrequisitos (Google Cloud Console → Credenciales → tu cliente OAuth):
 * - Tipo: "Aplicación de escritorio" o "Aplicación web"
 * - URI de redirección autorizada: http://127.0.0.1:8787
 *   (misma que GMAIL_OAUTH_REDIRECT_URI; default 8787)
 * - Gmail API habilitada
 * - En .env: GMAIL_OAUTH_CLIENT_ID y GMAIL_OAUTH_CLIENT_SECRET
 *
 * Uso (desde backend/): npm run gmail-oauth-token
 * Autorizá con la misma cuenta que SMTP_USER (noreply@intercambius.com.ar).
 */
import '../src/infrastructure/config/load-env.js';
import http from 'node:http';
import { URL } from 'node:url';
import { OAuth2Client } from 'google-auth-library';

const clientId = process.env.GMAIL_OAUTH_CLIENT_ID?.trim();
const clientSecret = process.env.GMAIL_OAUTH_CLIENT_SECRET?.trim();
const redirectUri = process.env.GMAIL_OAUTH_REDIRECT_URI?.trim() || 'http://127.0.0.1:8787';

function redirectPort(uri: string): number {
  const u = new URL(uri);
  if (u.port) return parseInt(u.port, 10);
  return u.protocol === 'https:' ? 443 : 80;
}

function waitForAuthCode(port: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url || '/', `http://127.0.0.1:${port}`);
      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');

      if (error) {
        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<h1>Error OAuth</h1><p>${error}</p><p>Cerrá esta pestaña.</p>`);
        server.close();
        reject(new Error(`OAuth rechazado: ${error}`));
        return;
      }

      if (code) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(
          '<h1>Autorización OK</h1><p>Podés cerrar esta ventana y volver a la terminal.</p>',
        );
        server.close();
        resolve(code);
        return;
      }

      res.writeHead(404).end();
    });

    server.on('error', reject);
    server.listen(port, '127.0.0.1');
  });
}

async function main() {
  if (!clientId || !clientSecret) {
    console.error('Definí GMAIL_OAUTH_CLIENT_ID y GMAIL_OAUTH_CLIENT_SECRET en backend/.env');
    process.exit(1);
  }

  const port = redirectPort(redirectUri);
  const smtpUser = process.env.SMTP_USER?.trim() || 'noreply@intercambius.com.ar';

  console.log('\n--- OAuth Gmail (Intercambius) ---');
  console.log(`Redirect URI: ${redirectUri}`);
  console.log(
    `Si ves "redirect_uri_mismatch", agregá esa URI en Google Cloud → Credenciales → URIs de redirección autorizados.\n`,
  );
  console.log(`Iniciá sesión en el navegador con: ${smtpUser}\n`);

  const oAuth2Client = new OAuth2Client({ clientId, clientSecret, redirectUri });
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://mail.google.com/'],
  });

  const codePromise = waitForAuthCode(port);

  console.log('1) Abrí esta URL en el navegador:\n');
  console.log(authUrl);
  console.log('\n2) Esperando callback en el puerto local... (no cierres la terminal)\n');

  const code = await codePromise;

  const { tokens } = await oAuth2Client.getToken(code);
  if (!tokens.refresh_token) {
    console.error(
      'No llegó refresh_token. Revocá acceso previo en https://myaccount.google.com/permissions y repetí.',
    );
    process.exit(1);
  }

  console.log('\nAgregá a backend/.env (y en Vercel):\n');
  console.log(`GMAIL_OAUTH_REFRESH_TOKEN=${tokens.refresh_token}`);
  console.log(`\nSMTP_USER debe ser la cuenta que autorizaste (${smtpUser}).\n`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
