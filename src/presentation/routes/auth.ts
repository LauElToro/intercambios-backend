import express from 'express';
import { AuthController } from '../controllers/AuthController.js';

export const authRouter = express.Router();

authRouter.post('/login', AuthController.login);
authRouter.post('/refresh', AuthController.refresh);
authRouter.post('/admin-login', AuthController.adminLogin);
authRouter.post('/verify-mfa', AuthController.verifyMfa);
authRouter.post('/resend-mfa', AuthController.resendMfa);
authRouter.post('/forgot-password', AuthController.requestPasswordReset);
authRouter.post('/reset-password', AuthController.resetPassword);
authRouter.post('/register', AuthController.register);
authRouter.post('/google/code', AuthController.googleAuthCode);
authRouter.post('/google', AuthController.googleAuth);
