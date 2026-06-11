/**
 * Script único: obtiene GOOGLE_REFRESH_TOKEN con flujo OAuth en localhost.
 *
 * Requisitos:
 * 1. Google Cloud: proyecto con "Gmail API" habilitada.
 * 2. Pantalla de consentimiento OAuth (externa o interna) con scope de Gmail.
 * 3. Credencial "ID de cliente OAuth" tipo Escritorio o Web; en Web agregá la URI de redirección exacta de abajo.
 *
 * Uso:
 *   export GOOGLE_CLIENT_ID=...
 *   export GOOGLE_CLIENT_SECRET=...
 *   npm run obtain-token
 *
 * Copiá GOOGLE_REFRESH_TOKEN al .env del servidor (y nunca lo subas al repo).
 */
import { google } from "googleapis";
import http from "http";
import { URL } from "url";

const PORT = 34567;
const REDIRECT_PATH = "/oauth2callback";
const REDIRECT_URI = `http://127.0.0.1:${PORT}${REDIRECT_PATH}`;
const SCOPES = ["https://www.googleapis.com/auth/gmail.send"];

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error("Definí GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en el entorno.");
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: SCOPES,
});

console.log("\n1) En Google Cloud → Credenciales → tu cliente OAuth, agregá esta URI de redirección autorizada:\n");
console.log("   ", REDIRECT_URI);
console.log("\n2) Abrí en el navegador:\n\n", authUrl, "\n");

const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url || "/", `http://127.0.0.1:${PORT}`);
    if (u.pathname !== REDIRECT_PATH) {
      res.writeHead(404);
      res.end();
      return;
    }
    const code = u.searchParams.get("code");
    const err = u.searchParams.get("error");
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(
      "<p>Listo. Podés cerrar esta ventana y volver a la terminal.</p>",
    );
    server.close();

    if (err) {
      console.error("OAuth error:", err);
      process.exit(1);
    }
    if (!code) {
      console.error("No llegó ?code= en la URL.");
      process.exit(1);
    }

    const { tokens } = await oauth2Client.getToken(code);
    if (!tokens.refresh_token) {
      console.error(
        "\nNo se recibió refresh_token. Probá de nuevo tras borrar acceso de la app en myaccount.google.com/permissions o usando prompt=consent (ya está en el script).",
      );
      process.exit(1);
    }

    console.log("\n--- Añadí al .env del backend ---\n");
    console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}\n`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
});

server.listen(PORT, "127.0.0.1", () => {});
