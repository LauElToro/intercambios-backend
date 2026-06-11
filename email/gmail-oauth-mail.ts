/**
 * Transporte nodemailer para Gmail usando OAuth 2.0 (sin contraseña de aplicación).
 * Integración: importá `createGmailOAuthTransport` en tu API Node y usalo donde hoy armás el transporter SMTP.
 */
import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

export type GmailOAuthEnv = {
  gmailUser: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
};

export function readGmailOAuthEnv(processEnv: NodeJS.ProcessEnv): GmailOAuthEnv | null {
  const gmailUser = processEnv.GMAIL_USER?.trim();
  const clientId = processEnv.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = processEnv.GOOGLE_CLIENT_SECRET?.trim();
  const refreshToken = processEnv.GOOGLE_REFRESH_TOKEN?.trim();
  if (!gmailUser || !clientId || !clientSecret || !refreshToken) return null;
  return { gmailUser, clientId, clientSecret, refreshToken };
}

/**
 * Transporter listo para sendMail(). Renueva el access token con el refresh token automáticamente.
 */
export function createGmailOAuthTransport(config: GmailOAuthEnv): Transporter {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      type: "OAuth2",
      user: config.gmailUser,
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      refreshToken: config.refreshToken,
    },
  });
}

/** Ejemplo de envío; adaptá HTML/texto según tu dominio. */
export async function sendMailExample(
  transport: Transporter,
  opts: { from: string; to: string; subject: string; text: string; html?: string },
): Promise<void> {
  await transport.sendMail({
    from: opts.from,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    html: opts.html,
  });
}
