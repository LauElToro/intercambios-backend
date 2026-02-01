export class User {
  private _saldo: number;

  private constructor(
    public readonly id: number,
    public readonly nombre: string,
    public readonly contacto: string,
    saldo: number,
    public readonly limite: number,
    public readonly email?: string,
    public readonly ofrece?: string,
    public readonly necesita?: string,
    public readonly precioOferta?: number,
    public readonly rating?: number,
    public readonly totalResenas?: number,
    public readonly miembroDesde?: Date,
    public readonly ubicacion?: string,
    public readonly verificado?: boolean,
    public readonly bio?: string,
    public readonly fotoPerfil?: string,
    public readonly banner?: string,
    public readonly redesSociales?: Record<string, string>
  ) {
    this._saldo = saldo;
  }

  static create(data: {
    id?: number;
    nombre: string;
    contacto: string;
    saldo?: number;
    limite?: number;
    email?: string;
    ofrece?: string;
    necesita?: string;
    precioOferta?: number;
    rating?: number;
    totalResenas?: number;
    miembroDesde?: Date;
    ubicacion?: string;
    verificado?: boolean;
    bio?: string;
    fotoPerfil?: string;
    banner?: string;
    redesSociales?: Record<string, string>;
  }): User {
    return new User(
      data.id || 0,
      data.nombre,
      data.contacto,
      data.saldo || 0,
      data.limite ?? 150000,
      data.email,
      data.ofrece,
      data.necesita,
      data.precioOferta,
      data.rating,
      data.totalResenas,
      data.miembroDesde || new Date(),
      data.ubicacion || 'CABA',
      data.verificado || false,
      data.bio,
      data.fotoPerfil,
      data.banner,
      data.redesSociales
    );
  }

  get saldo(): number {
    return this._saldo;
  }

  puedeRealizarIntercambio(precio: number, limiteCreditoNegativo: number): boolean {
    const nuevoSaldo = this._saldo - precio;
    return nuevoSaldo >= -limiteCreditoNegativo;
  }

  actualizarSaldo(creditos: number, limiteCreditoNegativo: number): void {
    const nuevoSaldo = this._saldo + creditos;
    if (nuevoSaldo < -limiteCreditoNegativo) {
      throw new Error('Límite de crédito negativo excedido');
    }
    this._saldo = nuevoSaldo;
  }

  tieneCoincidencia(precio: number, precioReferencia: number, margenPorcentaje: number = 0.2): boolean {
    // precioReferencia viene del promedio de los productos del usuario
    // Ya no usamos this.precioOferta
    const margen = precioReferencia * margenPorcentaje;
    const precioMin = precioReferencia - margen;
    const precioMax = precioReferencia + margen;
    return precio >= precioMin && precio <= precioMax;
  }
}
