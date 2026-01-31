import { Intercambio } from '../../../domain/entities/Intercambio.js';
import { IIntercambioRepository } from '../../../domain/repositories/IIntercambioRepository.js';

export class GetIntercambiosUseCase {
  constructor(private intercambioRepository: IIntercambioRepository) {}

  async execute(userId: number): Promise<Intercambio[]> {
    return await this.intercambioRepository.findByUserId(userId);
  }
}
