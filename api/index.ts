import '../src/infrastructure/config/load-env.js';
import express, { Request, Response, NextFunction } from 'express';
import { applyCorsHeadersIfAllowed, corsMiddleware, handleOptionsPreflight } from '../src/config/cors.js';
import { usersRouter } from '../src/presentation/routes/users.js';
import { marketRouter } from '../src/presentation/routes/market.js';
import { coincidenciasRouter } from '../src/presentation/routes/coincidencias.js';
import { intercambiosRouter } from '../src/presentation/routes/intercambios.js';
import { authRouter } from '../src/presentation/routes/auth.js';
import { uploadRouter } from '../src/presentation/routes/upload.js';
import { favoritosRouter } from '../src/presentation/routes/favoritos.js';
import { checkoutRouter } from '../src/presentation/routes/checkout.js';
import { chatRouter } from '../src/presentation/routes/chat.js';
import { adminRouter } from '../src/presentation/routes/admin.js';
import { busquedasRouter } from '../src/presentation/routes/busquedas.js';
import { notificacionesRouter } from '../src/presentation/routes/notificaciones.js';
import { referidosRouter } from '../src/presentation/routes/referidos.js';
import { contactRouter } from '../src/presentation/routes/contact.js';
import { evaluacionesRouter } from '../src/presentation/routes/evaluaciones.js';
import { geoRouter } from '../src/presentation/routes/geo.js';
import { kycRouter } from '../src/presentation/routes/kyc.js';
import { webhooksRouter } from '../src/presentation/routes/webhooks.js';
import { authMiddleware } from '../src/infrastructure/middleware/auth.js';
import type { AuthRequest } from '../src/infrastructure/middleware/auth.js';
import { UserController } from '../src/presentation/controllers/UserController.js';
import { ensureSchema } from '../src/infrastructure/database/ensureSchema.js';

const app = express();

// Preflight síncrono sin Prisma (evita que el navegador reporte solo “CORS” si el cold start falla antes).
app.use(handleOptionsPreflight);
// CORS en peticiones reales (GET/POST, etc.)
app.use(corsMiddleware());

// Sincronizar schema de la DB en cada cold start (añade columnas/tablas faltantes)
app.use(async (req: Request, _res: Response, next: NextFunction) => {
  if (req.method === 'OPTIONS') {
    next();
    return;
  }
  try {
    await ensureSchema();
  } catch {
    // seguir aunque falle (ej. sin DATABASE_URL)
  }
  next();
});
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Root endpoint - información de la API
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'Intercambius API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      market: '/api/market',
      coincidencias: '/api/coincidencias',
      users: '/api/users (protected)',
      intercambios: '/api/intercambios (protected)',
      upload: '/api/upload (protected)'
    }
  });
});

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/api/health/email', async (_req: Request, res: Response) => {
  try {
    const { checkEmailDeliveryStatus } = await import('../src/infrastructure/services/email.service.js');
    const email = await checkEmailDeliveryStatus();
    const ok = email.configured && (email.mode !== 'oauth' || email.oauthTokenOk === true);
    res.status(ok ? 200 : 503).json({ ok, email });
  } catch (err) {
    res.status(503).json({
      ok: false,
      email: { error: err instanceof Error ? err.message : String(err) },
    });
  }
});

/** Envía MFA de prueba al inbox indicado. Requiere header X-Email-Diag-Key = EMAIL_DIAG_SECRET en Vercel. */
app.post('/api/health/email/send-test', async (req: Request, res: Response) => {
  const secret = process.env.EMAIL_DIAG_SECRET?.trim();
  const key = req.get('X-Email-Diag-Key')?.trim();
  if (!secret || key !== secret) {
    return res.status(404).json({ error: 'Not found' });
  }
  const to = String(req.body?.to || '').trim().toLowerCase();
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return res.status(400).json({ error: 'Body.to debe ser un email válido' });
  }
  try {
    const { emailService } = await import('../src/infrastructure/services/email.service.js');
    await emailService.sendMfaTest(to);
    res.json({ ok: true, message: `MFA de prueba enviado a ${to}` });
  } catch (err) {
    res.status(503).json({
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

// Public routes
app.use('/api/auth', authRouter);
app.use('/api/market', marketRouter);
app.use('/api/coincidencias', coincidenciasRouter);
app.use('/api/contact', contactRouter);
app.use('/api/geo', geoRouter);
app.use('/api/webhooks', webhooksRouter);

// Perfil de comunidad: requiere sesión (id numérico; /me va al router protegido)
app.get('/api/users/:id', (req, res, next) => {
  if (req.params.id === 'me') return next();
  return authMiddleware(req, res, (err?: unknown) => {
    if (err) return next(err);
    return UserController.getPublicProfile(req as AuthRequest, res);
  });
});

// Protected routes
app.use('/api/users', authMiddleware, usersRouter);
app.use('/api/intercambios', intercambiosRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/favoritos', favoritosRouter);
app.use('/api/busquedas', busquedasRouter);
app.use('/api/notificaciones', notificacionesRouter);
app.use('/api/checkout', checkoutRouter);
app.use('/api/chat', chatRouter);
app.use('/api/admin', adminRouter);
app.use('/api/referidos', referidosRouter);
app.use('/api/evaluaciones', evaluacionesRouter);
app.use('/api/kyc', authMiddleware, kycRouter);

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  applyCorsHeadersIfAllowed(req, res);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  applyCorsHeadersIfAllowed(req, res);
  res.status(404).json({ error: 'Route not found' });
});

// Export para Vercel serverless
export default app;
