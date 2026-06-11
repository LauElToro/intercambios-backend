import { OAuth2Client } from 'google-auth-library';

function trimEnv(v: string | undefined): string | undefined {
  if (v == null) return undefined;
  const t = v.replace(/^["']|["']$/g, '').trim();
  return t || undefined;
}

function signInClientId(): string | undefined {
  return trimEnv(process.env.GOOGLE_OAUTH_CLIENT_ID);
}

function signInClientSecret(): string | undefined {
  return trimEnv(process.env.GOOGLE_OAUTH_CLIENT_SECRET);
}

export function isGoogleOAuthCodeFlowConfigured(): boolean {
  return Boolean(signInClientId() && signInClientSecret());
}

function mapGoogleTokenError(err: unknown): Error {
  const message = err instanceof Error ? err.message : String(err);
  if (message.includes('invalid_grant')) {
    return new Error(
      'invalid_grant: el código expiró, ya se usó, o el redirect_uri/secret no coincide con Google Cloud',
    );
  }
  return err instanceof Error ? err : new Error(message);
}

export async function exchangeGoogleAuthCode(code: string, redirectUri: string): Promise<string> {
  const clientId = signInClientId();
  const clientSecret = signInClientSecret();
  if (!clientId || !clientSecret) {
    throw new Error('Google Sign-In OAuth no configurado (falta CLIENT_ID o CLIENT_SECRET)');
  }

  const normalizedRedirect = redirectUri.trim();
  const client = new OAuth2Client(clientId, clientSecret);

  try {
    const { tokens } = await client.getToken({
      code: code.trim(),
      redirect_uri: normalizedRedirect,
    });
    if (!tokens.id_token) {
      throw new Error('Google no devolvió id_token');
    }
    return tokens.id_token;
  } catch (err) {
    throw mapGoogleTokenError(err);
  }
}
