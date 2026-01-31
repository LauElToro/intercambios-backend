import { User } from '../../domain/entities/User.js';
import { IUserRepository } from '../../domain/repositories/IUserRepository.js';
import prisma from '../database/prisma.js';

function mapToUser(userData: {
  id: number;
  nombre: string;
  contacto: string;
  saldo: number;
  limite: number;
  email: string;
  rating: number | null;
  totalResenas: number;
  miembroDesde: Date;
  ubicacion: string;
  verificado: boolean;
  perfilMercado?: { ofrece: string | null; necesita: string | null; precioOferta: number | null } | null;
}): User {
  const p = userData.perfilMercado;
  return User.create({
    id: userData.id,
    nombre: userData.nombre,
    contacto: userData.contacto,
    saldo: userData.saldo,
    limite: userData.limite,
    email: userData.email || undefined,
    ofrece: p?.ofrece ?? undefined,
    necesita: p?.necesita ?? undefined,
    precioOferta: p?.precioOferta ?? undefined,
    rating: userData.rating ?? undefined,
    totalResenas: userData.totalResenas,
    miembroDesde: userData.miembroDesde,
    ubicacion: userData.ubicacion,
    verificado: userData.verificado,
  });
}

export class UserRepository implements IUserRepository {
  async findById(id: number): Promise<User | null> {
    const userData = await prisma.user.findUnique({
      where: { id },
      include: { perfilMercado: true },
    });
    if (!userData) return null;
    return mapToUser(userData);
  }

  async findByEmail(email: string): Promise<User | null> {
    const userData = await prisma.user.findUnique({
      where: { email },
      include: { perfilMercado: true },
    });
    if (!userData) return null;
    return mapToUser(userData);
  }

  async findAll(): Promise<User[]> {
    const usersData = await prisma.user.findMany({
      include: { perfilMercado: true },
    });
    return usersData.map((userData) => mapToUser(userData));
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
        rating: user.rating,
        totalResenas: user.totalResenas || 0,
        ubicacion: user.ubicacion || 'CABA',
        verificado: user.verificado || false,
      },
    });

    await prisma.userPerfilMercado.upsert({
      where: { userId: userData.id },
      create: {
        userId: userData.id,
        ofrece: user.ofrece ?? null,
        necesita: user.necesita ?? null,
        precioOferta: user.precioOferta ?? null,
      },
      update: {
        ofrece: user.ofrece ?? null,
        necesita: user.necesita ?? null,
        precioOferta: user.precioOferta ?? null,
      },
    });

    const withPerfil = await prisma.user.findUnique({
      where: { id: userData.id },
      include: { perfilMercado: true },
    });
    return mapToUser(withPerfil!);
  }

  async update(user: User): Promise<User> {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        nombre: user.nombre,
        contacto: user.contacto,
        saldo: user.saldo,
        limite: user.limite,
        email: user.email,
        rating: user.rating,
        totalResenas: user.totalResenas,
        ubicacion: user.ubicacion,
        verificado: user.verificado,
      },
    });

    await prisma.userPerfilMercado.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        ofrece: user.ofrece ?? null,
        necesita: user.necesita ?? null,
        precioOferta: user.precioOferta ?? null,
      },
      update: {
        ofrece: user.ofrece ?? null,
        necesita: user.necesita ?? null,
        precioOferta: user.precioOferta ?? null,
      },
    });

    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      include: { perfilMercado: true },
    });
    return mapToUser(userData!);
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
      include: { perfilMercado: true },
    });
    if (!userData) return null;
    return { user: mapToUser(userData), password: userData.password };
  }
}
