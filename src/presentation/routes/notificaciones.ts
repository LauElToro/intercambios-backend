import express from 'express';
import { NotificacionController } from '../controllers/NotificacionController.js';
import { authMiddleware } from '../../infrastructure/middleware/auth.js';

export const notificacionesRouter = express.Router();

notificacionesRouter.use(authMiddleware);

notificacionesRouter.get('/', NotificacionController.getNotificaciones);
notificacionesRouter.patch('/leer-todas', NotificacionController.marcarTodasLeidas);
notificacionesRouter.patch('/:id/leer', NotificacionController.marcarLeida);
