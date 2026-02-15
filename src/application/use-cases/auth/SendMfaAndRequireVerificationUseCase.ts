import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { IUserRepository } from '../../../domain/repositories/IUserRepository.js';
import { emailService } from '../../../infrastructure/services/email.service.js';

const MFA_CODE_EXPIRY_MINUTES = 10;
const MFA_TEMP_TOKEN_EXPIRY = '15m';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

function generateSixDigitCode(): string {
  const n = Math.floor(100000 + Math.random() * 900000);
  return String(n);
}

export class SendMfaAndRequireVerificationUseCase {
  constructor(private userRepository: IUserRepository) {}

  async execute(userId: number, email: string): Promise<{ mfaToken: string }> {
    const code = generateSixDigitCode();
    const hashedCode = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + MFA_CODE_EXPIRY_MINUTES * 60 * 1000);

    await this.userRepository.setMfaCode(userId, hashedCode, expiresAt);
    await emailService.sendMfaCode(email, code);

    const mfaToken = jwt.sign(
      { userId, email, purpose: 'mfa' },
      JWT_SECRET,
      { expiresIn: MFA_TEMP_TOKEN_EXPIRY }
    );

    return { mfaToken };
  }
}
