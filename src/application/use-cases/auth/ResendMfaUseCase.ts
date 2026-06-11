import jwt from 'jsonwebtoken';
import { IUserRepository } from '../../../domain/repositories/IUserRepository.js';
import { SendMfaAndRequireVerificationUseCase } from './SendMfaAndRequireVerificationUseCase.js';
import { mfaResendAvailableAt, mfaResendSecondsRemaining } from './mfa.constants.js';
import { MfaResendCooldownError } from './mfa.errors.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

type MfaTokenPayload = {
  userId: number;
  email: string;
  purpose?: string;
  sentAt?: number;
};

export class ResendMfaUseCase {
  private sendMfaUseCase: SendMfaAndRequireVerificationUseCase;

  constructor(private userRepository: IUserRepository) {
    this.sendMfaUseCase = new SendMfaAndRequireVerificationUseCase(userRepository);
  }

  async execute(mfaToken: string): Promise<{
    mfaToken: string;
    mfaSentTo: string;
    mfaResendAvailableAt: string;
  }> {
    let payload: MfaTokenPayload;
    try {
      payload = jwt.verify(mfaToken, JWT_SECRET) as MfaTokenPayload;
      if (payload.purpose !== 'mfa') throw new Error('Token inválido');
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        throw new Error('Sesión de verificación expirada. Volvé a iniciar sesión.');
      }
      throw new Error('Sesión de verificación inválida. Volvé a iniciar sesión.');
    }

    const sentAt = payload.sentAt ?? 0;
    const retryAfterSeconds = mfaResendSecondsRemaining(sentAt);
    if (retryAfterSeconds > 0) {
      throw new MfaResendCooldownError(retryAfterSeconds, mfaResendAvailableAt(sentAt));
    }

    const result = await this.sendMfaUseCase.execute(payload.userId, payload.email);
    return {
      mfaToken: result.mfaToken,
      mfaSentTo: result.sentTo,
      mfaResendAvailableAt: result.mfaResendAvailableAt,
    };
  }
}
