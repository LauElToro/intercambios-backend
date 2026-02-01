import express from 'express';
import { ChatController } from '../controllers/ChatController.js';
import { authMiddleware } from '../../infrastructure/middleware/auth.js';

export const chatRouter = express.Router();

chatRouter.get('/', authMiddleware, ChatController.getConversaciones);
chatRouter.get('/:conversacionId', authMiddleware, ChatController.getMensajes);
chatRouter.post('/:conversacionId', authMiddleware, ChatController.enviarMensaje);
