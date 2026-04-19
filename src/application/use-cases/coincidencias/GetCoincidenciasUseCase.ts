import { MarketItem } from '../../../domain/entities/MarketItem.js';
import { IUserRepository } from '../../../domain/repositories/IUserRepository.js';
import { IMarketItemRepository } from '../../../domain/repositories/IMarketItemRepository.js';
import { DEFAULT_CREDIT_LIMIT_IOX } from '../../../config/credit.js';

export interface Coincidencia {
  item: MarketItem;
  diferenciaPrecio: number;
  porcentajeDiferencia: number;
}

/** Coincidencias de palabras del perfil "Lo que quiero" con título/descripción del ítem. */
function scoreInteresEnItem(item: MarketItem, tags: string[]): number {
  if (!tags.length) return 0;
  const extra = item.descripcionCompleta ? ` ${item.descripcionCompleta}` : '';
  const haystack = `${item.titulo} ${item.descripcion}${extra}`.toLowerCase();
  let score = 0;
  for (const tag of tags) {
    const t = tag.trim().toLowerCase();
    if (t.length < 2) continue;
    if (haystack.includes(t)) score += 1;
  }
  return score;
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

    const limite = user.limite ?? DEFAULT_CREDIT_LIMIT_IOX;

    const intereses = (user.interesesQuiero ?? []).map((s) => s.trim()).filter((s) => s.length >= 2);

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
      .sort((a, b) => {
        const da = scoreInteresEnItem(a.item, intereses);
        const db = scoreInteresEnItem(b.item, intereses);
        if (da !== db) return db - da;
        return a.diferenciaPrecio - b.diferenciaPrecio;
      });

    return coincidencias;
  }
}
