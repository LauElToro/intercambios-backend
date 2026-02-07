// Medio del producto: imagen o video
export interface ProductImageData {
  url: string;
  alt?: string;
  position?: number;
  isPrimary?: boolean;
  mediaType?: 'image' | 'video';
}

export class MarketItem {
  private constructor(
    public readonly id: number,
    public readonly titulo: string,
    public readonly descripcion: string,
    public readonly precio: number,
    public readonly tipoPago?: string,
    public readonly rubro: 'servicios' | 'productos' | 'alimentos' | 'experiencias',
    public readonly vendedorId: number,
    public readonly descripcionCompleta?: string,
    public readonly ubicacion?: string,
    public readonly lat?: number,
    public readonly lng?: number,
    public readonly distancia?: number,
    public readonly imagen?: string,
    public readonly rating?: number,
    public readonly detalles?: Record<string, string>,
    public readonly caracteristicas?: string[],
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date,
    // Marketplace / feeds
    public readonly slug?: string,
    public readonly status?: string,
    public readonly condition?: string,
    public readonly availability?: string,
    public readonly brand?: string,
    public readonly metaTitle?: string,
    public readonly metaDescription?: string,
    public readonly ogImage?: string,
    public readonly categoryId?: number,
    public readonly images?: ProductImageData[]
  ) {}

  static create(data: {
    id?: number;
    titulo: string;
    descripcion: string;
    precio: number;
    tipoPago?: string;
    rubro: 'servicios' | 'productos' | 'alimentos' | 'experiencias';
    vendedorId: number;
    descripcionCompleta?: string;
    ubicacion?: string;
    distancia?: number;
    imagen?: string;
    rating?: number;
    detalles?: Record<string, string>;
    caracteristicas?: string[];
    createdAt?: Date;
    updatedAt?: Date;
    slug?: string;
    status?: string;
    condition?: string;
    availability?: string;
    brand?: string;
    metaTitle?: string;
    metaDescription?: string;
    ogImage?: string;
    categoryId?: number;
    images?: ProductImageData[];
  }): MarketItem {
    return new MarketItem(
      data.id || 0,
      data.titulo,
      data.descripcion,
      data.precio,
      data.tipoPago,
      data.rubro,
      data.vendedorId,
      data.descripcionCompleta,
      data.ubicacion,
      data.lat,
      data.lng,
      data.distancia,
      data.imagen,
      data.rating,
      data.detalles,
      data.caracteristicas,
      data.createdAt,
      data.updatedAt,
      data.slug,
      data.status,
      data.condition,
      data.availability,
      data.brand,
      data.metaTitle,
      data.metaDescription,
      data.ogImage,
      data.categoryId,
      data.images
    );
  }

  calcularDiferenciaPrecio(precioReferencia: number): number {
    return Math.abs(this.precio - precioReferencia);
  }

  calcularPorcentajeDiferencia(precioReferencia: number): number {
    return (this.calcularDiferenciaPrecio(precioReferencia) / precioReferencia) * 100;
  }
}
