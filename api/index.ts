import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
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
import { authMiddleware } from '../src/infrastructure/middleware/auth.js';
import { UserController } from '../src/presentation/controllers/UserController.js';
import { ensureSchema } from '../src/infrastructure/database/ensureSchema.js';

// Cargar variables de entorno
dotenv.config();

const app = express();

// Sincronizar schema de la DB en cada cold start (añade columnas/tablas faltantes)
app.use(async (_req: Request, _res: Response, next: NextFunction) => {
  try {
    await ensureSchema();
  } catch {
    // seguir aunque falle (ej. sin DATABASE_URL)
  }
  next();
});

// CORS: el origen debe coincidir exactamente con lo que envía el navegador (sin barra final).
// Normalizamos FRONTEND_URL y reflejamos el origen de la petición para evitar 401 por CORS.
const allowedOrigin = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.replace(/\/$/, '') : '*';
app.use(cors({
  origin: (origin, callback) => {
    if (allowedOrigin === '*' || !origin) return callback(null, true);
    const originNormalized = origin.replace(/\/$/, '');
    if (originNormalized === allowedOrigin) return callback(null, origin);
    callback(null, false);
  },
  credentials: true,
}));
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

// Public routes
app.use('/api/auth', authRouter);
app.use('/api/market', marketRouter);
app.use('/api/coincidencias', coincidenciasRouter);

// Perfil público: ver perfiles sin login (id numérico; /me va al router protegido)
app.get('/api/users/:id', (req, res, next) => {
  if (req.params.id === 'me') return next();
  return UserController.getPublicProfile(req, res);
});

// Protected routes
app.use('/api/users', authMiddleware, usersRouter);
app.use('/api/intercambios', intercambiosRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/favoritos', favoritosRouter);
app.use('/api/busquedas', busquedasRouter);
app.use('/api/checkout', checkoutRouter);
app.use('/api/chat', chatRouter);
app.use('/api/admin', adminRouter);

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

// Export para Vercel serverless
export default app;
