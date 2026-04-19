import { Response } from 'express';
import { AuthRequest } from '../../infrastructure/middleware/auth.js';
import {
  createDiditVerificationSession,
  DiditApiError,
} from '../../infrastructure/services/diditSession.service.js';

/** Base del sitio para el redirect post-KYC. Sin `FRONTEND_URL`, siempre el dominio público. */
function publicFrontendBase(): string {
  const raw = process.env.FRONTEND_URL?.trim();
  if (raw) return raw.replace(/\/$/, '');
  return 'https://intercambius.com.ar';
}

export class KycController {
  static async createSession(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ error: 'No autorizado' });
      }

      // Módulos del flujo (ID, liveness, face match, IP, etc.) los define el workflow en Didit, no este código.
      const workflowId = process.env.ID_DIDIT?.trim();
      const apiKey = process.env.API_KEY_DIDIT?.trim();
      if (!workflowId || !apiKey) {
        return res.status(503).json({ error: 'Verificación de identidad no configurada en el servidor' });
      }

      const callbackUrl = `${publicFrontendBase()}/dashboard?kyc=return`;
      const { url } = await createDiditVerificationSession({
        workflowId,
        apiKey,
        vendorData: String(userId),
        callbackUrl,
        language: 'es',
      });

      return res.status(200).json({ url });
    } catch (e: unknown) {
      if (e instanceof DiditApiError) {
        const upstream = e.statusCode;
        const status =
          upstream === 429 ? 429 : upstream === 400 || upstream === 403 || upstream === 404 ? upstream : 502;
        console.error('[KycController] Didit HTTP', upstream, e.message);
        return res.status(status).json({ error: e.message });
      }
      const msg = e instanceof Error ? e.message : 'Error al iniciar verificación';
      const timeoutHint =
        typeof msg === 'string' && msg.includes('Didit no respondió') ? 504 : 502;
      console.error('[KycController]', msg, e);
      return res.status(timeoutHint).json({ error: msg });
    }
  }
}
