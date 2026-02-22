import { MarketItem } from '../../../domain/entities/MarketItem.js';
import { IMarketItemRepository, MarketItemFilters } from '../../../domain/repositories/IMarketItemRepository.js';

export class GetMarketItemsUseCase {
  constructor(private marketItemRepository: IMarketItemRepository) {}

  async execute(filters?: MarketItemFilters): Promise<{ data: MarketItem[]; total: number; page: number; limit: number; totalPages: number }> {
    return this.marketItemRepository.findAll(filters);
  }
}
