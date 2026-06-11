import { OAuth2Client } from 'google-auth-library';

function signInClientId(): string | undefined {
  return process.env.GOOGLE_OAUTH_CLIENT_ID?.trim() || undefined;
}

function signInClientSecret(): string | undefined {
  return process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim() || undefined;
}

export function isGoogleOAuthCodeFlowConfigured(): boolean {
  return Boolean(signInClientId() && signInClientSecret());
}

export async function exchangeGoogleAuthCode(code: string, redirectUri: string): Promise<string> {
  const clientId = signInClientId();
  const clientSecret = signInClientSecret();
  if (!clientId || !clientSecret) {
    throw new Error('Google Sign-In OAuth no configurado (falta CLIENT_ID o CLIENT_SECRET)');
  }

  const client = new OAuth2Client(clientId, clientSecret, redirectUri);
  const { tokens } = await client.getToken({ code, redirect_uri: redirectUri });
  if (!tokens.id_token) {
    throw new Error('Google no devolvió id_token');
  }
  return tokens.id_token;
}
