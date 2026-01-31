import express from 'express';
import { UserController } from '../controllers/UserController.js';
import { AuthRequest } from '../../infrastructure/middleware/auth.js';

export const usersRouter = express.Router();

usersRouter.get('/me', (req, res, next) => {
  const userId = (req as AuthRequest).userId;
  if (!userId) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  req.params.id = String(userId);
  UserController.getUserById(req as any, res);
});

usersRouter.get('/', UserController.getUsers);
usersRouter.get('/:id', UserController.getUserById);
usersRouter.post('/', UserController.createUser);
usersRouter.put('/:id', UserController.updateUser);
usersRouter.patch('/:id/saldo', UserController.updateUserSaldo);
