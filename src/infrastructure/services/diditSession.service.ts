const DIDIT_SESSION_URL = 'https://verification.didit.me/v3/session/';

export class DiditApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = 'DiditApiError';
  }
}

function parseDiditErrorMessage(json: Record<string, unknown>, text: string, status: number): string {
  const d = json.detail;
  if (typeof d === 'string' && d.trim()) return d;
  if (Array.isArray(d) && d.length > 0) {
    const first = d[0] as { msg?: string; message?: string };
    if (typeof first?.msg === 'string') return first.msg;
    if (typeof first?.message === 'string') return first.message;
  }
  if (typeof json.message === 'string') return json.message;
  if (typeof json.error === 'string') return json.error;
  return text.trim().slice(0, 300) || `Didit error HTTP ${status}`;
}

export async function createDiditVerificationSession(opts: {
  workflowId: string;
  apiKey: string;
  vendorData: string;
  callbackUrl: string;
  language?: string;
}): Promise<{ url: string; sessionId?: string }> {
  let res: Response;
  try {
    res = await fetch(DIDIT_SESSION_URL, {
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
      signal: AbortSignal.timeout(25_000),
    });
  } catch (e) {
    const name = e instanceof Error ? e.name : '';
    if (name === 'AbortError' || name === 'TimeoutError') {
      throw new Error('Didit no respondió a tiempo. Intentá de nuevo en unos segundos.');
    }
    throw e instanceof Error ? e : new Error('Error de red al contactar Didit');
  }

  const text = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch (parseErr) {
    if (parseErr instanceof SyntaxError) {
      throw new Error(`Didit devolvió una respuesta no JSON (${res.status})`);
    }
    throw parseErr;
  }

  if (!res.ok) {
    const msg = parseDiditErrorMessage(json, text, res.status);
    throw new DiditApiError(msg || `Didit error HTTP ${res.status}`, res.status);
  }

  const url = typeof json.url === 'string' ? json.url : null;
  if (!url) {
    throw new Error('Didit no devolvió URL de verificación');
  }

  const sessionId = typeof json.session_id === 'string' ? json.session_id : undefined;
  return { url, sessionId };
}
