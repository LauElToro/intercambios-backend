import express from 'express';
import { UploadController } from '../controllers/UploadController.js';
import { authMiddleware } from '../../infrastructure/middleware/auth.js';

export const uploadRouter = express.Router();

uploadRouter.use(authMiddleware);
uploadRouter.post('/', UploadController.upload, UploadController.uploadImage);
