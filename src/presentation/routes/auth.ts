import express from 'express';
import { AuthController } from '../controllers/AuthController.js';

export const authRouter = express.Router();

authRouter.post('/login', AuthController.login);
authRouter.post('/register', AuthController.register);
