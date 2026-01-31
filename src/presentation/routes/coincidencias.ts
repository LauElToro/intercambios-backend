import express from 'express';
import { CoincidenciasController } from '../controllers/CoincidenciasController.js';

export const coincidenciasRouter = express.Router();

// Ruta con query param para userId (más flexible)
coincidenciasRouter.get('/', CoincidenciasController.getCoincidencias);
coincidenciasRouter.get('/:userId', CoincidenciasController.getCoincidencias);
