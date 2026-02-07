import { Intercambio } from '../entities/Intercambio.js';

export interface IIntercambioRepository {
  findById(id: number): Promise<Intercambio | null>;
  findByUserId(userId: number): Promise<Intercambio[]>;
  findByCompradorAndMarketItem(compradorId: number, marketItemId: number): Promise<Intercambio | null>;
  save(intercambio: Intercambio): Promise<Intercambio>;
  update(intercambio: Intercambio): Promise<Intercambio>;
}
