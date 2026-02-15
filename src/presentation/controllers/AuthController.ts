import { Request, Response } from 'express';
import { LoginUseCase } from '../../application/use-cases/auth/LoginUseCase.js';
import { RegisterUseCase } from '../../application/use-cases/auth/RegisterUseCase.js';
import { VerifyMfaUseCase } from '../../application/use-cases/auth/VerifyMfaUseCase.js';
import { RequestPasswordResetUseCase } from '../../application/use-cases/auth/RequestPasswordResetUseCase.js';
import { ResetPasswordUseCase } from '../../application/use-cases/auth/ResetPasswordUseCase.js';
import { UserRepository } from '../../infrastructure/repositories/UserRepository.js';

const userRepository = new UserRepository();
const loginUseCase = new LoginUseCase(userRepository);
const registerUseCase = new RegisterUseCase(userRepository);
const verifyMfaUseCase = new VerifyMfaUseCase(userRepository);
const requestPasswordResetUseCase = new RequestPasswordResetUseCase(userRepository);
const resetPasswordUseCase = new ResetPasswordUseCase(userRepository);

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

  static async verifyMfa(req: Request, res: Response) {
    try {
      const { mfaToken, code } = req.body;
      if (!mfaToken || !code || String(code).length !== 6) {
        return res.status(400).json({ error: 'Código de 6 dígitos requerido' });
      }
      const result = await verifyMfaUseCase.execute(mfaToken, String(code).trim());
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async requestPasswordReset(req: Request, res: Response) {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: 'Email es requerido' });
      }
      await requestPasswordResetUseCase.execute(email);
      res.json({ message: 'Si el email existe, recibirás un enlace para restablecer tu contraseña' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async resetPassword(req: Request, res: Response) {
    try {
      const { token, newPassword } = req.body;
      if (!token || !newPassword) {
        return res.status(400).json({ error: 'Token y nueva contraseña son requeridos' });
      }
      await resetPasswordUseCase.execute(token, newPassword);
      res.json({ message: 'Contraseña actualizada. Ya podés iniciar sesión.' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
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
