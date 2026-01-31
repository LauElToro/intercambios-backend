import { MarketItem } from '../../../domain/entities/MarketItem.js';
import { IUserRepository } from '../../../domain/repositories/IUserRepository.js';
import { IMarketItemRepository } from '../../../domain/repositories/IMarketItemRepository.js';

export interface Coincidencia {
  item: MarketItem;
  diferenciaPrecio: number;
  porcentajeDiferencia: number;
}

export class GetCoincidenciasUseCase {
  constructor(
    private userRepository: IUserRepository,
    private marketItemRepository: IMarketItemRepository
  ) {}

  async execute(userId: number, margenPorcentaje: number = 0.2): Promise<Coincidencia[]> {
    const user = await this.userRepository.findById(userId);
    
    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    // Obtener el precio promedio de los productos/servicios del usuario
    const userItems = await this.marketItemRepository.findByVendedorId(user.id);
    const precioPromedio = userItems.length > 0
      ? userItems.reduce((sum, item) => sum + item.precio, 0) / userItems.length
      : 0;

    if (!precioPromedio || precioPromedio === 0) {
      return [];
    }

    // Obtener items con precio aproximado
    const itemsAproximados = await this.marketItemRepository.findByPrecioAproximado(
      precioPromedio,
      margenPorcentaje
    );

    const limite = user.limite ?? 150000;

    const coincidencias: Coincidencia[] = itemsAproximados
      .filter(item => {
        if (item.vendedorId === userId) return false;
        return user.puedeRealizarIntercambio(item.precio, limite);
      })
      .map(item => ({
        item,
        diferenciaPrecio: item.calcularDiferenciaPrecio(precioPromedio),
        porcentajeDiferencia: item.calcularPorcentajeDiferencia(precioPromedio)
      }))
      .sort((a, b) => a.diferenciaPrecio - b.diferenciaPrecio);

    return coincidencias;
  }
}
