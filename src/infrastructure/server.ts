import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { usersRouter } from '../presentation/routes/users.js';
import { marketRouter } from '../presentation/routes/market.js';
import { coincidenciasRouter } from '../presentation/routes/coincidencias.js';
import { intercambiosRouter } from '../presentation/routes/intercambios.js';
import { authRouter } from '../presentation/routes/auth.js';
import { uploadRouter } from '../presentation/routes/upload.js';
import { authMiddleware } from '../infrastructure/middleware/auth.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Intercambius API is running' });
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
