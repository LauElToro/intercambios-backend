import express from 'express';
import { ChatController } from '../controllers/ChatController.js';
import { authMiddleware } from '../../infrastructure/middleware/auth.js';

export const chatRouter = express.Router();

chatRouter.get('/', authMiddleware, ChatController.getConversaciones);
chatRouter.post('/iniciar', authMiddleware, ChatController.iniciarConversacion);
chatRouter.post(
  '/:conversacionId/codigo-intercambio',
  authMiddleware,
  ChatController.enviarCodigoIntercambio
);
chatRouter.post(
  '/:conversacionId/registro-intercambio',
  authMiddleware,
  ChatController.registroIntercambioConCodigo
);
chatRouter.get('/:conversacionId', authMiddleware, ChatController.getMensajes);
chatRouter.post('/:conversacionId', authMiddleware, ChatController.enviarMensaje);
