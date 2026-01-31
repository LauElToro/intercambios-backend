import { MarketItem } from '../../../domain/entities/MarketItem.js';
import { IMarketItemRepository, MarketItemFilters } from '../../../domain/repositories/IMarketItemRepository.js';

export class GetMarketItemsUseCase {
  constructor(private marketItemRepository: IMarketItemRepository) {}

  async execute(filters?: MarketItemFilters): Promise<MarketItem[]> {
    return await this.marketItemRepository.findAll(filters);
  }
}
