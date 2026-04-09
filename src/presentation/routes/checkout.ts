import express from 'express';
import { CheckoutController } from '../controllers/CheckoutController.js';
import { authMiddleware } from '../../infrastructure/middleware/auth.js';

export const checkoutRouter = express.Router();

checkoutRouter.post('/:marketItemId', authMiddleware, CheckoutController.checkout);
