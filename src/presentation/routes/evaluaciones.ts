import express from 'express';
import { EvaluacionController } from '../controllers/EvaluacionController.js';
import { authMiddleware } from '../../infrastructure/middleware/auth.js';

export const evaluacionesRouter = express.Router();

evaluacionesRouter.use(authMiddleware);
evaluacionesRouter.get('/pendientes', EvaluacionController.getPendientes);
evaluacionesRouter.get('/contexto/:intercambioId', EvaluacionController.getContexto);
evaluacionesRouter.post('/', EvaluacionController.crear);
