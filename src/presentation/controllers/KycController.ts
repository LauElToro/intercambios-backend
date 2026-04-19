import { Response } from 'express';
import { AuthRequest } from '../../infrastructure/middleware/auth.js';
import { createDiditVerificationSession } from '../../infrastructure/services/diditSession.service.js';

const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:8080').replace(/\/$/, '');

export class KycController {
  static async createSession(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ error: 'No autorizado' });
      }

      const workflowId = process.env.ID_DIDIT?.trim();
      const apiKey = process.env.API_KEY_DIDIT?.trim();
      if (!workflowId || !apiKey) {
        return res.status(503).json({ error: 'Verificación de identidad no configurada en el servidor' });
      }

      const callbackUrl = `${FRONTEND_URL}/dashboard?kyc=return`;
      const { url } = await createDiditVerificationSession({
        workflowId,
        apiKey,
        vendorData: String(userId),
        callbackUrl,
        language: 'es',
      });

      return res.status(200).json({ url });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al iniciar verificación';
      console.error('[KycController]', msg);
      return res.status(502).json({ error: msg });
    }
  }
}
