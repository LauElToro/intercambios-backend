import bcrypt from 'bcryptjs';
import { IUserRepository } from '../../../domain/repositories/IUserRepository.js';
import { User } from '../../../domain/entities/User.js';
import { RegisterData } from '../../../domain/entities/Auth.js';

export class RegisterUseCase {
  constructor(private userRepository: IUserRepository) {}

  async execute(data: RegisterData): Promise<User> {
    // Verificar si el email ya existe
    const existingUser = await this.userRepository.findByEmail(data.email);
    if (existingUser) {
      throw new Error('El email ya está registrado');
    }

    // Hash de contraseña
    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = User.create({
      nombre: data.nombre,
      contacto: data.contacto,
      ofrece: '', // Se completará cuando cree productos/servicios
      necesita: '', // Se completará cuando cree productos/servicios
      precioOferta: 0, // Se calculará de los productos/servicios creados
      email: data.email,
      ubicacion: data.ubicacion,
    });

    // Guardar usuario con password hasheado
    const savedUser = await (this.userRepository as any).save(user, hashedPassword);

    return savedUser;
  }
}
