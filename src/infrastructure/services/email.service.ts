import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true',
  auth: process.env.SMTP_USER
    ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    : undefined,
});

const FROM = process.env.SMTP_FROM || '"Intercambius" <noreply@intercambius.com>';
const APP_NAME = 'Intercambius';

export const emailService = {
  async sendMfaCode(to: string, code: string): Promise<void> {
    const html = `
      <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto;">
        <h2 style="color: #b8860b;">${APP_NAME}</h2>
        <p>Tu código de verificación es:</p>
        <p style="font-size: 28px; letter-spacing: 8px; font-weight: bold; color: #333;">${code}</p>
        <p style="color: #666; font-size: 14px;">Válido por 10 minutos. No lo compartas con nadie.</p>
      </div>
    `;
    const mailOptions = {
      from: FROM,
      to,
      subject: `Tu código de verificación - ${APP_NAME}`,
      html,
      text: `Tu código de verificación es: ${code}. Válido por 10 minutos.`,
    };
    try {
      if (!process.env.SMTP_USER) {
        console.log('[DEV] Código MFA para', to, ':', code);
        return;
      }
      await transporter.sendMail(mailOptions);
    } catch (err) {
      console.error('Error enviando email MFA:', err);
      if (process.env.NODE_ENV !== 'production') {
        console.log('[DEV] Código MFA para', to, ':', code);
        return;
      }
      throw new Error('No se pudo enviar el código por email');
    }
  },

  async sendPasswordResetLink(to: string, resetLink: string, expiresMinutes: number): Promise<void> {
    const html = `
      <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto;">
        <h2 style="color: #b8860b;">${APP_NAME}</h2>
        <p>Solicitaste restablecer tu contraseña.</p>
        <p><a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background: #b8860b; color: white; text-decoration: none; border-radius: 8px;">Restablecer contraseña</a></p>
        <p style="color: #666; font-size: 14px;">El enlace expira en ${expiresMinutes} minutos. Si no solicitaste esto, ignorá este email.</p>
      </div>
    `;
    const mailOptions = {
      from: FROM,
      to,
      subject: `Restablecer contraseña - ${APP_NAME}`,
      html,
      text: `Restablecé tu contraseña en: ${resetLink}. Expira en ${expiresMinutes} minutos.`,
    };
    try {
      if (!process.env.SMTP_USER) {
        console.log('[DEV] Link restablecer para', to, ':', resetLink);
        return;
      }
      await transporter.sendMail(mailOptions);
    } catch (err) {
      console.error('Error enviando email reset password:', err);
      if (process.env.NODE_ENV !== 'production') {
        console.log('[DEV] Link restablecer para', to, ':', resetLink);
        return;
      }
      throw new Error('No se pudo enviar el email de recuperación');
    }
  },
};
