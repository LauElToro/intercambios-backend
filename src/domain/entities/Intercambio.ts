export type EstadoIntercambio = 'pendiente' | 'confirmado' | 'cancelado';

export class Intercambio {
  private constructor(
    public readonly id: number,
    public readonly usuarioId: number,
    public readonly otraPersonaId: number,
    public readonly otraPersonaNombre: string,
    public readonly descripcion: string,
    public readonly creditos: number,
    public readonly fecha: Date,
    private _estado: EstadoIntercambio,
    public readonly marketItemId?: number,
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date
  ) {}

  static create(data: {
    id?: number;
    usuarioId: number;
    otraPersonaId: number;
    otraPersonaNombre: string;
    descripcion: string;
    creditos: number;
    fecha?: Date;
    estado?: EstadoIntercambio;
    marketItemId?: number;
    createdAt?: Date;
    updatedAt?: Date;
  }): Intercambio {
    return new Intercambio(
      data.id || 0,
      data.usuarioId,
      data.otraPersonaId,
      data.otraPersonaNombre,
      data.descripcion,
      data.creditos,
      data.fecha || new Date(),
      data.estado || 'pendiente',
      data.marketItemId,
      data.createdAt,
      data.updatedAt
    );
  }

  get estado(): EstadoIntercambio {
    return this._estado;
  }

  confirmar(): void {
    if (this._estado === 'cancelado') {
      throw new Error('No se puede confirmar un intercambio cancelado');
    }
    this._estado = 'confirmado';
  }

  cancelar(): void {
    if (this._estado === 'confirmado') {
      throw new Error('No se puede cancelar un intercambio confirmado');
    }
    this._estado = 'cancelado';
  }
}
