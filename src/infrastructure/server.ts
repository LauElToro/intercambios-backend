import express from 'express';
import dotenv from 'dotenv';
import { corsMiddleware, handleOptionsPreflight } from '../config/cors.js';
import { usersRouter } from '../presentation/routes/users.js';
import { marketRouter } from '../presentation/routes/market.js';
import { coincidenciasRouter } from '../presentation/routes/coincidencias.js';
import { intercambiosRouter } from '../presentation/routes/intercambios.js';
import { authRouter } from '../presentation/routes/auth.js';
import { uploadRouter } from '../presentation/routes/upload.js';
import { favoritosRouter } from '../presentation/routes/favoritos.js';
import { checkoutRouter } from '../presentation/routes/checkout.js';
import { chatRouter } from '../presentation/routes/chat.js';
import { adminRouter } from '../presentation/routes/admin.js';
import { busquedasRouter } from '../presentation/routes/busquedas.js';
import { notificacionesRouter } from '../presentation/routes/notificaciones.js';
import { referidosRouter } from '../presentation/routes/referidos.js';
import { contactRouter } from '../presentation/routes/contact.js';
import { kycRouter } from '../presentation/routes/kyc.js';
import { webhooksRouter } from '../presentation/routes/webhooks.js';
import { authMiddleware } from '../infrastructure/middleware/auth.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware (alineado con api/index.ts en Vercel)
app.use(handleOptionsPreflight);
app.use(corsMiddleware());
app.use(express.json());

// Health check
app.get('/health', (req: express.Request, res: express.Response) => {
  res.json({ status: 'ok', message: 'Intercambius API is running' });
});

// Public routes
app.use('/api/auth', authRouter);
app.use('/api/market', marketRouter);
app.use('/api/coincidencias', coincidenciasRouter);
app.use('/api/contact', contactRouter);
app.use('/api/webhooks', webhooksRouter);

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
app.use('/api/kyc', authMiddleware, kycRouter);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
