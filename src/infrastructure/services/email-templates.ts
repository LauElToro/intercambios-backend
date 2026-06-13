/** Logo de marca en Vercel Blob (misma imagen que cabecera de mails y hero oscuro). */
export const BRAND_LOGO_URL =
  'https://iuw1gnctn1hxzcnx.public.blob.vercel-storage.com/brand/logo-intercambius.jpg';

const APP_NAME = 'Intercambius';

const COLORS = {
  gold: '#c9a227',
  goldDark: '#9a7b1a',
  goldSoft: '#fff8e6',
  ink: '#141414',
  inkSoft: '#2a2a2a',
  text: '#2c2c2c',
  muted: '#6b6b6b',
  border: '#ece7df',
  canvas: '#f0ebe3',
  white: '#ffffff',
};

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function emailGreeting(nombre: string, subtitle?: string): string {
  const safeSubtitle = subtitle ? escapeHtml(subtitle) : '';
  return `
    <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: ${COLORS.goldDark};">${APP_NAME}</p>
    <h1 style="margin: 0 0 ${subtitle ? '10px' : '22px'} 0; font-size: 26px; line-height: 1.25; font-weight: 700; color: ${COLORS.ink};">Hola, ${escapeHtml(nombre)}</h1>
    ${subtitle ? `<p style="margin: 0 0 22px 0; font-size: 16px; line-height: 1.65; color: ${COLORS.muted};">${safeSubtitle}</p>` : ''}
  `.trim();
}

export function emailParagraph(text: string): string {
  return `<p style="margin: 0 0 18px 0; font-size: 16px; line-height: 1.65; color: ${COLORS.text};">${text}</p>`;
}

export function emailMuted(text: string): string {
  return `<p style="margin: 0; font-size: 14px; line-height: 1.6; color: ${COLORS.muted};">${text}</p>`;
}

export function emailButton(label: string, href: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 8px 0 22px 0;">
      <tr>
        <td align="center" style="border-radius: 10px; background: linear-gradient(135deg, ${COLORS.gold} 0%, ${COLORS.goldDark} 100%); box-shadow: 0 8px 20px rgba(154, 123, 26, 0.28);">
          <a href="${href}" style="display: inline-block; padding: 14px 28px; color: ${COLORS.white} !important; text-decoration: none; font-size: 15px; font-weight: 700; letter-spacing: 0.01em;">${escapeHtml(label)}</a>
        </td>
      </tr>
    </table>
  `.trim();
}

export function emailCode(code: string, caption?: string): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 22px 0;">
      <tr>
        <td align="center" style="padding: 22px 18px; background: ${COLORS.goldSoft}; border: 1px solid rgba(201, 162, 39, 0.35); border-radius: 14px;">
          <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: ${COLORS.goldDark};">${caption || 'Tu código'}</p>
          <p style="margin: 0; font-size: 34px; line-height: 1; letter-spacing: 0.28em; font-weight: 800; color: ${COLORS.goldDark}; font-family: 'Courier New', Courier, monospace;">${escapeHtml(code)}</p>
        </td>
      </tr>
    </table>
  `.trim();
}

export function emailCallout(text: string, tone: 'info' | 'warning' = 'info'): string {
  const bg = tone === 'warning' ? COLORS.goldSoft : '#f7f7f7';
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 22px 0;">
      <tr>
        <td style="padding: 14px 16px; background: ${bg}; border-left: 4px solid ${COLORS.gold}; border-radius: 10px; font-size: 14px; line-height: 1.6; color: ${COLORS.text};">${text}</td>
      </tr>
    </table>
  `.trim();
}

export function emailQuote(text: string): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 22px 0;">
      <tr>
        <td style="padding: 16px 18px; background: #faf8f5; border: 1px solid ${COLORS.border}; border-left: 4px solid ${COLORS.gold}; border-radius: 12px; font-size: 15px; line-height: 1.65; color: ${COLORS.text};">${escapeHtml(text)}</td>
      </tr>
    </table>
  `.trim();
}

export function emailHighlightCard(title: string, lines: string[]): string {
  const rows = lines
    .map(
      (line) =>
        `<p style="margin: 0 0 6px 0; font-size: 15px; line-height: 1.55; color: ${COLORS.text};">${line}</p>`,
    )
    .join('');
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 22px 0;">
      <tr>
        <td style="padding: 18px 20px; background: #faf8f5; border: 1px solid ${COLORS.border}; border-radius: 14px;">
          <p style="margin: 0 0 10px 0; font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: ${COLORS.goldDark};">${escapeHtml(title)}</p>
          ${rows}
        </td>
      </tr>
    </table>
  `.trim();
}

export function emailKeyValueTable(rows: { label: string; value: string }[]): string {
  const trs = rows
    .map(
      ({ label, value }) => `
        <tr>
          <td style="padding: 8px 0; width: 34%; font-size: 13px; color: ${COLORS.muted}; vertical-align: top;">${escapeHtml(label)}</td>
          <td style="padding: 8px 0; font-size: 14px; color: ${COLORS.text}; vertical-align: top;">${value}</td>
        </tr>
      `,
    )
    .join('');
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 18px 0; border-top: 1px solid ${COLORS.border}; border-bottom: 1px solid ${COLORS.border};">
      ${trs}
    </table>
  `.trim();
}

export function emailLayout(content: string, frontendUrl: string, logoUrl: string): string {
  const siteLabel = frontendUrl.replace(/^https?:\/\//, '');
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${APP_NAME}</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${COLORS.canvas}; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: ${COLORS.canvas};">
    <tr>
      <td align="center" style="padding: 36px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; background-color: ${COLORS.white}; border-radius: 18px; overflow: hidden; box-shadow: 0 18px 40px rgba(20, 20, 20, 0.12); border: 1px solid rgba(20, 20, 20, 0.06);">
          <tr>
            <td style="background: linear-gradient(180deg, ${COLORS.ink} 0%, ${COLORS.inkSoft} 100%); padding: 34px 28px 26px; text-align: center;">
              <img src="${logoUrl}" alt="${APP_NAME}" width="168" style="display: block; margin: 0 auto; max-width: 168px; width: 168px; height: auto; border: 0;" />
              <div style="height: 2px; margin: 22px auto 0; max-width: 220px; background: linear-gradient(90deg, transparent, ${COLORS.gold}, transparent);"></div>
            </td>
          </tr>
          <tr>
            <td style="padding: 34px 32px 28px; color: ${COLORS.text}; font-size: 16px; line-height: 1.65;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="padding: 22px 28px 26px; background: ${COLORS.ink}; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 14px; font-weight: 600; color: #f3e7c2;">Intercambius — El club de confianza</p>
              <p style="margin: 0;"><a href="${frontendUrl}" style="color: ${COLORS.gold}; text-decoration: none; font-size: 13px;">${siteLabel}</a></p>
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
