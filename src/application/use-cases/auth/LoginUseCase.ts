import bcrypt from 'bcryptjs';
import { IUserRepository } from '../../../domain/repositories/IUserRepository.js';
import { LoginCredentials } from '../../../domain/entities/Auth.js';
import { SendMfaAndRequireVerificationUseCase } from './SendMfaAndRequireVerificationUseCase.js';

export class LoginUseCase {
  private sendMfaUseCase: SendMfaAndRequireVerificationUseCase;

  constructor(private userRepository: IUserRepository) {
    this.sendMfaUseCase = new SendMfaAndRequireVerificationUseCase(userRepository);
  }

  async execute(credentials: LoginCredentials): Promise<{ mfaRequired: true; mfaToken: string; mfaSentTo: string }> {
    const emailInput = credentials.email.trim().toLowerCase();
    const result = await this.userRepository.getUserWithPassword(emailInput);

    if (!result) {
      throw new Error('Credenciales inválidas');
    }

    const { user, password: hashedPassword } = result;

    const isValid = await bcrypt.compare(credentials.password, hashedPassword);

    if (!isValid) {
      throw new Error('Credenciales inválidas');
    }

    const email = (user.email || emailInput).trim().toLowerCase();
    const { mfaToken, sentTo } = await this.sendMfaUseCase.execute(user.id, email);
    return { mfaRequired: true, mfaToken, mfaSentTo: sentTo };
  }
}
