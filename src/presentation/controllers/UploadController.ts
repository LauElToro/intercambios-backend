import { NextFunction, Request, Response } from 'express';
import { uploadImage } from '../../infrastructure/storage/vercel-blob.js';
import { AuthRequest } from '../../infrastructure/middleware/auth.js';
import multer from 'multer';

/** Vercel (serverless) limita el body; por archivo evitamos superar el techo y fallar con error opaco. */
const MAX_FILE_BYTES = 4 * 1024 * 1024;

// Configurar multer para manejar archivos en memoria
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_BYTES,
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

  /** Atrapa errores de multer (tamaño, etc.) y devuelve JSON en lugar de cortar la request. */
  static handleUpload = (req: Request, res: Response, next: NextFunction) => {
    UploadController.upload(req, res, (err: unknown) => {
      if (err) {
        const code = err && typeof err === 'object' && 'code' in err ? (err as { code?: string }).code : undefined;
        if (code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({
            error:
              'El archivo supera 4 MB. En el servidor (Vercel) el límite de subida es bajo: probá otra resolución o un video más corto.',
          });
        }
        const message = err instanceof Error ? err.message : 'Error al recibir el archivo';
        return res.status(400).json({ error: message });
      }
      next();
    });
  };

  static async uploadImage(req: AuthRequest, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No se proporcionó ningún archivo' });
      }

      if (!req.userId) {
        return res.status(401).json({ error: 'No autorizado' });
      }

      const tipo = (req.body?.tipo || req.query?.tipo || 'market') as string;
      const timestamp = Date.now();
      const originalName = (req.file.originalname || 'file').replace(/[^a-zA-Z0-9.-]/g, '_');
      const ext = originalName.includes('.') ? '' : (req.file.mimetype.startsWith('video/') ? '.mp4' : '.jpg');
      const folder = tipo === 'fotoPerfil' || tipo === 'banner' ? 'profile' : 'market';
      const filename = tipo === 'fotoPerfil' 
        ? `${folder}/${req.userId}/foto-${timestamp}${ext || '.jpg'}`
        : tipo === 'banner'
        ? `${folder}/${req.userId}/banner-${timestamp}${ext || '.jpg'}`
        : `market/${req.userId}/${timestamp}-${originalName}${ext}`;

      const result = await uploadImage(req.file.buffer, filename, req.file.mimetype);
      
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
