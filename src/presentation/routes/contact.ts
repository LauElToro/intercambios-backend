import express from 'express';
import multer from 'multer';
import { ContactController } from '../controllers/ContactController.js';

export const contactRouter = express.Router();

function handleUpload(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  ContactController.uploadMiddleware(req, res, (err: unknown) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Cada archivo debe pesar como máximo 5 MB.' });
      }
      if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({ error: 'Máximo 5 archivos adjuntos.' });
      }
      return res.status(400).json({ error: err.message });
    }
    const msg = err instanceof Error ? err.message : 'Error al procesar archivos';
    return res.status(400).json({ error: msg });
  });
}

contactRouter.post('/', handleUpload, ContactController.sendContact);
