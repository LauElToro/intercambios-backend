import { User } from '../../../domain/entities/User.js';
import { IUserRepository } from '../../../domain/repositories/IUserRepository.js';
import { Currency } from '../../../domain/value-objects/Currency.js';

export class UpdateUserSaldoUseCase {
  constructor(private userRepository: IUserRepository) {}

  async execute(userId: number, creditos: number): Promise<User> {
    const user = await this.userRepository.findById(userId);
    
    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    const limiteCreditoNegativo = Currency.convertPesosToIX(Currency.getLimiteCreditoNegativo());
    user.actualizarSaldo(creditos, limiteCreditoNegativo);

    return await this.userRepository.update(user);
  }
}
