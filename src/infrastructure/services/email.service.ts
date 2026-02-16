import nodemailer from 'nodemailer';

const SMTP_PASS = process.env.SMTP_PASS?.replace(/^["']|["']$/g, '').trim() || process.env.SMTP_PASS;
const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
const LOGO_URL = process.env.LOGO_URL || `${FRONTEND_URL}/logo-intercambius.png`;

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true',
  auth: process.env.SMTP_USER
    ? { user: process.env.SMTP_USER, pass: SMTP_PASS }
    : undefined,
});

const FROM = process.env.SMTP_FROM || process.env.SMTP_USER || '"Intercambius" <noreply@intercambius.com>';
const APP_NAME = 'Intercambius';

function safeSend(mailOptions: nodemailer.SendMailOptions): Promise<void> {
  if (!process.env.SMTP_USER) {
    console.log('[EMAIL] Sin SMTP_USER, no se envía:', mailOptions.to, mailOptions.subject);
    return Promise.resolve();
  }
  return transporter.sendMail(mailOptions).catch((err) => {
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
