import { Request, Response } from 'express';
import { uploadImage } from '../../infrastructure/storage/vercel-blob.js';
import { AuthRequest } from '../../infrastructure/middleware/auth.js';
import multer from 'multer';

// Configurar multer para manejar archivos en memoria
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes'));
    }
  },
});

export class UploadController {
  static upload = upload.single('image');

  static async uploadImage(req: AuthRequest, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No se proporcionó ninguna imagen' });
      }

      if (!req.userId) {
        return res.status(401).json({ error: 'No autorizado' });
      }

      // Generar nombre único para el archivo
      const timestamp = Date.now();
      const originalName = (req.file.originalname || 'image').replace(/[^a-zA-Z0-9.-]/g, '_');
      const filename = `market/${req.userId}/${timestamp}-${originalName}`;

      const result = await uploadImage(req.file.buffer, filename);
      
      res.json({
        url: result.url,
        pathname: result.pathname,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
