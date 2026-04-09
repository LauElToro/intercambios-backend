import { Request, Response } from 'express';
import multer from 'multer';
import { emailService } from '../../infrastructure/services/email.service.js';

const MAX_FILES = 5;
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB por archivo

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const CATEGORIAS = new Set(['queja', 'sugerencia', 'consulta', 'otro']);

function sanitizeFilename(name: string): string {
  return (name || 'adjunto').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 180);
}

const uploadContact = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE, files: MAX_FILES },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}`));
    }
  },
});

export class ContactController {
  static uploadMiddleware = uploadContact.array('attachments', MAX_FILES);

  static async sendContact(req: Request, res: Response) {
    try {
      const email = String(req.body?.email || '')
        .trim()
        .toLowerCase();
      const nombre = String(req.body?.nombre || '').trim().slice(0, 200);
      let categoria = String(req.body?.categoria || 'consulta').trim().toLowerCase();
      if (!CATEGORIAS.has(categoria)) {
        categoria = 'consulta';
      }
      const mensaje = String(req.body?.mensaje || '').trim();

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'Ingresá un email válido.' });
      }
      if (mensaje.length < 10) {
        return res.status(400).json({ error: 'El mensaje debe tener al menos 10 caracteres.' });
      }
      if (mensaje.length > 12000) {
        return res.status(400).json({ error: 'El mensaje es demasiado largo.' });
      }

      const files = (req.files as Express.Multer.File[] | undefined) || [];
      const attachments = files.map((f) => ({
        filename: sanitizeFilename(f.originalname || 'adjunto'),
        content: f.buffer,
        contentType: f.mimetype,
      }));

      if (!process.env.SMTP_USER) {
        return res.status(503).json({
          error:
            'El envío de correo no está configurado en el servidor. Escribinos a Intercambius.info@gmail.com manualmente.',
        });
      }

      const inboxTo =
        process.env.CONTACT_INBOX_EMAIL?.trim() ||
        process.env.SMTP_USER?.trim() ||
        'Intercambius.info@gmail.com';

      await emailService.sendContactInquiry({
        inboxTo,
        replyTo: email,
        nombre: nombre || undefined,
        categoria,
        mensaje,
        attachments: attachments.length > 0 ? attachments : undefined,
      });

      res.status(201).json({ ok: true, message: 'Mensaje enviado. Te responderemos a la brevedad.' });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Error al enviar';
      if (msg.includes('Tipo de archivo no permitido') || msg.includes('File too large')) {
        return res.status(400).json({ error: msg });
      }
      console.error('[ContactController]', error);
      res.status(500).json({ error: 'No se pudo enviar el mensaje. Probá más tarde o escribinos por correo.' });
    }
  }
}
