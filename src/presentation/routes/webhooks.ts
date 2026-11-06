import express from 'express';
import { DiditWebhookController } from '../controllers/DiditWebhookController.js';
import { SuscripcionController } from '../controllers/SuscripcionController.js';

export const webhooksRouter = express.Router();

webhooksRouter.post('/didit', DiditWebhookController.handle);
webhooksRouter.post('/mercadopago', SuscripcionController.webhook);
webhooksRouter.get('/mercadopago', SuscripcionController.webhook);
