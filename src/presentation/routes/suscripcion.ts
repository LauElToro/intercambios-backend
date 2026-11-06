import express from 'express';
import { SuscripcionController } from '../controllers/SuscripcionController.js';

export const suscripcionRouter = express.Router();

suscripcionRouter.get('/estado', SuscripcionController.estado);
suscripcionRouter.post('/checkout', SuscripcionController.checkout);
