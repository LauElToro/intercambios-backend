import express from 'express';
import { DiditWebhookController } from '../controllers/DiditWebhookController.js';

export const webhooksRouter = express.Router();

webhooksRouter.post('/didit', DiditWebhookController.handle);
