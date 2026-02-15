import crypto from 'crypto';
import { IUserRepository } from '../../../domain/repositories/IUserRepository.js';
import { emailService } from '../../../infrastructure/services/email.service.js';

const RESET_EXPIRY_MINUTES = 60;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

export class RequestPasswordResetUseCase {
  constructor(private userRepository: IUserRepository) {}

  async execute(email: string): Promise<void> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      return;
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + RESET_EXPIRY_MINUTES * 60 * 1000);

    await this.userRepository.setPasswordResetToken(user.id, token, expiresAt);
    const resetLink = `${FRONTEND_URL}/restablecer-contrasena/${token}`;
    await emailService.sendPasswordResetLink(email, resetLink, RESET_EXPIRY_MINUTES);
  }
}
