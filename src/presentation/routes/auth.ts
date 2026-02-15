import express from 'express';
import { AuthController } from '../controllers/AuthController.js';

export const authRouter = express.Router();

authRouter.post('/login', AuthController.login);
authRouter.post('/verify-mfa', AuthController.verifyMfa);
authRouter.post('/forgot-password', AuthController.requestPasswordReset);
authRouter.post('/reset-password', AuthController.resetPassword);
authRouter.post('/register', AuthController.register);
