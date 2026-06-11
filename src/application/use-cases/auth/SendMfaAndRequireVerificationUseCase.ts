import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { IUserRepository } from '../../../domain/repositories/IUserRepository.js';
import { emailService } from '../../../infrastructure/services/email.service.js';
import { normalizeEmail } from '../../../utils/normalizeEmail.js';

const MFA_CODE_EXPIRY_MINUTES = 10;
const MFA_TEMP_TOKEN_EXPIRY = '15m';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

function generateSixDigitCode(): string {
  const n = Math.floor(100000 + Math.random() * 900000);
  return String(n);
}

function maskEmail(email: string): string {
  return email.replace(/^(.{2}).*(@.*)$/, '$1***$2');
}

export class SendMfaAndRequireVerificationUseCase {
  constructor(private userRepository: IUserRepository) {}

  async execute(userId: number, email: string): Promise<{ mfaToken: string; sentTo: string }> {
    const normalizedEmail = normalizeEmail(email);
    const code = generateSixDigitCode();
    const hashedCode = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + MFA_CODE_EXPIRY_MINUTES * 60 * 1000);

    await this.userRepository.setMfaCode(userId, hashedCode, expiresAt);
    console.log(`[MFA] Código generado para userId=${userId}, destino=${maskEmail(normalizedEmail)}`);
    await emailService.sendMfaCode(normalizedEmail, code);

    const mfaToken = jwt.sign(
      { userId, email: normalizedEmail, purpose: 'mfa' },
      JWT_SECRET,
      { expiresIn: MFA_TEMP_TOKEN_EXPIRY }
    );

    return { mfaToken, sentTo: normalizedEmail };
  }
}
