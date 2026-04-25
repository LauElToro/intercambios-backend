import express from 'express';
import { KycController } from '../controllers/KycController.js';

export const kycRouter = express.Router();

kycRouter.post('/session', KycController.createSession);
kycRouter.post('/sync', KycController.syncFromDidit);
