import { Request, Response } from 'express';
import { UserRepository } from '../../infrastructure/repositories/UserRepository.js';
import { verifyDiditWebhook } from '../../utils/diditWebhookVerify.js';

const userRepository = new UserRepository();

function parseUserIdFromVendorData(vendorData: unknown): number | null {
  if (vendorData == null) return null;
  const n = parseInt(String(vendorData).trim(), 10);
  if (!Number.isFinite(n) || n < 1) return null;
  return n;
}

export class DiditWebhookController {
  static async handle(req: Request, res: Response) {
    try {
      const secret = process.env.DIDIT_WEBHOOK_SECRET?.trim();
      if (!secret) {
        console.error('[DiditWebhook] Falta DIDIT_WEBHOOK_SECRET');
        return res.status(503).json({ error: 'Webhook no configurado' });
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
      if (webhookType !== 'status.updated') {
        return res.status(200).json({ ok: true, ignored: true });
      }

      const userId = parseUserIdFromVendorData(body.vendor_data);
      if (userId == null) {
        return res.status(200).json({ ok: true, ignored: true });
      }

      const status = String(body.status ?? '');
      if (status === 'Approved') {
        await userRepository.setKycVerificado(userId, true);
      } else if (status === 'Declined' || status === 'Abandoned') {
        await userRepository.setKycVerificado(userId, false);
      }

      return res.status(200).json({ ok: true });
    } catch (err: unknown) {
      console.error('[DiditWebhook]', err);
      return res.status(500).json({ error: 'Error interno' });
    }
  }
}
