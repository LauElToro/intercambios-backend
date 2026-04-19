const DIDIT_SESSION_URL = 'https://verification.didit.me/v3/session/';

export async function createDiditVerificationSession(opts: {
  workflowId: string;
  apiKey: string;
  vendorData: string;
  callbackUrl: string;
  language?: string;
}): Promise<{ url: string; sessionId?: string }> {
  const res = await fetch(DIDIT_SESSION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': opts.apiKey,
    },
    body: JSON.stringify({
      workflow_id: opts.workflowId,
      vendor_data: opts.vendorData,
      callback: opts.callbackUrl,
      callback_method: 'both',
      language: opts.language ?? 'es',
    }),
  });

  const text = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    throw new Error(`Didit devolvió una respuesta no JSON (${res.status})`);
  }

  if (!res.ok) {
    const msg = typeof json.message === 'string' ? json.message : typeof json.error === 'string' ? json.error : text.slice(0, 200);
    throw new Error(msg || `Didit error HTTP ${res.status}`);
  }

  const url = typeof json.url === 'string' ? json.url : null;
  if (!url) {
    throw new Error('Didit no devolvió URL de verificación');
  }

  const sessionId = typeof json.session_id === 'string' ? json.session_id : undefined;
  return { url, sessionId };
}
