import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { IUserRepository } from '../../../domain/repositories/IUserRepository.js';
import { User } from '../../../domain/entities/User.js';
import { verifyGoogleIdToken } from '../../../infrastructure/services/google-id-token.service.js';
import { emailService } from '../../../infrastructure/services/email.service.js';
import prisma from '../../../infrastructure/database/prisma.js';
import { serializeAuthUser } from './auth-user.utils.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export class GoogleAuthAccountNotFoundError extends Error {
  constructor() {
    super('No hay cuenta con ese Google. Registrate primero.');
    this.name = 'GoogleAuthAccountNotFoundError';
  }
}

export interface GoogleAuthParams {
  credential: string;
  mode: 'login' | 'register';
  aceptaTerminos?: boolean;
  codigoReferido?: string;
  ubicacion?: string;
  contacto?: string;
}

export class GoogleAuthUseCase {
  constructor(private userRepository: IUserRepository) {}

  async execute(params: GoogleAuthParams): Promise<{ token: string; user: Record<string, unknown>; isNewUser: boolean }> {
    const profile = await verifyGoogleIdToken(params.credential);
    if (!profile.emailVerified) {
      throw new Error('Tu email de Google no está verificado');
    }

    let user = await this.userRepository.findByGoogleId(profile.googleId);
    if (!user) {
      user = await this.userRepository.findByEmail(profile.email);
      if (user) {
        await this.userRepository.linkGoogleAccount(user.id!, profile.googleId, profile.fotoPerfil);
        user = (await this.userRepository.findById(user.id!))!;
      }
    }

    if (user) {
      await this.assertUserCanLogin(user.id!);
      return this.issueSession(user, false);
    }

    if (params.mode === 'login') {
      throw new GoogleAuthAccountNotFoundError();
    }

    if (params.aceptaTerminos !== true) {
      throw new Error('Debés aceptar los términos y condiciones para registrarte');
    }

    const randomPassword = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
    const newUser = User.create({
      nombre: profile.nombre,
      contacto: params.contacto?.trim() || profile.email,
      ofrece: '',
      necesita: '',
      precioOferta: 0,
      email: profile.email,
      ubicacion: params.ubicacion?.trim() || 'CABA',
      fotoPerfil: profile.fotoPerfil,
    });

    const savedUser = await (this.userRepository as IUserRepository).save(newUser, randomPassword, {
      googleId: profile.googleId,
      fotoPerfil: profile.fotoPerfil,
    });

    await prisma.user.update({
      where: { id: savedUser.id! },
      data: { terminosAceptadosAt: new Date() },
    });

    const codigo = (params.codigoReferido || '').trim();
    if (codigo) {
      try {
        const referente = await prisma.user.findFirst({
          where: { OR: [{ referralCode: codigo }, { referralSlug: codigo }] },
          select: { id: true },
        });
        if (referente && referente.id !== savedUser.id) {
          await prisma.user.update({
            where: { id: savedUser.id! },
            data: { referredById: referente.id, referralCodeUsed: codigo },
          });
        }
      } catch (err) {
        console.error('[GoogleAuthUseCase] referido:', (err as Error)?.message);
      }
    }

    emailService.sendWelcome(profile.email, profile.nombre).catch((err) =>
      console.error('[GoogleAuthUseCase] welcome email:', err),
    );

    return this.issueSession(savedUser, true);
  }

  private async assertUserCanLogin(userId: number): Promise<void> {
    const row = await prisma.user.findUnique({
      where: { id: userId },
      select: { bannedAt: true },
    });
    if (row?.bannedAt) {
      throw new Error('Usuario suspendido');
    }
  }

  private issueSession(user: User, isNewUser: boolean) {
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' },
    );
    return { token, user: serializeAuthUser(user), isNewUser };
  }
}
