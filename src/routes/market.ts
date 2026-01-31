import express from 'express';
import { getMarketItems, getMarketItemById, createMarketItem, updateMarketItem, deleteMarketItem } from '../controllers/market.js';

export const marketRouter = express.Router();

// GET /api/market - Obtener todos los items del market
marketRouter.get('/', getMarketItems);

// GET /api/market/:id - Obtener item por ID
marketRouter.get('/:id', getMarketItemById);

// POST /api/market - Crear nuevo item
marketRouter.post('/', createMarketItem);

// PUT /api/market/:id - Actualizar item
marketRouter.put('/:id', updateMarketItem);

// DELETE /api/market/:id - Eliminar item
marketRouter.delete('/:id', deleteMarketItem);
