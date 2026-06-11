# Gmail con OAuth 2.0 (envío desde la API)

Este backend de Intercambius vive en otro repo (p. ej. Vercel). Acá tenés lo necesario para **reemplazar SMTP + contraseña de aplicación** por **OAuth 2.0** con la cuenta `intercambius.info@gmail.com`.

## 1. Google Cloud Console

1. Creá o elegí un proyecto.
2. **APIs y servicios → Biblioteca** → habilitá **Gmail API**.
3. **Pantalla de consentimiento OAuth**: tipo Externa o Interna; en “Ámbitos” agregá  
   `https://www.googleapis.com/auth/gmail.send`  
   (envío solamente; si necesitás leer bandeja, usá otro scope y revisá verificación de Google).
4. **Credenciales → Crear credenciales → ID de cliente OAuth**  
   - Tipo **Aplicación de escritorio** (recomendado para el script), **o** Web con URI de redirección exacta:  
     `http://127.0.0.1:34567/oauth2callback`  
   - Copiá **ID de cliente** y **Secreto del cliente**.

## 2. Obtener `GOOGLE_REFRESH_TOKEN` (una vez)

En esta carpeta:

```bash
cd backend/email
npm install
set GOOGLE_CLIENT_ID=tu_id.apps.googleusercontent.com
set GOOGLE_CLIENT_SECRET=tu_secreto
npm run obtain-token
```

(Ajustá `set` → `export` en macOS/Linux.)

Abrí la URL que imprime el script, iniciá sesión con **intercambius.info@gmail.com** y aceptá permisos. Al volver a localhost, la terminal mostrará:

`GOOGLE_REFRESH_TOKEN=...`

Guardalo en el `.env` del servidor junto con `GMAIL_USER`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.

## 3. Integrar en Node (tu API)

Copiá `gmail-oauth-mail.ts` al proyecto del backend o importalo por path. Ejemplo:

```ts
import {
  createGmailOAuthTransport,
  readGmailOAuthEnv,
} from "./gmail-oauth-mail";

const oauth = readGmailOAuthEnv(process.env);
if (!oauth) throw new Error("Faltan variables Gmail OAuth");
const mailer = createGmailOAuthTransport(oauth);

await mailer.sendMail({
  from: `"Intercambius" <${oauth.gmailUser}>`,
  to: destinatario,
  subject: "Asunto",
  text: "Cuerpo",
});
```

## 4. Producción

- El modo **Prueba** de la pantalla de consentimiento limita usuarios; para el público hay que **publicar** la app y, si Google lo pide, completar verificación del scope `gmail.send`.
- Rotá `GOOGLE_CLIENT_SECRET` y `GOOGLE_REFRESH_TOKEN` si se filtran; revocá accesos en la cuenta de Google.
