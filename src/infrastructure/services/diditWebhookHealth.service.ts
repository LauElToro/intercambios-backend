/**
 * Diagnóstico de configuración Didit / webhook KYC (sin exponer secretos).
 */

export type DiditWebhookHealth = {
  ok: boolean;
  webhook: {
    path: string;
    signingSecretConfigured: boolean;
    /** Si usa DIDIT_WEBHOOK_SECRET (recomendado) o fallback API_KEY_DIDIT */
    signingSecretSource: 'DIDIT_WEBHOOK_SECRET' | 'API_KEY_DIDIT' | 'none';
    acceptsEvents: string[];
  };
  kyc: {
    apiKeyConfigured: boolean;
    workflowConfigured: boolean;
    workflowEnvVar: 'WORKFLOW_DIDIT' | 'ID_DIDIT' | 'none';
  };
  hints: string[];
};

function resolveSigningSecret(): { configured: boolean; source: DiditWebhookHealth['webhook']['signingSecretSource'] } {
  const webhook = process.env.DIDIT_WEBHOOK_SECRET?.trim();
  if (webhook) {
    return { configured: true, source: 'DIDIT_WEBHOOK_SECRET' };
  }
  const apiKey = process.env.API_KEY_DIDIT?.trim();
  if (apiKey) {
    return { configured: true, source: 'API_KEY_DIDIT' };
  }
  return { configured: false, source: 'none' };
}

function resolveWorkflowEnvVar(): DiditWebhookHealth['kyc']['workflowEnvVar'] {
  if (process.env.WORKFLOW_DIDIT?.trim()) return 'WORKFLOW_DIDIT';
  if (process.env.ID_DIDIT?.trim()) return 'ID_DIDIT';
  return 'none';
}

/** URL pública esperada del webhook (solo informativa; Didit debe apuntar acá). */
export function expectedDiditWebhookUrl(req?: { protocol?: string; get?: (name: string) => string | undefined }): string {
  const configured = process.env.PUBLIC_API_URL?.trim() || process.env.VERCEL_URL?.trim();
  if (configured) {
    const base = configured.startsWith('http') ? configured.replace(/\/$/, '') : `https://${configured.replace(/\/$/, '')}`;
    return `${base}/api/webhooks/didit`;
  }
  if (req?.get?.('host')) {
    const proto = req.get('x-forwarded-proto') || req.protocol || 'https';
    return `${proto}://${req.get('host')}/api/webhooks/didit`;
  }
  return 'https://intercambios-backend.vercel.app/api/webhooks/didit';
}

export function checkDiditWebhookHealth(req?: {
  protocol?: string;
  get?: (name: string) => string | undefined;
}): DiditWebhookHealth {
  const signing = resolveSigningSecret();
  const workflowVar = resolveWorkflowEnvVar();
  const apiKeyConfigured = Boolean(process.env.API_KEY_DIDIT?.trim());
  const workflowConfigured = workflowVar !== 'none';

  const hints: string[] = [];

  if (!signing.configured) {
    hints.push(
      'Configurá DIDIT_WEBHOOK_SECRET en Vercel con la Webhook Secret Key (Didit → API & Webhooks → destino).',
    );
  } else if (signing.source === 'API_KEY_DIDIT') {
    hints.push(
      'Estás usando API_KEY_DIDIT como secreto del webhook. Preferí DIDIT_WEBHOOK_SECRET (secret_shared_key del destino).',
    );
  }

  if (!apiKeyConfigured) {
    hints.push('Falta API_KEY_DIDIT para crear sesiones KYC y consultar decisiones.');
  }
  if (!workflowConfigured) {
    hints.push('Falta WORKFLOW_DIDIT o ID_DIDIT (workflow de verificación en Didit).');
  }

  hints.push(`URL del webhook en Didit: ${expectedDiditWebhookUrl(req)}`);
  hints.push('Eventos recomendados en el destino: status.updated, data.updated');
  hints.push('IP de Didit para allowlist (Cloudflare/WAF): 18.203.201.92');

  const ok = signing.configured && apiKeyConfigured && workflowConfigured;

  return {
    ok,
    webhook: {
      path: '/api/webhooks/didit',
      signingSecretConfigured: signing.configured,
      signingSecretSource: signing.source,
      acceptsEvents: ['status.updated', 'data.updated'],
    },
    kyc: {
      apiKeyConfigured,
      workflowConfigured,
      workflowEnvVar: workflowVar,
    },
    hints,
  };
}
