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
    public readonly distancia?: number,
    public readonly imagen?: string,
    public readonly rating?: number,
    public readonly detalles?: Record<string, string>,
    public readonly caracteristicas?: string[],
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date
  ) {}

  static create(data: {
    id?: number;
    titulo: string;
    descripcion: string;
    precio: number;
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
  }): MarketItem {
    return new MarketItem(
      data.id || 0,
      data.titulo,
      data.descripcion,
      data.precio,
      data.rubro,
      data.vendedorId,
      data.descripcionCompleta,
      data.ubicacion,
      data.distancia,
      data.imagen,
      data.rating,
      data.detalles,
      data.caracteristicas,
      data.createdAt,
      data.updatedAt
    );
  }

  calcularDiferenciaPrecio(precioReferencia: number): number {
    return Math.abs(this.precio - precioReferencia);
  }

  calcularPorcentajeDiferencia(precioReferencia: number): number {
    return (this.calcularDiferenciaPrecio(precioReferencia) / precioReferencia) * 100;
  }
}
