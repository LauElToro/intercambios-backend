import { MarketItem } from '../entities/MarketItem.js';

export interface MarketItemFilters {
  rubro?: string;
  tipo?: 'productos' | 'servicios';
  precioMin?: number;
  precioMax?: number;
  vendedorId?: number;
}

export interface IMarketItemRepository {
  findById(id: number): Promise<MarketItem | null>;
  findAll(filters?: MarketItemFilters): Promise<MarketItem[]>;
  save(item: MarketItem): Promise<MarketItem>;
  update(item: MarketItem): Promise<MarketItem>;
  delete(id: number): Promise<void>;
  findByPrecioAproximado(precioReferencia: number, margenPorcentaje: number): Promise<MarketItem[]>;
}
