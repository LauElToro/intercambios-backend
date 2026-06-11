import crypto from 'crypto';
import { IUserRepository } from '../../../domain/repositories/IUserRepository.js';
import { emailService } from '../../../infrastructure/services/email.service.js';
import { normalizeEmail } from '../../../utils/normalizeEmail.js';

const RESET_EXPIRY_MINUTES = 60;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

function maskEmail(email: string): string {
  return email.replace(/^(.{2}).*(@.*)$/, '$1***$2');
}

export class RequestPasswordResetUseCase {
  constructor(private userRepository: IUserRepository) {}

  async execute(email: string): Promise<void> {
    const normalized = normalizeEmail(email);
    const user = await this.userRepository.findByEmail(normalized);
    if (!user) {
      return;
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + RESET_EXPIRY_MINUTES * 60 * 1000);

    await this.userRepository.setPasswordResetToken(user.id, token, expiresAt);
    const resetLink = `${FRONTEND_URL}/restablecer-contrasena/${token}`;
    const deliveryEmail = normalizeEmail(user.email || normalized);
    console.log(`[PASSWORD_RESET] Enviando enlace a ${maskEmail(deliveryEmail)}`);
    await emailService.sendPasswordResetLink(deliveryEmail, resetLink, RESET_EXPIRY_MINUTES);
    console.log(`[PASSWORD_RESET] Enlace enviado OK a ${maskEmail(deliveryEmail)}`);
  }
}
