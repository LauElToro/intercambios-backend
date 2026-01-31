import express from 'express';
import { UserController } from '../controllers/UserController.js';

export const usersRouter = express.Router();

usersRouter.get('/', UserController.getUsers);
usersRouter.get('/:id', UserController.getUserById);
usersRouter.post('/', UserController.createUser);
usersRouter.put('/:id', UserController.updateUser);
usersRouter.patch('/:id/saldo', UserController.updateUserSaldo);
