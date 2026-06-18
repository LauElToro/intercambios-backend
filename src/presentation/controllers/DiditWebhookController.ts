import { Request, Response } from 'express';
import { UserRepository } from '../../infrastructure/repositories/UserRepository.js';
import { verifyDiditWebhook } from '../../utils/diditWebhookVerify.js';
import { parseUserIdFromVendorData } from '../../utils/diditVendorData.js';
import {
  diditStatusIndicatesApproved,
  diditStatusIndicatesTerminalRejection,
} from '../../infrastructure/services/diditSession.service.js';
import { approveKycForUser, KycDuplicateDocumentError } from '../../domain/services/kycApproval.js';

const userRepository = new UserRepository();

/** Secreto HMAC: Didit → API & Webhooks → «Webhook Secret Key» → `DIDIT_WEBHOOK_SECRET`. Si falta, se intenta `API_KEY_DIDIT` (misma clave en algunos entornos). */
function getWebhookSigningSecret(): string | undefined {
  const webhook = process.env.DIDIT_WEBHOOK_SECRET?.trim();
  if (webhook) return webhook;
  return process.env.API_KEY_DIDIT?.trim() || undefined;
}

function extractVendorData(body: Record<string, unknown>): unknown {
  const top = body.vendor_data;
  if (top != null && top !== '') return top;
  const dec = body.decision;
  if (dec && typeof dec === 'object') {
    const vd = (dec as Record<string, unknown>).vendor_data;
    if (vd != null && vd !== '') return vd;
  }
  return null;
}

const KYC_WEBHOOK_TYPES = new Set(['status.updated', 'data.updated']);

export class DiditWebhookController {
  static async handle(req: Request, res: Response) {
    try {
      const secret = getWebhookSigningSecret();
      if (!secret) {
        console.error(
          '[DiditWebhook] Falta DIDIT_WEBHOOK_SECRET (Webhook Secret Key en Didit → API & Webhooks). Sin eso no se puede verificar la firma.',
        );
        return res.status(503).json({
          error:
            'Webhook Didit: configurá DIDIT_WEBHOOK_SECRET con la Webhook Secret Key (Didit → API & Webhooks).',
        });
      }

      const body = req.body as Record<string, unknown>;
      if (!body || typeof body !== 'object') {
        return res.status(400).json({ error: 'Body inválido' });
      }

      const sigV2 = req.get('X-Signature-V2') ?? undefined;
      const sigSimple = req.get('X-Signature-Simple') ?? undefined;
      const ts = req.get('X-Timestamp') ?? undefined;

      const ok = verifyDiditWebhook(body, { signatureV2: sigV2, signatureSimple: sigSimple, timestamp: ts }, secret);
      if (!ok) {
        return res.status(401).json({ error: 'Firma inválida' });
      }

      const webhookType = String(body.webhook_type ?? '');
      if (!KYC_WEBHOOK_TYPES.has(webhookType)) {
        return res.status(200).json({ ok: true, ignored: true });
      }

      const status = String(body.status ?? '');
      const userId = parseUserIdFromVendorData(extractVendorData(body));
      if (userId == null) {
        console.warn('[DiditWebhook] Sin vendor_data reconocible', {
          webhook_type: webhookType,
          session_id: body.session_id,
          status,
        });
        return res.status(200).json({ ok: true, ignored: true });
      }

      if (diditStatusIndicatesApproved(status)) {
        const sessionId = typeof body.session_id === 'string' ? body.session_id : undefined;
        const apiKey = process.env.API_KEY_DIDIT?.trim();
        try {
          await approveKycForUser(userId, {
            decision: body,
            sessionId,
            apiKey,
          });
          console.log('[DiditWebhook] KYC aprobado userId=%s session=%s', userId, String(body.session_id ?? ''));
        } catch (e) {
          if (e instanceof KycDuplicateDocumentError) {
            await userRepository.setKycVerificado(userId, false);
            console.warn('[DiditWebhook] DNI duplicado userId=%s session=%s', userId, String(body.session_id ?? ''));
            return res.status(200).json({ ok: true, rejected: 'duplicate_document' });
          }
          throw e;
        }
      } else if (diditStatusIndicatesTerminalRejection(status)) {
        await userRepository.setKycVerificado(userId, false);
      }

      return res.status(200).json({ ok: true });
    } catch (err: unknown) {
      console.error('[DiditWebhook]', err);
      return res.status(500).json({ error: 'Error interno' });
    }
  }
}
