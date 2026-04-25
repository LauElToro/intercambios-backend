import crypto from 'crypto';

/** Alineado con la guía Didit: números enteros en float se truncan. */
export function shortenFloats(data: unknown): unknown {
  if (Array.isArray(data)) {
    return data.map(shortenFloats);
  }
  if (data !== null && typeof data === 'object') {
    return Object.fromEntries(
      Object.entries(data as Record<string, unknown>).map(([key, value]) => [key, shortenFloats(value)])
    );
  }
  if (typeof data === 'number' && !Number.isInteger(data) && data % 1 === 0) {
    return Math.trunc(data);
  }
  return data;
}

function sortKeysDeep(obj: unknown): unknown {
  if (Array.isArray(obj)) {
    return obj.map(sortKeysDeep);
  }
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortKeysDeep((obj as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }
  return obj;
}

export function verifyDiditSignatureV2(
  jsonBody: Record<string, unknown>,
  signatureHeader: string,
  timestampHeader: string,
  secretKey: string
): boolean {
  const currentTime = Math.floor(Date.now() / 1000);
  const incomingTime = parseInt(timestampHeader, 10);
  // Relajado vs 5 min: cold starts / desvío de reloj entre Didit y el servidor.
  if (!Number.isFinite(incomingTime) || Math.abs(currentTime - incomingTime) > 600) {
    return false;
  }

  const processedData = shortenFloats(jsonBody);
  const canonicalJson = JSON.stringify(sortKeysDeep(processedData));
  const hmac = crypto.createHmac('sha256', secretKey);
  const expectedSignature = hmac.update(canonicalJson, 'utf8').digest('hex');

  try {
    const a = Buffer.from(expectedSignature, 'utf8');
    const b = Buffer.from(signatureHeader, 'utf8');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function verifyDiditSignatureSimple(
  jsonBody: Record<string, unknown>,
  signatureHeader: string,
  timestampHeader: string,
  secretKey: string
): boolean {
  const currentTime = Math.floor(Date.now() / 1000);
  const incomingTime = parseInt(timestampHeader, 10);
  if (!Number.isFinite(incomingTime) || Math.abs(currentTime - incomingTime) > 600) {
    return false;
  }

  const canonicalString = [
    String(jsonBody.timestamp ?? ''),
    String(jsonBody.session_id ?? ''),
    String(jsonBody.status ?? ''),
    String(jsonBody.webhook_type ?? ''),
  ].join(':');

  const hmac = crypto.createHmac('sha256', secretKey);
  const expectedSignature = hmac.update(canonicalString, 'utf8').digest('hex');

  try {
    const a = Buffer.from(expectedSignature, 'utf8');
    const b = Buffer.from(signatureHeader, 'utf8');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function verifyDiditWebhook(
  jsonBody: Record<string, unknown>,
  headers: { signatureV2?: string; signatureSimple?: string; timestamp?: string },
  secretKey: string
): boolean {
  const ts = headers.timestamp;
  if (!ts || !secretKey) return false;
  if (headers.signatureV2 && verifyDiditSignatureV2(jsonBody, headers.signatureV2, ts, secretKey)) {
    return true;
  }
  if (headers.signatureSimple && verifyDiditSignatureSimple(jsonBody, headers.signatureSimple, ts, secretKey)) {
    return true;
  }
  return false;
}
