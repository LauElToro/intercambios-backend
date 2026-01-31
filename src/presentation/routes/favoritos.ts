import express from 'express';
import { FavoritosController } from '../controllers/FavoritosController.js';
import { authMiddleware } from '../../infrastructure/middleware/auth.js';

export const favoritosRouter = express.Router();

favoritosRouter.use(authMiddleware);

favoritosRouter.get('/', FavoritosController.getFavoritos);
favoritosRouter.post('/:marketItemId', FavoritosController.toggleFavorito);
favoritosRouter.get('/:marketItemId', FavoritosController.isFavorito);
