import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { LoginUseCase } from '../../application/use-cases/auth/LoginUseCase.js';
import { RegisterUseCase } from '../../application/use-cases/auth/RegisterUseCase.js';
import { VerifyMfaUseCase } from '../../application/use-cases/auth/VerifyMfaUseCase.js';
import { RequestPasswordResetUseCase } from '../../application/use-cases/auth/RequestPasswordResetUseCase.js';
import { ResetPasswordUseCase } from '../../application/use-cases/auth/ResetPasswordUseCase.js';
import { UserRepository } from '../../infrastructure/repositories/UserRepository.js';
import prisma from '../../infrastructure/database/prisma.js';

const userRepository = new UserRepository();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
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
      const status = error.message === 'Usuario suspendido' ? 403 : 401;
      res.status(status).json({ error: error.message });
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

  static async adminLogin(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      const adminEmail = process.env.ADMIN_EMAIL;
      const adminPassword = process.env.ADMIN_PASSWORD;

      if (!adminEmail || !adminPassword) {
        return res.status(503).json({ error: 'Admin no configurado' });
      }
      if (!email || !password) {
        return res.status(400).json({ error: 'Email y contraseña son requeridos' });
      }
      if (email !== adminEmail || password !== adminPassword) {
        return res.status(401).json({ error: 'Credenciales de admin inválidas' });
      }

      const token = jwt.sign(
        { admin: true },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      res.json({ token });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async register(req: Request, res: Response) {
    try {
      const { nombre, email, password, contacto, ubicacion, codigoReferido, aceptaTerminos } = req.body;
      
      if (!nombre || !email || !password || !contacto) {
        return res.status(400).json({ error: 'Faltan campos requeridos: nombre, email, password, contacto' });
      }

      if (aceptaTerminos !== true) {
        return res.status(400).json({ error: 'Debés aceptar los términos y condiciones para registrarte' });
      }

      // El caso de uso hashea la contraseña una sola vez; no hashear aquí
      const user = await registerUseCase.execute({
        nombre,
        email,
        password,
        contacto,
        ubicacion,
        aceptaTerminos: true,
        codigoReferido: typeof codigoReferido === 'string' ? codigoReferido : undefined,
      });

      // No devolver password
      const { password: _, ...userWithoutPassword } = user as any;
      res.status(201).json(userWithoutPassword);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * Emite un JWT nuevo. Acepta token vigente o vencido hace como máximo 30 días (misma firma / secret).
   */
  static async refresh(req: Request, res: Response) {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No autorizado' });
      }
      const token = authHeader.substring(7);

      let payload: jwt.JwtPayload & { userId?: number; email?: string };
      try {
        payload = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload & { userId?: number; email?: string };
      } catch (e) {
        if (e instanceof jwt.TokenExpiredError) {
          try {
            payload = jwt.verify(token, JWT_SECRET, {
              ignoreExpiration: true,
            }) as jwt.JwtPayload & { userId?: number; email?: string };
          } catch {
            return res.status(401).json({ error: 'Token inválido' });
          }
          const nowSec = Math.floor(Date.now() / 1000);
          const maxGraceSec = 60 * 60 * 24 * 30;
          if (typeof payload.exp === 'number' && payload.exp < nowSec - maxGraceSec) {
            return res.status(401).json({ error: 'Sesión expirada. Iniciá sesión de nuevo.' });
          }
        } else if (e instanceof jwt.JsonWebTokenError) {
          return res.status(401).json({ error: 'Token inválido' });
        } else {
          return res.status(401).json({ error: 'Token inválido' });
        }
      }

      const userId = payload.userId;
      const email = typeof payload.email === 'string' ? payload.email : undefined;
      if (typeof userId !== 'number' || !email) {
        return res.status(401).json({ error: 'Token inválido' });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, bannedAt: true },
      });
      if (!user?.email || user.bannedAt) {
        return res.status(401).json({ error: 'Token inválido' });
      }

      const newToken = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ token: newToken });
    } catch (error: any) {
      res.status(500).json({ error: error?.message || 'Error al renovar sesión' });
    }
  }
}
