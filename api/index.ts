import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { usersRouter } from '../src/presentation/routes/users.js';
import { marketRouter } from '../src/presentation/routes/market.js';
import { coincidenciasRouter } from '../src/presentation/routes/coincidencias.js';
import { intercambiosRouter } from '../src/presentation/routes/intercambios.js';
import { authRouter } from '../src/presentation/routes/auth.js';
import { uploadRouter } from '../src/presentation/routes/upload.js';
import { authMiddleware } from '../src/infrastructure/middleware/auth.js';

// Cargar variables de entorno
dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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

// Protected routes
app.use('/api/users', authMiddleware, usersRouter);
app.use('/api/intercambios', intercambiosRouter);
app.use('/api/upload', uploadRouter);

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
