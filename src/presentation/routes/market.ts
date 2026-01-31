import express from 'express';
import { MarketController } from '../controllers/MarketController.js';

export const marketRouter = express.Router();

marketRouter.get('/', MarketController.getMarketItems);
marketRouter.get('/:id', MarketController.getMarketItemById);
marketRouter.post('/', MarketController.createMarketItem);
marketRouter.put('/:id', MarketController.updateMarketItem);
marketRouter.delete('/:id', MarketController.deleteMarketItem);
