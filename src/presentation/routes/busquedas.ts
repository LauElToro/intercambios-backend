import express from 'express';
import { authMiddleware } from '../../infrastructure/middleware/auth.js';
import { BusquedasController } from '../controllers/BusquedasController.js';

export const busquedasRouter = express.Router();

busquedasRouter.post('/', authMiddleware, BusquedasController.registrar);
