import express from 'express';
import { MarketController } from '../controllers/MarketController.js';
import { authMiddleware } from '../../infrastructure/middleware/auth.js';

export const marketRouter = express.Router();

marketRouter.get('/', MarketController.getMarketItems);
marketRouter.get('/:id', MarketController.getMarketItemById);
marketRouter.post('/', authMiddleware, MarketController.createMarketItem);
marketRouter.put('/:id', authMiddleware, MarketController.updateMarketItem);
marketRouter.delete('/:id', authMiddleware, MarketController.deleteMarketItem);
