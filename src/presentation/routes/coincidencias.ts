import express from 'express';
import { CoincidenciasController } from '../controllers/CoincidenciasController.js';

export const coincidenciasRouter = express.Router();

coincidenciasRouter.get('/:userId', CoincidenciasController.getCoincidencias);
