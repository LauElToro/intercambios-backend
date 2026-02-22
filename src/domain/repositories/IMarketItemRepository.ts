import { MarketItem } from '../entities/MarketItem.js';

export interface MarketItemFilters {
  rubro?: string;
  tipo?: 'productos' | 'servicios';
  precioMin?: number;
  precioMax?: number;
  vendedorId?: number;
  search?: string;
  status?: string; // default 'active' para listados y feeds
  userLat?: number;
  userLng?: number;
  distanciaMax?: number;
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface IMarketItemRepository {
  findById(id: number): Promise<MarketItem | null>;
  findAll(filters?: MarketItemFilters): Promise<{ data: MarketItem[]; total: number; page: number; limit: number; totalPages: number }>;
  save(item: MarketItem): Promise<MarketItem>;
  update(item: MarketItem): Promise<MarketItem>;
  delete(id: number): Promise<void>;
  findByPrecioAproximado(precioReferencia: number, margenPorcentaje: number): Promise<MarketItem[]>;
  findByVendedorId(vendedorId: number): Promise<MarketItem[]>;
}
