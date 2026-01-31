import express from 'express';
import { IntercambioController } from '../controllers/IntercambioController.js';
import { authMiddleware } from '../../infrastructure/middleware/auth.js';

export const intercambiosRouter = express.Router();

// Todas las rutas requieren autenticación
intercambiosRouter.use(authMiddleware);

intercambiosRouter.get('/:userId', IntercambioController.getIntercambios);
intercambiosRouter.post('/', IntercambioController.createIntercambio);
intercambiosRouter.patch('/:id/confirm', IntercambioController.confirmIntercambio);
