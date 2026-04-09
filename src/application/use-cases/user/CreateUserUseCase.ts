import { User } from '../../../domain/entities/User.js';
import { IUserRepository } from '../../../domain/repositories/IUserRepository.js';

export class CreateUserUseCase {
  constructor(private userRepository: IUserRepository) {}

  async execute(data: {
    nombre: string;
    contacto: string;
    email: string;
    ubicacion?: string;
    password: string;
    // ofrece, necesita y precioOferta ya no son requeridos
    // Se completan cuando el usuario crea productos/servicios
    ofrece?: string;
    necesita?: string;
    precioOferta?: number;
  }): Promise<User> {
    // Validaciones de dominio
    if (!data.nombre || !data.contacto || !data.email || !data.password) {
      throw new Error('Faltan campos requeridos: nombre, contacto, email, password');
    }

    const user = User.create({
      nombre: data.nombre,
      contacto: data.contacto,
      email: data.email,
      ubicacion: data.ubicacion,
      // Campos opcionales - se completan cuando crea productos/servicios
      ofrece: data.ofrece,
      necesita: data.necesita,
      precioOferta: data.precioOferta,
    });

    return await (this.userRepository as any).save(user, data.password);
  }
}
