import bcrypt from 'bcryptjs';
import { IUserRepository } from '../../../domain/repositories/IUserRepository.js';

export class ResetPasswordUseCase {
  constructor(private userRepository: IUserRepository) {}

  async execute(token: string, newPassword: string): Promise<void> {
    if (!newPassword || newPassword.length < 6) {
      throw new Error('La contraseña debe tener al menos 6 caracteres');
    }

    const user = await this.userRepository.findByPasswordResetToken(token);
    if (!user) {
      throw new Error('El enlace de restablecimiento expiró o no es válido');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.userRepository.updatePassword(user.id, hashedPassword);
    await this.userRepository.clearPasswordResetToken(user.id);
  }
}
