import express from 'express';
import { AdminController } from '../controllers/AdminController.js';
import { adminMiddleware } from '../../infrastructure/middleware/adminAuth.js';

export const adminRouter = express.Router();

adminRouter.use(adminMiddleware);

adminRouter.get('/metrics', AdminController.getMetrics);
adminRouter.get('/users', AdminController.getUsers);
adminRouter.post('/users/:id/ban', AdminController.banUser);
adminRouter.post('/users/:id/unban', AdminController.unbanUser);
adminRouter.delete('/users/:id', AdminController.deleteUser);
adminRouter.get('/productos', AdminController.getProductos);
adminRouter.get('/intercambios', AdminController.getIntercambios);
adminRouter.post('/newsletter', AdminController.sendNewsletter);
