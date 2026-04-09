import express from 'express';
import { authMiddleware } from '../../infrastructure/middleware/auth.js';
import { ReferidosController } from '../controllers/ReferidosController.js';

export const referidosRouter = express.Router();

referidosRouter.use(authMiddleware);

referidosRouter.get('/me', ReferidosController.getMe);
referidosRouter.put('/me/slug', ReferidosController.updateSlug);

