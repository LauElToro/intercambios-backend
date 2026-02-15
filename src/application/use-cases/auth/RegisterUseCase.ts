import bcrypt from 'bcryptjs';
import { IUserRepository } from '../../../domain/repositories/IUserRepository.js';
import { User } from '../../../domain/entities/User.js';
import { RegisterData } from '../../../domain/entities/Auth.js';
import { emailService } from '../../../infrastructure/services/email.service.js';

export class RegisterUseCase {
  constructor(private userRepository: IUserRepository) {}

  async execute(data: RegisterData): Promise<User> {
    const existingUser = await this.userRepository.findByEmail(data.email);
    if (existingUser) {
      throw new Error('El email ya está registrado');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = User.create({
      nombre: data.nombre,
      contacto: data.contacto,
      ofrece: '',
      necesita: '',
      precioOferta: 0,
      email: data.email,
      ubicacion: data.ubicacion,
    });

    const savedUser = await (this.userRepository as any).save(user, hashedPassword);

    emailService.sendWelcome(savedUser.email!, data.nombre).catch((err) =>
      console.error('[RegisterUseCase] Error enviando email bienvenida:', err)
    );

    return savedUser;
  }
}
