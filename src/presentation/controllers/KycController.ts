import { Response } from 'express';
import { AuthRequest } from '../../infrastructure/middleware/auth.js';
import {
  createDiditVerificationSession,
  DiditApiError,
  diditStatusIndicatesApproved,
  diditStatusIndicatesTerminalRejection,
  fetchDiditSessionDecision,
} from '../../infrastructure/services/diditSession.service.js';
import { UserRepository } from '../../infrastructure/repositories/UserRepository.js';
import { parseUserIdFromVendorData } from '../../utils/diditVendorData.js';

const userRepository = new UserRepository();

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
      const workflowId = process.env.WORKFLOW_DIDIT?.trim() || process.env.ID_DIDIT?.trim();
      const apiKey = process.env.API_KEY_DIDIT?.trim();
      if (!workflowId || !apiKey) {
        return res.status(503).json({ error: 'Verificación de identidad no configurada en el servidor' });
      }

      const callbackUrl = `${publicFrontendBase()}/dashboard?kyc=return`;
      const { url, sessionId } = await createDiditVerificationSession({
        workflowId,
        apiKey,
        vendorData: String(userId),
        callbackUrl,
        language: 'es',
      });

      if (sessionId) {
        await userRepository.setKycDiditSessionId(userId, sessionId);
      }

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

  /**
   * Tras volver de Didit: consulta el estado en la API y actualiza `kycVerificado`
   * (por si el webhook llegó tarde, falló la firma o usó otro `webhook_type`).
   */
  static async syncFromDidit(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ error: 'No autorizado' });
      }

      const apiKey = process.env.API_KEY_DIDIT?.trim();
      if (!apiKey) {
        return res.status(503).json({ error: 'Verificación de identidad no configurada en el servidor' });
      }

      const body = (req.body ?? {}) as { sessionId?: string };
      const fromBody = typeof body.sessionId === 'string' ? body.sessionId.trim() : '';
      const stored = await userRepository.getKycDiditSessionId(userId);
      const sessionId = fromBody || stored;
      if (!sessionId) {
        return res.status(400).json({
          error:
            'No hay sesión de verificación asociada. Iniciá de nuevo la verificación desde el panel o el checkout.',
          code: 'KYC_NO_SESSION',
        });
      }

      const { status, vendorData } = await fetchDiditSessionDecision(sessionId, apiKey);
      const vendorUserId = parseUserIdFromVendorData(vendorData);
      if (vendorUserId != null && vendorUserId !== userId) {
        console.warn('[KycController] sync vendor_data no coincide con el usuario', vendorUserId, userId);
        return res.status(403).json({ error: 'La sesión no corresponde a tu cuenta' });
      }

      if (diditStatusIndicatesApproved(status)) {
        await userRepository.setKycVerificado(userId, true);
        return res.status(200).json({ kycVerificado: true, status });
      }
      if (diditStatusIndicatesTerminalRejection(status)) {
        await userRepository.setKycVerificado(userId, false);
        return res.status(200).json({ kycVerificado: false, status });
      }

      return res.status(200).json({ kycVerificado: false, pending: true, status });
    } catch (e: unknown) {
      if (e instanceof DiditApiError) {
        const upstream = e.statusCode;
        const status = upstream === 404 ? 404 : upstream === 403 ? 403 : 502;
        return res.status(status).json({ error: e.message });
      }
      const msg = e instanceof Error ? e.message : 'Error al sincronizar verificación';
      console.error('[KycController] sync', msg, e);
      return res.status(502).json({ error: msg });
    }
  }
}
