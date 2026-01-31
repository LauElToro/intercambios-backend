import { User } from '../../../domain/entities/User.js';
import { IUserRepository } from '../../../domain/repositories/IUserRepository.js';

export class CreateUserUseCase {
  constructor(private userRepository: IUserRepository) {}

  async execute(data: {
    nombre: string;
    contacto: string;
    ofrece: string;
    necesita: string;
    precioOferta?: number;
    email: string;
    ubicacion?: string;
    password: string;
  }): Promise<User> {
    // Validaciones de dominio
    if (!data.nombre || !data.contacto || !data.ofrece || !data.necesita || !data.email || !data.password) {
      throw new Error('Faltan campos requeridos');
    }

    const user = User.create({
      nombre: data.nombre,
      contacto: data.contacto,
      ofrece: data.ofrece,
      necesita: data.necesita,
      precioOferta: data.precioOferta,
      email: data.email,
      ubicacion: data.ubicacion,
    });

    return await (this.userRepository as any).save(user, data.password);
  }
}
