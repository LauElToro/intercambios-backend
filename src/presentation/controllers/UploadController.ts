import { Request, Response } from 'express';
import { uploadImage } from '../../infrastructure/storage/vercel-blob.js';
import { AuthRequest } from '../../infrastructure/middleware/auth.js';
import multer from 'multer';

// Configurar multer para manejar archivos en memoria
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB (para video)
  },
  fileFilter: (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes o videos'));
    }
  },
});

export class UploadController {
  static upload = upload.single('image');

  static async uploadImage(req: AuthRequest, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No se proporcionó ningún archivo' });
      }

      if (!req.userId) {
        return res.status(401).json({ error: 'No autorizado' });
      }

      const timestamp = Date.now();
      const originalName = (req.file.originalname || 'file').replace(/[^a-zA-Z0-9.-]/g, '_');
      const ext = originalName.includes('.') ? '' : (req.file.mimetype.startsWith('video/') ? '.mp4' : '.jpg');
      const filename = `market/${req.userId}/${timestamp}-${originalName}${ext}`;

      const result = await uploadImage(req.file.buffer, filename);
      
      res.json({
        url: result.url,
        pathname: result.pathname,
        mediaType: req.file.mimetype.startsWith('video/') ? 'video' : 'image',
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
