import { Intercambio } from '../../../domain/entities/Intercambio.js';
import { IIntercambioRepository } from '../../../domain/repositories/IIntercambioRepository.js';
import { IUserRepository } from '../../../domain/repositories/IUserRepository.js';
export class CreateIntercambioUseCase {
  constructor(
    private intercambioRepository: IIntercambioRepository,
    private userRepository: IUserRepository
  ) {}

  async execute(data: {
    usuarioId: number;
    otraPersonaId: number;
    otraPersonaNombre: string;
    descripcion: string;
    creditos: number;
    fecha?: Date;
  }): Promise<Intercambio> {
    // Validar que el usuario existe
    const usuario = await this.userRepository.findById(data.usuarioId);
    if (!usuario) {
      throw new Error('Usuario no encontrado');
    }

    const limiteCreditoNegativo = usuario.limite ?? 150000;
    if (!usuario.puedeRealizarIntercambio(data.creditos, limiteCreditoNegativo)) {
      throw new Error('Límite de crédito negativo excedido');
    }

    // Crear intercambio
    const intercambio = Intercambio.create({
      usuarioId: data.usuarioId,
      otraPersonaId: data.otraPersonaId,
      otraPersonaNombre: data.otraPersonaNombre,
      descripcion: data.descripcion,
      creditos: data.creditos,
      fecha: data.fecha,
      estado: 'pendiente',
    });

    // Actualizar saldo del usuario
    usuario.actualizarSaldo(data.creditos, limiteCreditoNegativo);
    await this.userRepository.update(usuario);

    // Guardar intercambio
    return await this.intercambioRepository.save(intercambio);
  }
}
