import { Intercambio } from '../entities/Intercambio.js';

export interface IIntercambioRepository {
  findById(id: number): Promise<Intercambio | null>;
  findByUserId(userId: number): Promise<Intercambio[]>;
  save(intercambio: Intercambio): Promise<Intercambio>;
  update(intercambio: Intercambio): Promise<Intercambio>;
}
