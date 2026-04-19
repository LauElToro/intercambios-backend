import type { NextFunction, Request, Response } from 'express';
import cors from 'cors';

/** Orígenes explícitos además de `*.intercambius.com.ar` (HTTPS). No usa .env: evita desalineación con el navegador. */
export function getCorsAllowedOrigins(): Set<string> {
  const set = new Set<string>();
  const add = (raw?: string | null) => {
    const n = raw?.trim().replace(/\/$/, '');
    if (n) set.add(n);
  };

  add('https://intercambius.com.ar');
  add('https://www.intercambius.com.ar');

  // Desarrollo local (Vite / preview / puertos habituales)
  add('http://localhost:5173');
  add('http://127.0.0.1:5173');
  add('http://localhost:8080');
  add('http://localhost:4173');

  return set;
}

/** Apex y subdominios HTTPS de intercambius.com.ar (p. ej. staging). */
export function isTrustedIntercambiusOrigin(origin: string): boolean {
  try {
    const u = new URL(origin);
    if (u.protocol !== 'https:') return false;
    return u.hostname === 'intercambius.com.ar' || u.hostname.endsWith('.intercambius.com.ar');
  } catch {
    return false;
  }
}

export function isCorsOriginAllowed(origin: string | undefined, allowed: Set<string>): boolean {
  if (!origin) return true;
  const normalized = origin.replace(/\/$/, '');
  if (allowed.has(normalized)) return true;
  return isTrustedIntercambiusOrigin(origin);
}

/** Cabeceras CORS en respuestas de error (Express) para que el navegador no oculte el mensaje tras CORS. */
export function applyCorsHeadersIfAllowed(req: Request, res: Response): void {
  const origin = req.get('Origin');
  if (!origin || !isCorsOriginAllowed(origin, getCorsAllowedOrigins())) return;
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Vary', 'Origin');
}

/**
 * Responde OPTIONS sin tocar la DB. Replica `Access-Control-Request-Headers` para que
 * cabeceras extra del cliente (p. ej. `X-Requested-With`) no fallen el preflight.
 */
export function handleOptionsPreflight(req: Request, res: Response, next: NextFunction): void {
  if (req.method !== 'OPTIONS') {
    next();
    return;
  }
  const origin = req.get('Origin');
  const allowed = getCorsAllowedOrigins();
  if (!origin) {
    next();
    return;
  }
  if (!isCorsOriginAllowed(origin, allowed)) {
    res.status(403).end();
    return;
  }
  const reqHeaders = req.get('Access-Control-Request-Headers');
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
  if (reqHeaders) {
    res.setHeader('Access-Control-Allow-Headers', reqHeaders);
  } else {
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, Accept, Origin, X-Requested-With',
    );
  }
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Vary', 'Origin');
  res.status(204).end();
}

/** CORS en peticiones reales (GET/POST + credenciales). Debe ir antes de middlewares lentos. */
export function corsMiddleware() {
  const allowed = getCorsAllowedOrigins();

  return cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }
      if (isCorsOriginAllowed(origin, allowed)) {
        return callback(null, origin);
      }
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'Origin',
      'X-Requested-With',
      'content-type',
      'authorization',
    ],
    optionsSuccessStatus: 204,
  });
}
