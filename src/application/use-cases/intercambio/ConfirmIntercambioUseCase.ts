import { Intercambio } from '../../../domain/entities/Intercambio.js';
import { IIntercambioRepository } from '../../../domain/repositories/IIntercambioRepository.js';

export class ConfirmIntercambioUseCase {
  constructor(private intercambioRepository: IIntercambioRepository) {}

  async execute(intercambioId: number): Promise<Intercambio> {
    const intercambio = await this.intercambioRepository.findById(intercambioId);
    
    if (!intercambio) {
      throw new Error('Intercambio no encontrado');
    }

    intercambio.confirmar();
    return await this.intercambioRepository.update(intercambio);
  }
}
