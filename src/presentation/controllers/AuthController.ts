import { Request, Response } from 'express';
import { LoginUseCase } from '../../application/use-cases/auth/LoginUseCase.js';
import { RegisterUseCase } from '../../application/use-cases/auth/RegisterUseCase.js';
import { UserRepository } from '../../infrastructure/repositories/UserRepository.js';

const userRepository = new UserRepository();
const loginUseCase = new LoginUseCase(userRepository);
const registerUseCase = new RegisterUseCase(userRepository);

export class AuthController {
  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: 'Email y contraseña son requeridos' });
      }

      const result = await loginUseCase.execute({ email, password });
      res.json(result);
    } catch (error: any) {
      res.status(401).json({ error: error.message });
    }
  }

  static async register(req: Request, res: Response) {
    try {
      const { nombre, email, password, contacto, ubicacion } = req.body;
      
      if (!nombre || !email || !password || !contacto) {
        return res.status(400).json({ error: 'Faltan campos requeridos: nombre, email, password, contacto' });
      }

      // El caso de uso hashea la contraseña una sola vez; no hashear aquí
      const user = await registerUseCase.execute({
        nombre,
        email,
        password,
        contacto,
        ubicacion,
      });

      // No devolver password
      const { password: _, ...userWithoutPassword } = user as any;
      res.status(201).json(userWithoutPassword);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}
