import nodemailer from 'nodemailer';

function trimEnv(v: string | undefined): string | undefined {
  if (v == null) return undefined;
  const t = v.replace(/^["']|["']$/g, '').trim();
  return t || undefined;
}

const SMTP_USER = trimEnv(process.env.SMTP_USER);
const SMTP_PASS = trimEnv(process.env.SMTP_PASS);
const GMAIL_OAUTH_CLIENT_ID = trimEnv(process.env.GMAIL_OAUTH_CLIENT_ID);
const GMAIL_OAUTH_CLIENT_SECRET = trimEnv(process.env.GMAIL_OAUTH_CLIENT_SECRET);
const GMAIL_OAUTH_REFRESH_TOKEN = trimEnv(process.env.GMAIL_OAUTH_REFRESH_TOKEN);

const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
const LOGO_URL = process.env.LOGO_URL || `${FRONTEND_URL}/logo-intercambius.png`;

function usesGmailOAuth(): boolean {
  return Boolean(
    SMTP_USER && GMAIL_OAUTH_CLIENT_ID && GMAIL_OAUTH_CLIENT_SECRET && GMAIL_OAUTH_REFRESH_TOKEN,
  );
}

function createTransporter(): nodemailer.Transporter {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  if (usesGmailOAuth()) {
    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        type: 'OAuth2',
        user: SMTP_USER,
        clientId: GMAIL_OAUTH_CLIENT_ID,
        clientSecret: GMAIL_OAUTH_CLIENT_SECRET,
        refreshToken: GMAIL_OAUTH_REFRESH_TOKEN,
      },
    });
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  });
}

const transporter = createTransporter();

/** Correo habilitado con OAuth2 (recomendado Gmail) o con SMTP_USER + SMTP_PASS (otros proveedores / legado). */
function isMailConfigured(): boolean {
  if (!SMTP_USER) return false;
  if (usesGmailOAuth()) return true;
  return Boolean(SMTP_PASS);
}

/** Expuesto para flujos que requieren envío real (p. ej. código de intercambio). */
export function isEmailDeliveryConfigured(): boolean {
  return isMailConfigured();
}

const FROM = process.env.SMTP_FROM || SMTP_USER || '"Intercambius" <Intercambius.info@gmail.com>';
const APP_NAME = 'Intercambius';

function safeSend(mailOptions: nodemailer.SendMailOptions): Promise<void> {
  if (!isMailConfigured()) {
    console.log('[EMAIL] Sin SMTP configurado (OAuth2 o SMTP_PASS), no se envía:', mailOptions.to, mailOptions.subject);
    return Promise.resolve();
  }
  return transporter
    .sendMail(mailOptions)
    .then(() => {})
    .catch((err) => {
      console.error('[EMAIL] Error enviando:', mailOptions.subject, err.message);
      if (process.env.NODE_ENV === 'production') throw err;
    });
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Plantilla base: cabecera con logo dorado sobre fondo oscuro, cuerpo y pie */
function emailLayout(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${APP_NAME}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4;">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
          <tr>
            <td style="background: linear-gradient(180deg, #1a1a1a 0%, #2d2d2d 100%); padding: 32px 24px; text-align: center;">
              <img src="${LOGO_URL}" alt="${APP_NAME}" width="200" height="auto" style="display: block; margin: 0 auto; max-width: 200px; height: auto;" />
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 28px; color: #333333; font-size: 16px; line-height: 1.6;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 28px; border-top: 1px solid #eeeeee; text-align: center; color: #888888; font-size: 13px;">
              <p style="margin: 0 0 4px 0;">Intercambius — El club de confianza</p>
              <p style="margin: 0;"><a href="${FRONTEND_URL}" style="color: #b8860b; text-decoration: none;">${FRONTEND_URL.replace(/^https?:\/\//, '')}</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

const btnStyle = 'display: inline-block; padding: 14px 28px; background-color: #b8860b; color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;';

export const emailService = {
  async sendMfaCode(to: string, code: string): Promise<void> {
    const content = `
      <p style="margin: 0 0 24px 0; font-size: 18px; color: #1a1a1a;">Hola,</p>
      <p style="margin: 0 0 20px 0;">Tu código de verificación para iniciar sesión es:</p>
      <p style="margin: 0 0 24px 0; font-size: 28px; letter-spacing: 10px; font-weight: 700; color: #b8860b;">${code}</p>
      <p style="margin: 0; color: #666666; font-size: 14px;">Válido por 10 minutos. No lo compartas con nadie.</p>
    `;
    await safeSend({
      from: FROM,
      to,
      subject: `Tu código de verificación — ${APP_NAME}`,
      html: emailLayout(content),
      text: `Tu código de verificación es: ${code}. Válido por 10 minutos.`,
    });
  },

  async sendPasswordResetLink(to: string, resetLink: string, expiresMinutes: number): Promise<void> {
    const content = `
      <p style="margin: 0 0 20px 0;">Solicitaste restablecer tu contraseña.</p>
      <p style="margin: 0 0 24px 0;">Hacé clic en el botón para elegir una nueva contraseña:</p>
      <p style="margin: 0 0 24px 0;"><a href="${resetLink}" style="${btnStyle}">Restablecer contraseña</a></p>
      <p style="margin: 0; color: #666666; font-size: 14px;">El enlace expira en ${expiresMinutes} minutos. Si no solicitaste esto, ignorá este correo.</p>
    `;
    await safeSend({
      from: FROM,
      to,
      subject: `Restablecer contraseña — ${APP_NAME}`,
      html: emailLayout(content),
      text: `Restablecé tu contraseña en: ${resetLink}. Expira en ${expiresMinutes} minutos.`,
    });
  },

  async sendWelcome(to: string, nombre: string): Promise<void> {
    const content = `
      <p style="margin: 0 0 24px 0; font-size: 18px; color: #1a1a1a;">¡Hola ${escapeHtml(nombre)}!</p>
      <p style="margin: 0 0 20px 0;">Tu cuenta en <strong>${APP_NAME}</strong> fue creada correctamente. Ya podés explorar el market, publicar lo que ofrecés y conectarte con la comunidad.</p>
      <p style="margin: 0 0 24px 0;"><a href="${FRONTEND_URL}/market" style="${btnStyle}">Ver el market</a></p>
      <p style="margin: 0; color: #666666; font-size: 14px;">Si no creaste esta cuenta, podés ignorar este mensaje.</p>
    `;
    await safeSend({
      from: FROM,
      to,
      subject: `Bienvenido a ${APP_NAME}`,
      html: emailLayout(content),
      text: `Hola ${nombre}, bienvenido a ${APP_NAME}. Explorá el market en ${FRONTEND_URL}/market`,
    });
  },

  async sendLoginSuccess(to: string, nombre: string): Promise<void> {
    const content = `
      <p style="margin: 0 0 24px 0; font-size: 18px; color: #1a1a1a;">Hola ${escapeHtml(nombre)},</p>
      <p style="margin: 0 0 20px 0;">Se inició sesión en tu cuenta correctamente. Si fuiste vos, no tenés que hacer nada.</p>
      <p style="margin: 0; color: #666666; font-size: 14px;">Si no fuiste vos, te recomendamos cambiar tu contraseña desde tu perfil.</p>
    `;
    await safeSend({
      from: FROM,
      to,
      subject: `Inicio de sesión en ${APP_NAME}`,
      html: emailLayout(content),
      text: `Se inició sesión en tu cuenta de ${APP_NAME}.`,
    });
  },

  async sendPurchase(to: string, nombre: string, tituloProducto: string, precio: number): Promise<void> {
    const content = `
      <p style="margin: 0 0 24px 0; font-size: 18px; color: #1a1a1a;">Hola ${escapeHtml(nombre)},</p>
      <p style="margin: 0 0 16px 0;">Tu compra fue confirmada:</p>
      <p style="margin: 0 0 8px 0; font-size: 17px;"><strong>${escapeHtml(tituloProducto)}</strong></p>
      <p style="margin: 0 0 24px 0; color: #b8860b; font-weight: 600;">${precio} IX</p>
      <p style="margin: 0 0 24px 0;"><a href="${FRONTEND_URL}/chat" style="${btnStyle}">Ir al chat para coordinar</a></p>
    `;
    await safeSend({
      from: FROM,
      to,
      subject: `Compra confirmada: ${tituloProducto} — ${APP_NAME}`,
      html: emailLayout(content),
      text: `Compra confirmada: ${tituloProducto} (${precio} IX). Coordiná la entrega por chat en ${FRONTEND_URL}/chat`,
    });
  },

  async sendSale(to: string, nombreVendedor: string, tituloProducto: string, precio: number, nombreComprador: string): Promise<void> {
    const content = `
      <p style="margin: 0 0 24px 0; font-size: 18px; color: #1a1a1a;">Hola ${escapeHtml(nombreVendedor)},</p>
      <p style="margin: 0 0 16px 0;"><strong>${escapeHtml(nombreComprador)}</strong> compró tu publicación:</p>
      <p style="margin: 0 0 8px 0; font-size: 17px;"><strong>${escapeHtml(tituloProducto)}</strong></p>
      <p style="margin: 0 0 24px 0; color: #b8860b; font-weight: 600;">${precio} IX</p>
      <p style="margin: 0 0 24px 0;"><a href="${FRONTEND_URL}/chat" style="${btnStyle}">Ir al chat para coordinar</a></p>
    `;
    await safeSend({
      from: FROM,
      to,
      subject: `Venta: ${tituloProducto} — ${APP_NAME}`,
      html: emailLayout(content),
      text: `${nombreComprador} compró "${tituloProducto}" (${precio} IX). Coordiná por chat en ${FRONTEND_URL}/chat`,
    });
  },

  async sendNewMessage(to: string, nombreDestinatario: string, nombreRemitente: string, contenidoPreview: string, conversacionId: number): Promise<void> {
    const chatLink = `${FRONTEND_URL}/chat/${conversacionId}`;
    const content = `
      <p style="margin: 0 0 24px 0; font-size: 18px; color: #1a1a1a;">Hola ${escapeHtml(nombreDestinatario)},</p>
      <p style="margin: 0 0 16px 0;"><strong>${escapeHtml(nombreRemitente)}</strong> te envió un mensaje:</p>
      <p style="margin: 0 0 24px 0; background-color: #f8f8f8; padding: 16px; border-radius: 8px; border-left: 4px solid #b8860b;">${escapeHtml(contenidoPreview)}</p>
      <p style="margin: 0 0 24px 0;"><a href="${chatLink}" style="${btnStyle}">Ver conversación</a></p>
    `;
    const textPreview = contenidoPreview.replace(/<[^>]*>/g, '').slice(0, 120);
    await safeSend({
      from: FROM,
      to,
      subject: `${nombreRemitente} te escribió — ${APP_NAME}`,
      html: emailLayout(content),
      text: `${nombreRemitente}: ${textPreview}... Ver en ${chatLink}`,
    });
  },

  /** Mensaje desde el formulario web (quejas / sugerencias). Incluye adjuntos opcionales. */
  async sendContactInquiry(params: {
    inboxTo: string;
    replyTo: string;
    nombre?: string;
    categoria: string;
    mensaje: string;
    attachments?: { filename: string; content: Buffer; contentType?: string }[];
  }): Promise<void> {
    const { replyTo, nombre, categoria, mensaje, inboxTo, attachments } = params;
    const subject = `[Contacto web — ${categoria}] ${APP_NAME}`;
    const bodyText = [
      `Tipo: ${categoria}`,
      `Email (respuesta): ${replyTo}`,
      nombre ? `Nombre: ${nombre}` : null,
      '',
      mensaje,
    ]
      .filter(Boolean)
      .join('\n');
    const content = `
      <p style="margin: 0 0 16px 0; font-size: 15px; color: #1a1a1a;"><strong>Nuevo mensaje</strong> desde el formulario de contacto.</p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%; font-size: 14px; color: #333;">
        <tr><td style="padding: 6px 0; color:#666;">Tipo</td><td style="padding: 6px 0;"><strong>${escapeHtml(categoria)}</strong></td></tr>
        <tr><td style="padding: 6px 0; color:#666;">Email</td><td style="padding: 6px 0;"><a href="mailto:${escapeHtml(replyTo)}">${escapeHtml(replyTo)}</a></td></tr>
        ${nombre ? `<tr><td style="padding: 6px 0; color:#666;">Nombre</td><td style="padding: 6px 0;">${escapeHtml(nombre)}</td></tr>` : ''}
      </table>
      <p style="margin: 20px 0 8px 0; font-weight: 600;">Mensaje</p>
      <div style="background: #f8f8f8; padding: 16px; border-radius: 8px; border-left: 4px solid #b8860b; white-space: pre-wrap;">${escapeHtml(mensaje)}</div>
      ${attachments?.length ? `<p style="margin: 16px 0 0 0; font-size: 13px; color: #666;">Adjuntos: ${attachments.length} archivo(s).</p>` : ''}
    `;
    await safeSend({
      from: FROM,
      to: inboxTo,
      replyTo,
      subject,
      html: emailLayout(content),
      text: bodyText,
      attachments: attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType,
      })),
    });
  },

  /** Código de verificación para registrar intercambio (quien aprobó envía al otro vía plataforma). */
  async sendIntercambioVerificationCode(params: {
    to: string;
    nombreDestinatario: string;
    nombreQuienAprueba: string;
    codigo: string;
  }): Promise<void> {
    const { to, nombreDestinatario, nombreQuienAprueba, codigo } = params;
    const registroUrl = `${FRONTEND_URL}/registrar-intercambio`;
    const aviso = `Solo entregá este código cuando te encuentres con la otra parte y/o recibas el producto.`;
    const content = `
      <p style="margin: 0 0 16px 0; font-size: 18px; color: #1a1a1a;">Hola ${escapeHtml(nombreDestinatario)},</p>
      <p style="margin: 0 0 12px 0;">${escapeHtml(nombreQuienAprueba)} aprobó el intercambio. Tu código de verificación para <strong>Registrar intercambio</strong> es:</p>
      <p style="margin: 0 0 20px 0; font-size: 28px; letter-spacing: 8px; font-weight: 700; color: #b8860b;">${escapeHtml(codigo)}</p>
      <p style="margin: 0 0 16px 0; padding: 12px 14px; background: #fff8e6; border-left: 4px solid #b8860b; border-radius: 6px; font-size: 14px; color: #333;">${escapeHtml(aviso)}</p>
      <p style="margin: 0 0 20px 0;"><a href="${registroUrl}" style="${btnStyle}">Ir a registrar intercambio</a></p>
      <p style="margin: 0; color: #666666; font-size: 14px;">Si no reconocés este intercambio, ignorá este correo.</p>
    `;
    await safeSend({
      from: FROM,
      to,
      subject: `Código de verificación — ${APP_NAME}`,
      html: emailLayout(content),
      text: `Hola ${nombreDestinatario}, ${nombreQuienAprueba} aprobó el intercambio. Código: ${codigo}. ${aviso} Registrá en ${registroUrl}`,
    });
  },

  async sendNewsletter(to: string, nombre: string, subject: string, bodyHtml: string, bodyText?: string): Promise<void> {
    const content = `
      <p style="margin: 0 0 20px 0; font-size: 18px; color: #1a1a1a;">Hola ${escapeHtml(nombre)},</p>
      <div style="margin: 0 0 24px 0;">${bodyHtml}</div>
      <p style="margin: 0; color: #666666; font-size: 14px;">— El equipo de ${APP_NAME}</p>
    `;
    await safeSend({
      from: FROM,
      to,
      subject,
      html: emailLayout(content),
      text: bodyText || bodyHtml.replace(/<[^>]*>/g, '').slice(0, 500),
    });
  },
};
