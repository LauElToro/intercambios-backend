import cors from 'cors';

/** Orígenes permitidos sin barra final (como envía el navegador). */
export function getCorsAllowedOrigins(): Set<string> {
  const set = new Set<string>();
  const add = (raw?: string | null) => {
    const n = raw?.trim().replace(/\/$/, '');
    if (n) set.add(n);
  };

  add(process.env.FRONTEND_URL);
  for (const part of (process.env.CORS_ORIGINS || '').split(',')) {
    add(part);
  }

  // Desarrollo local (Vite / preview / puertos habituales)
  add('http://localhost:5173');
  add('http://127.0.0.1:5173');
  add('http://localhost:8080');
  add('http://localhost:4173');

  return set;
}

/**
 * CORS para browser + `Authorization`. Debe ir **antes** de middlewares lentos (p. ej. DB en cold start)
 * para que el preflight OPTIONS responda rápido.
 */
export function corsMiddleware() {
  const allowed = getCorsAllowedOrigins();

  return cors({
    origin(origin, callback) {
      // Sin header Origin: mismo origen, curl, health checks
      if (!origin) {
        return callback(null, true);
      }
      const normalized = origin.replace(/\/$/, '');
      if (allowed.has(normalized)) {
        return callback(null, origin);
      }
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });
}
