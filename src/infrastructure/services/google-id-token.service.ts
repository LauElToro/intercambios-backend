import { OAuth2Client } from 'google-auth-library';
import { normalizeEmail } from '../../utils/normalizeEmail.js';

export interface GoogleTokenProfile {
  googleId: string;
  email: string;
  nombre: string;
  fotoPerfil?: string;
  emailVerified: boolean;
}

function googleOAuthClientId(): string | undefined {
  return process.env.GOOGLE_OAUTH_CLIENT_ID?.trim() || undefined;
}

export function isGoogleOAuthConfigured(): boolean {
  return Boolean(googleOAuthClientId());
}

let oauthClient: OAuth2Client | null = null;

function getClient(): OAuth2Client {
  const clientId = googleOAuthClientId();
  if (!clientId) {
    throw new Error('Google Sign-In no configurado en el servidor');
  }
  if (!oauthClient) {
    oauthClient = new OAuth2Client(clientId);
  }
  return oauthClient;
}

export async function verifyGoogleIdToken(credential: string): Promise<GoogleTokenProfile> {
  const clientId = googleOAuthClientId();
  if (!clientId) {
    throw new Error('Google Sign-In no configurado en el servidor');
  }

  const ticket = await getClient().verifyIdToken({
    idToken: credential,
    audience: clientId,
  });

  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email) {
    throw new Error('Token de Google inválido');
  }

  return {
    googleId: payload.sub,
    email: normalizeEmail(payload.email),
    nombre: payload.name?.trim() || payload.email.split('@')[0],
    fotoPerfil: payload.picture || undefined,
    emailVerified: payload.email_verified === true,
  };
}
