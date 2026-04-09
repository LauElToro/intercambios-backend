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
    public readonly rubro: 'servicios' | 'productos' | 'alimentos' | 'experiencias',
    public readonly vendedorId: number,
    public readonly descripcionCompleta?: string,
    public readonly ubicacion?: string,
    public readonly lat?: number,
    public readonly lng?: number,
    public readonly distancia?: number,
    public readonly tipoPago?: string,
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
    public readonly images?: ProductImageData[],
    /** null = servicio (sin stock). Número = unidades para productos/experiencias/alimentos. */
    public readonly stock?: number | null,
    public readonly disponible?: boolean
  ) {}

  static computeDisponible(status: string | undefined, rubro: string, stock: number | null | undefined): boolean {
    if (status && status !== 'active') return false;
    if (rubro === 'servicios') return true;
    if (stock == null) return false;
    return stock > 0;
  }

  static create(data: {
    id?: number;
    titulo: string;
    descripcion: string;
    precio: number;
    rubro: 'servicios' | 'productos' | 'alimentos' | 'experiencias';
    vendedorId: number;
    descripcionCompleta?: string;
    ubicacion?: string;
    lat?: number;
    lng?: number;
    distancia?: number;
    tipoPago?: string;
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
    stock?: number | null;
    disponible?: boolean;
  }): MarketItem {
    const stock = data.stock !== undefined ? data.stock : null;
    const disponible =
      data.disponible !== undefined
        ? data.disponible
        : MarketItem.computeDisponible(data.status, data.rubro, stock);
    return new MarketItem(
      data.id || 0,
      data.titulo,
      data.descripcion,
      data.precio,
      data.rubro,
      data.vendedorId,
      data.descripcionCompleta,
      data.ubicacion,
      data.lat,
      data.lng,
      data.distancia,
      data.tipoPago,
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
      data.images,
      stock,
      disponible
    );
  }

  calcularDiferenciaPrecio(precioReferencia: number): number {
    return Math.abs(this.precio - precioReferencia);
  }

  calcularPorcentajeDiferencia(precioReferencia: number): number {
    return (this.calcularDiferenciaPrecio(precioReferencia) / precioReferencia) * 100;
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      titulo: this.titulo,
      descripcion: this.descripcion,
      precio: this.precio,
      rubro: this.rubro,
      vendedorId: this.vendedorId,
      descripcionCompleta: this.descripcionCompleta,
      ubicacion: this.ubicacion,
      lat: this.lat,
      lng: this.lng,
      distancia: this.distancia,
      tipoPago: this.tipoPago,
      imagen: this.imagen,
      rating: this.rating,
      detalles: this.detalles,
      caracteristicas: this.caracteristicas,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      slug: this.slug,
      status: this.status,
      condition: this.condition,
      availability: this.availability,
      brand: this.brand,
      metaTitle: this.metaTitle,
      metaDescription: this.metaDescription,
      ogImage: this.ogImage,
      categoryId: this.categoryId,
      images: this.images,
      stock: this.stock,
      disponible: this.disponible,
    };
  }
}
