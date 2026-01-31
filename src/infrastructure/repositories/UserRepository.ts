import { User } from '../../domain/entities/User.js';
import { IUserRepository } from '../../domain/repositories/IUserRepository.js';
import prisma from '../database/prisma.js';

export class UserRepository implements IUserRepository {
  async findById(id: number): Promise<User | null> {
    const userData = await prisma.user.findUnique({
      where: { id },
    });

    if (!userData) return null;

    return User.create({
      id: userData.id,
      nombre: userData.nombre,
      contacto: userData.contacto,
      saldo: userData.saldo,
      limite: userData.limite,
      email: userData.email || undefined,
      ofrece: userData.ofrece || undefined,
      necesita: userData.necesita || undefined,
      precioOferta: userData.precioOferta || undefined,
      rating: userData.rating || undefined,
      totalResenas: userData.totalResenas,
      miembroDesde: userData.miembroDesde,
      ubicacion: userData.ubicacion,
      verificado: userData.verificado,
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    const userData = await prisma.user.findUnique({
      where: { email },
    });

    if (!userData) return null;

    return User.create({
      id: userData.id,
      nombre: userData.nombre,
      contacto: userData.contacto,
      saldo: userData.saldo,
      limite: userData.limite,
      email: userData.email || undefined,
      ofrece: userData.ofrece || undefined,
      necesita: userData.necesita || undefined,
      precioOferta: userData.precioOferta || undefined,
      rating: userData.rating || undefined,
      totalResenas: userData.totalResenas,
      miembroDesde: userData.miembroDesde,
      ubicacion: userData.ubicacion,
      verificado: userData.verificado,
    });
  }

  async findAll(): Promise<User[]> {
    const usersData = await prisma.user.findMany();
    return usersData.map((userData: any) => User.create({
      id: userData.id,
      nombre: userData.nombre,
      contacto: userData.contacto,
      ofrece: userData.ofrece,
      necesita: userData.necesita,
      precioOferta: userData.precioOferta,
      saldo: userData.saldo,
      limite: userData.limite,
      email: userData.email || undefined,
      rating: userData.rating || undefined,
      totalResenas: userData.totalResenas,
      miembroDesde: userData.miembroDesde,
      ubicacion: userData.ubicacion,
      verificado: userData.verificado,
    }));
  }

  async save(user: User, password?: string): Promise<User> {
    const userData = await prisma.user.create({
      data: {
        nombre: user.nombre,
        contacto: user.contacto,
        saldo: user.saldo,
        limite: user.limite,
        email: user.email || '',
        password: password || '',
        ofrece: user.ofrece ?? null,
        necesita: user.necesita ?? null,
        precioOferta: user.precioOferta ?? null,
        rating: user.rating,
        totalResenas: user.totalResenas || 0,
        ubicacion: user.ubicacion || 'CABA',
        verificado: user.verificado || false,
      },
    });

    return User.create({
      id: userData.id,
      nombre: userData.nombre,
      contacto: userData.contacto,
      saldo: userData.saldo,
      limite: userData.limite,
      email: userData.email || undefined,
      ofrece: userData.ofrece ?? undefined,
      necesita: userData.necesita ?? undefined,
      precioOferta: userData.precioOferta ?? undefined,
      rating: userData.rating || undefined,
      totalResenas: userData.totalResenas,
      miembroDesde: userData.miembroDesde,
      ubicacion: userData.ubicacion,
      verificado: userData.verificado,
    });
  }

  async update(user: User): Promise<User> {
    const userData = await prisma.user.update({
      where: { id: user.id },
      data: {
        nombre: user.nombre,
        contacto: user.contacto,
        saldo: user.saldo,
        limite: user.limite,
        email: user.email,
        ofrece: user.ofrece ?? null,
        necesita: user.necesita ?? null,
        precioOferta: user.precioOferta ?? null,
        rating: user.rating,
        totalResenas: user.totalResenas,
        ubicacion: user.ubicacion,
        verificado: user.verificado,
      },
    });

    return User.create({
      id: userData.id,
      nombre: userData.nombre,
      contacto: userData.contacto,
      saldo: userData.saldo,
      limite: userData.limite,
      email: userData.email || undefined,
      ofrece: userData.ofrece || undefined,
      necesita: userData.necesita || undefined,
      precioOferta: userData.precioOferta || undefined,
      rating: userData.rating || undefined,
      totalResenas: userData.totalResenas,
      miembroDesde: userData.miembroDesde,
      ubicacion: userData.ubicacion,
      verificado: userData.verificado,
    });
  }

  async delete(id: number): Promise<void> {
    await prisma.user.delete({
      where: { id },
    });
  }

  async updatePassword(userId: number, hashedPassword: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });
  }

  async getUserWithPassword(email: string): Promise<{ user: User; password: string } | null> {
    const userData = await prisma.user.findUnique({
      where: { email },
    });

    if (!userData) return null;

    const user = User.create({
      id: userData.id,
      nombre: userData.nombre,
      contacto: userData.contacto,
      ofrece: userData.ofrece ?? undefined,
      necesita: userData.necesita ?? undefined,
      precioOferta: userData.precioOferta ?? undefined,
      saldo: userData.saldo,
      limite: userData.limite,
      email: userData.email || undefined,
      rating: userData.rating ?? undefined,
      totalResenas: userData.totalResenas,
      miembroDesde: userData.miembroDesde,
      ubicacion: userData.ubicacion,
      verificado: userData.verificado,
    });

    return { user, password: userData.password };
  }
}
