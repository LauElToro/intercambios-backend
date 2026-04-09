import bcrypt from 'bcryptjs';
import { IUserRepository } from '../../../domain/repositories/IUserRepository.js';
import { User } from '../../../domain/entities/User.js';
import { RegisterData } from '../../../domain/entities/Auth.js';
import { emailService } from '../../../infrastructure/services/email.service.js';
import prisma from '../../../infrastructure/database/prisma.js';

export class RegisterUseCase {
  constructor(private userRepository: IUserRepository) {}

  async execute(data: RegisterData): Promise<User> {
    if (!data.aceptaTerminos) {
      throw new Error('Debés aceptar los términos y condiciones para registrarte');
    }

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

    await prisma.user.update({
      where: { id: (savedUser as any).id },
      data: { terminosAceptadosAt: new Date() },
    });

    // Referido (opcional): vincular este usuario al referente por código o slug
    const codigo = (data.codigoReferido || '').trim();
    if (codigo) {
      try {
        const referente = await prisma.user.findFirst({
          where: {
            OR: [{ referralCode: codigo }, { referralSlug: codigo }],
          },
          select: { id: true },
        });
        if (referente && referente.id !== (savedUser as any).id) {
          await prisma.user.update({
            where: { id: (savedUser as any).id },
            data: {
              referredById: referente.id,
              referralCodeUsed: codigo,
            },
          });
        }
      } catch (err) {
        // No bloquear el registro si falla la relación (ej: código inválido)
        console.error('[RegisterUseCase] No se pudo vincular referido:', (err as Error)?.message);
      }
    }

    emailService.sendWelcome(savedUser.email!, data.nombre).catch((err) =>
      console.error('[RegisterUseCase] Error enviando email bienvenida:', err)
    );

    return savedUser;
  }
}
