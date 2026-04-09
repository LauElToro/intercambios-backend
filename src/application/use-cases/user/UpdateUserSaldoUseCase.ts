import { User } from '../../../domain/entities/User.js';
import { IUserRepository } from '../../../domain/repositories/IUserRepository.js';
import { DEFAULT_CREDIT_LIMIT_IOX } from '../../../config/credit.js';

export class UpdateUserSaldoUseCase {
  constructor(private userRepository: IUserRepository) {}

  async execute(userId: number, creditos: number): Promise<User> {
    const user = await this.userRepository.findById(userId);
    
    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    const limiteCreditoNegativo = user.limite ?? DEFAULT_CREDIT_LIMIT_IOX;
    user.actualizarSaldo(creditos, limiteCreditoNegativo);

    return await this.userRepository.update(user);
  }
}
