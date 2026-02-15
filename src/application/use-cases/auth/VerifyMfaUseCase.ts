import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { IUserRepository } from '../../../domain/repositories/IUserRepository.js';
import { emailService } from '../../../infrastructure/services/email.service.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export class VerifyMfaUseCase {
  constructor(private userRepository: IUserRepository) {}

  async execute(mfaToken: string, code: string): Promise<{ token: string; user: any }> {
    let payload: { userId: number; email: string; purpose?: string };
    try {
      payload = jwt.verify(mfaToken, JWT_SECRET) as typeof payload;
      if (payload.purpose !== 'mfa') throw new Error('Token inválido');
    } catch {
      throw new Error('Código expirado o inválido. Volvé a iniciar sesión.');
    }

    const mfaData = await this.userRepository.getMfaCodeAndExpiry(payload.userId);
    if (!mfaData) {
      throw new Error('Código expirado o ya usado. Volvé a iniciar sesión.');
    }
    if (new Date() > mfaData.mfaCodeExpiresAt) {
      await this.userRepository.clearMfaCode(payload.userId);
      throw new Error('Código expirado. Volvé a iniciar sesión.');
    }

    const valid = await bcrypt.compare(code, mfaData.mfaCode);
    if (!valid) {
      throw new Error('Código incorrecto');
    }

    await this.userRepository.clearMfaCode(payload.userId);

    const user = await this.userRepository.findById(payload.userId);
    if (!user) throw new Error('Usuario no encontrado');

    emailService.sendLoginSuccess(payload.email, user.nombre).catch((err) =>
      console.error('[VerifyMfaUseCase] Error enviando email login:', err)
    );

    const token = jwt.sign(
      { userId: user.id, email: payload.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const userData = typeof (user as any).toJSON === 'function'
      ? (user as any).toJSON()
      : { ...user, saldo: user.saldo, limite: user.limite };

    return { token, user: userData };
  }
}
