import nodemailer from 'nodemailer';
import { OAuth2Client } from 'google-auth-library';
import { BRAND_LOGO_URL, DEFAULT_SMTP_FROM, NOREPLY_EMAIL } from '../config/email.constants.js';
import { EmailDeliveryError } from './email.errors.js';
import {
  emailButton,
  emailCallout,
  emailCode,
  emailGreeting,
  emailHighlightCard,
  emailKeyValueTable,
  emailLayout,
  emailMuted,
  emailParagraph,
  emailQuote,
  escapeHtml,
} from './email-templates.js';

function trimEnv(v: string | undefined): string | undefined {
  if (v == null) return undefined;
  const t = v.replace(/^["']|["']$/g, '').trim();
  return t || undefined;
}

function env(name: string): string | undefined {
  return trimEnv(process.env[name]);
}

const FRONTEND_URL = (env('FRONTEND_URL') || 'http://localhost:5173').replace(/\/$/, '');
const LOGO_URL = env('LOGO_URL') || BRAND_LOGO_URL;

function smtpUser(): string | undefined {
  return env('SMTP_USER');
}

function smtpPass(): string | undefined {
  return env('SMTP_PASS');
}

function gmailOAuthClientId(): string | undefined {
  return env('GMAIL_OAUTH_CLIENT_ID');
}

function gmailOAuthClientSecret(): string | undefined {
  return env('GMAIL_OAUTH_CLIENT_SECRET');
}

function gmailOAuthRefreshToken(): string | undefined {
  return env('GMAIL_OAUTH_REFRESH_TOKEN');
}

function usesGmailOAuth(): boolean {
  return Boolean(
    smtpUser() &&
      gmailOAuthClientId() &&
      gmailOAuthClientSecret() &&
      gmailOAuthRefreshToken(),
  );
}

function isMailConfigured(): boolean {
  const user = smtpUser();
  if (!user) return false;
  if (usesGmailOAuth()) return true;
  return Boolean(smtpPass());
}

/** Expuesto para flujos que requieren envío real (p. ej. código de intercambio). */
export function isEmailDeliveryConfigured(): boolean {
  return isMailConfigured();
}

export interface EmailDeliveryStatus {
  configured: boolean;
  mode: 'oauth' | 'password' | 'none';
  smtpUser: string | null;
  oauthTokenOk: boolean | null;
  error: string | null;
}

/** Diagnóstico (p. ej. GET /api/health/email) sin enviar correo. */
export async function checkEmailDeliveryStatus(): Promise<EmailDeliveryStatus> {
  const mode = usesGmailOAuth() ? 'oauth' : smtpPass() ? 'password' : 'none';
  const base: EmailDeliveryStatus = {
    configured: isMailConfigured(),
    mode,
    smtpUser: smtpUser() ?? null,
    oauthTokenOk: null,
    error: null,
  };

  if (!base.configured) {
    return {
      ...base,
      error: 'Faltan SMTP_USER + OAuth (GMAIL_OAUTH_*) o SMTP_PASS en variables de entorno.',
    };
  }

  if (mode !== 'oauth') {
    return base;
  }

  try {
    await getGmailAccessToken();
    return { ...base, oauthTokenOk: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ...base, oauthTokenOk: false, error: msg };
  }
}

const FROM = () => env('SMTP_FROM') || smtpUser() || DEFAULT_SMTP_FROM;
const APP_NAME = 'Intercambius';

let oauth2Client: OAuth2Client | null = null;

function getOAuth2Client(): OAuth2Client {
  const clientId = gmailOAuthClientId();
  const clientSecret = gmailOAuthClientSecret();
  const refreshToken = gmailOAuthRefreshToken();
  if (!clientId || !clientSecret || !refreshToken) {
    throw new EmailDeliveryError('Faltan credenciales OAuth de Gmail en el servidor.');
  }
  if (!oauth2Client) {
    oauth2Client = new OAuth2Client(clientId, clientSecret);
    oauth2Client.setCredentials({ refresh_token: refreshToken });
  }
  return oauth2Client;
}

async function getGmailAccessToken(): Promise<string> {
  try {
    const client = getOAuth2Client();
    const { token } = await client.getAccessToken();
    if (!token) {
      throw new EmailDeliveryError(
        'No se pudo renovar el token OAuth de Gmail. Regenerá GMAIL_OAUTH_REFRESH_TOKEN con npm run gmail-oauth-token (cuenta noreply@).',
      );
    }
    return token;
  } catch (err) {
    if (err instanceof EmailDeliveryError) throw err;
    const msg = err instanceof Error ? err.message : String(err);
    throw new EmailDeliveryError(
      `OAuth Gmail rechazado (${msg}). Verificá que el refresh token sea de noreply@intercambius.com.ar y que esté en Vercel.`,
      err,
    );
  }
}

async function createTransporter(): Promise<nodemailer.Transporter> {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  if (usesGmailOAuth()) {
    const accessToken = await getGmailAccessToken();
    const user = smtpUser();
    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        type: 'OAuth2',
        user,
        clientId: gmailOAuthClientId(),
        clientSecret: gmailOAuthClientSecret(),
        refreshToken: gmailOAuthRefreshToken(),
        accessToken,
      },
    });
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: smtpUser() && smtpPass() ? { user: smtpUser(), pass: smtpPass() } : undefined,
  });
}

function assertMailConfigured(): void {
  if (!isMailConfigured()) {
    throw new EmailDeliveryError(
      'Correo no configurado en el servidor (SMTP_USER + OAuth o SMTP_PASS). Contactá soporte.',
    );
  }
}

/** Envío obligatorio: falla en voz alta si no hay SMTP o el proveedor rechaza el mail. */
async function sendRequired(mailOptions: nodemailer.SendMailOptions): Promise<void> {
  assertMailConfigured();
  try {
    const transporter = await createTransporter();
    await transporter.sendMail(mailOptions);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[EMAIL] Error enviando:', mailOptions.subject, msg);
    if (err instanceof EmailDeliveryError) throw err;
    throw new EmailDeliveryError(
      msg.includes('535') || msg.includes('BadCredentials')
        ? 'Gmail rechazó las credenciales OAuth. Regenerá el token con noreply@intercambius.com.ar.'
        : `No se pudo enviar el correo: ${msg}`,
      err,
    );
  }
}

/** Envío best-effort (bienvenida, notificaciones). */
function sendOptional(mailOptions: nodemailer.SendMailOptions): Promise<void> {
  if (!isMailConfigured()) {
    console.warn('[EMAIL] Sin SMTP configurado, omitiendo:', mailOptions.subject, '→', mailOptions.to);
    return Promise.resolve();
  }
  return sendRequired(mailOptions).catch((err) => {
    console.error('[EMAIL] Error enviando (no crítico):', mailOptions.subject, err instanceof Error ? err.message : err);
  });
}

function wrapEmail(content: string): string {
  return emailLayout(content, FRONTEND_URL, LOGO_URL);
}

export const emailService = {
  async sendMfaCode(to: string, code: string): Promise<void> {
    const masked = to.replace(/^(.{2}).*(@.*)$/, '$1***$2');
    console.log(`[EMAIL] Enviando MFA a ${masked}`);
    const content = [
      emailGreeting('usuario', 'Usá este código para completar tu inicio de sesión.'),
      emailCode(code, 'Código de verificación'),
      emailMuted('Válido por 10 minutos. No lo compartas con nadie.'),
    ].join('');
    await sendRequired({
      from: FROM(),
      to,
      subject: `Tu código de verificación — ${APP_NAME}`,
      html: wrapEmail(content),
      text: `Tu código de verificación es: ${code}. Válido por 10 minutos.`,
    });
    console.log(`[EMAIL] MFA enviado OK a ${masked}`);
  },

  /** Prueba de entrega real (solo diagnóstico protegido). */
  async sendMfaTest(to: string): Promise<void> {
    await this.sendMfaCode(to, '847291');
  },

  async sendPasswordResetLink(to: string, resetLink: string, expiresMinutes: number): Promise<void> {
    const content = [
      emailGreeting('usuario', 'Recibimos una solicitud para restablecer tu contraseña.'),
      emailParagraph('Hacé clic en el botón para elegir una nueva contraseña de forma segura.'),
      emailButton('Restablecer contraseña', resetLink),
      emailMuted(`El enlace expira en ${expiresMinutes} minutos. Si no solicitaste esto, ignorá este correo.`),
    ].join('');
    await sendRequired({
      from: FROM(),
      to,
      subject: `Restablecer contraseña — ${APP_NAME}`,
      html: wrapEmail(content),
      text: `Restablecé tu contraseña en: ${resetLink}. Expira en ${expiresMinutes} minutos.`,
    });
  },

  async sendWelcome(to: string, nombre: string): Promise<void> {
    const content = [
      emailGreeting(nombre, `Tu cuenta en ${APP_NAME} ya está lista.`),
      emailParagraph(
        'Ya podés explorar el market, publicar lo que ofrecés y conectarte con la comunidad del club de confianza.',
      ),
      emailButton('Explorar el market', `${FRONTEND_URL}/market`),
      emailMuted('Si no creaste esta cuenta, podés ignorar este mensaje.'),
    ].join('');
    await sendOptional({
      from: FROM(),
      to,
      subject: `Bienvenido a ${APP_NAME}`,
      html: wrapEmail(content),
      text: `Hola ${nombre}, bienvenido a ${APP_NAME}. Explorá el market en ${FRONTEND_URL}/market`,
    });
  },

  async sendLoginSuccess(to: string, nombre: string): Promise<void> {
    const content = [
      emailGreeting(nombre, 'Detectamos un inicio de sesión exitoso en tu cuenta.'),
      emailCallout('Si fuiste vos, no tenés que hacer nada.'),
      emailMuted('Si no fuiste vos, te recomendamos cambiar tu contraseña desde tu perfil lo antes posible.'),
    ].join('');
    await sendOptional({
      from: FROM(),
      to,
      subject: `Inicio de sesión en ${APP_NAME}`,
      html: wrapEmail(content),
      text: `Se inició sesión en tu cuenta de ${APP_NAME}.`,
    });
  },

  async sendPurchase(to: string, nombre: string, tituloProducto: string, precio: number): Promise<void> {
    const content = [
      emailGreeting(nombre, 'Tu compra fue confirmada correctamente.'),
      emailHighlightCard('Detalle de la compra', [
        `<strong>${escapeHtml(tituloProducto)}</strong>`,
        `<span style="color:#9a7b1a;font-weight:700;">${precio} IX</span>`,
      ]),
      emailParagraph('Coordiná la entrega con la otra parte desde el chat.'),
      emailButton('Ir al chat', `${FRONTEND_URL}/chat`),
    ].join('');
    await sendOptional({
      from: FROM(),
      to,
      subject: `Compra confirmada: ${tituloProducto} — ${APP_NAME}`,
      html: wrapEmail(content),
      text: `Compra confirmada: ${tituloProducto} (${precio} IX). Coordiná la entrega por chat en ${FRONTEND_URL}/chat`,
    });
  },

  async sendSale(to: string, nombreVendedor: string, tituloProducto: string, precio: number, nombreComprador: string): Promise<void> {
    const content = [
      emailGreeting(nombreVendedor, `${nombreComprador} compró tu publicación.`),
      emailHighlightCard('Detalle de la venta', [
        `<strong>${escapeHtml(tituloProducto)}</strong>`,
        `<span style="color:#9a7b1a;font-weight:700;">${precio} IX</span>`,
      ]),
      emailParagraph('Coordiná la entrega con el comprador desde el chat.'),
      emailButton('Ir al chat', `${FRONTEND_URL}/chat`),
    ].join('');
    await sendOptional({
      from: FROM(),
      to,
      subject: `Venta: ${tituloProducto} — ${APP_NAME}`,
      html: wrapEmail(content),
      text: `${nombreComprador} compró "${tituloProducto}" (${precio} IX). Coordiná por chat en ${FRONTEND_URL}/chat`,
    });
  },

  async sendNewMessage(to: string, nombreDestinatario: string, nombreRemitente: string, contenidoPreview: string, conversacionId: number): Promise<void> {
    const chatLink = `${FRONTEND_URL}/chat/${conversacionId}`;
    const content = [
      emailGreeting(nombreDestinatario, `${nombreRemitente} te envió un mensaje.`),
      emailQuote(contenidoPreview),
      emailButton('Ver conversación', chatLink),
    ].join('');
    const textPreview = contenidoPreview.replace(/<[^>]*>/g, '').slice(0, 120);
    await sendOptional({
      from: FROM(),
      to,
      subject: `${nombreRemitente} te escribió — ${APP_NAME}`,
      html: wrapEmail(content),
      text: `${nombreRemitente}: ${textPreview}... Ver en ${chatLink}`,
    });
  },

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
    const content = [
      emailGreeting('equipo', 'Nuevo mensaje desde el formulario de contacto.'),
      emailKeyValueTable([
        { label: 'Tipo', value: `<strong>${escapeHtml(categoria)}</strong>` },
        { label: 'Email', value: `<a href="mailto:${escapeHtml(replyTo)}">${escapeHtml(replyTo)}</a>` },
        ...(nombre ? [{ label: 'Nombre', value: escapeHtml(nombre) }] : []),
      ]),
      emailParagraph('<strong>Mensaje</strong>'),
      emailQuote(mensaje),
      attachments?.length
        ? emailMuted(`Adjuntos: ${attachments.length} archivo(s).`)
        : '',
    ].join('');
    await sendRequired({
      from: FROM(),
      to: inboxTo,
      replyTo,
      subject,
      html: wrapEmail(content),
      text: bodyText,
      attachments: attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType,
      })),
    });
  },

  async sendIntercambioVerificationCode(params: {
    to: string;
    nombreDestinatario: string;
    nombreQuienAprueba: string;
    codigo: string;
    acuerdoResumen?: string;
  }): Promise<void> {
    const { to, nombreDestinatario, nombreQuienAprueba, codigo, acuerdoResumen } = params;
    const registroUrl = `${FRONTEND_URL}/registrar-intercambio`;
    const aviso = `Solo entregá este código cuando te encuentres con la otra parte y/o recibas el producto.`;
    const refBlock = acuerdoResumen
      ? emailHighlightCard('Referencia del acuerdo', [escapeHtml(acuerdoResumen)])
      : '';
    const content = [
      emailGreeting(nombreDestinatario, `${nombreQuienAprueba} aprobó el intercambio.`),
      refBlock,
      emailParagraph('Usá este código en <strong>Registrar intercambio</strong> cuando te encuentres con la otra parte.'),
      emailCode(codigo, 'Código de verificación'),
      emailCallout(escapeHtml(aviso), 'warning'),
      emailButton('Ir a registrar intercambio', registroUrl),
      emailMuted('Si no reconocés este intercambio, ignorá este correo.'),
    ].join('');
    await sendRequired({
      from: FROM(),
      to,
      subject: `Código de verificación — ${APP_NAME}`,
      html: wrapEmail(content),
      text: `Hola ${nombreDestinatario},${acuerdoResumen ? ` ${acuerdoResumen}.` : ''} ${nombreQuienAprueba} aprobó el intercambio. Código: ${codigo}. ${aviso} Registrá en ${registroUrl}`,
    });
  },

  async sendNewsletter(to: string, nombre: string, subject: string, bodyHtml: string, bodyText?: string): Promise<void> {
    const content = [
      emailGreeting(nombre, 'Tenemos novedades para compartirte.'),
      `<div style="margin: 0 0 22px 0; font-size: 16px; line-height: 1.65; color: #2c2c2c;">${bodyHtml}</div>`,
      emailMuted(`— El equipo de ${APP_NAME}`),
    ].join('');
    await sendOptional({
      from: FROM(),
      to,
      subject,
      html: wrapEmail(content),
      text: bodyText || bodyHtml.replace(/<[^>]*>/g, '').slice(0, 500),
    });
  },
};

export { NOREPLY_EMAIL };
