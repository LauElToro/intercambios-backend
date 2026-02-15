import { User } from '../../domain/entities/User.js';
import { IUserRepository } from '../../domain/repositories/IUserRepository.js';
import prisma from '../database/prisma.js';

function mapToUser(userData: any): User {
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
    bio: userData.bio ?? undefined,
    fotoPerfil: userData.fotoPerfil ?? undefined,
    banner: userData.banner ?? undefined,
    redesSociales: userData.redesSociales ? (typeof userData.redesSociales === 'object' ? userData.redesSociales : undefined) : undefined,
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
        bio: user.bio ?? null,
        fotoPerfil: user.fotoPerfil ?? null,
        banner: user.banner ?? null,
        redesSociales: user.redesSociales ?? undefined,
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

  async setMfaCode(userId: number, hashedCode: string, expiresAt: Date): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { mfaCode: hashedCode, mfaCodeExpiresAt: expiresAt },
    });
  }

  async clearMfaCode(userId: number): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { mfaCode: null, mfaCodeExpiresAt: null },
    });
  }

  async getMfaCodeAndExpiry(userId: number): Promise<{ mfaCode: string; mfaCodeExpiresAt: Date } | null> {
    const u = await prisma.user.findUnique({
      where: { id: userId },
      select: { mfaCode: true, mfaCodeExpiresAt: true },
    });
    if (!u?.mfaCode || !u.mfaCodeExpiresAt) return null;
    return { mfaCode: u.mfaCode, mfaCodeExpiresAt: u.mfaCodeExpiresAt };
  }

  async setPasswordResetToken(userId: number, token: string, expiresAt: Date): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { passwordResetToken: token, passwordResetExpiresAt: expiresAt },
    });
  }

  async findByPasswordResetToken(token: string): Promise<User | null> {
    const userData = await prisma.user.findFirst({
      where: { passwordResetToken: token, passwordResetExpiresAt: { gt: new Date() } },
      include: { perfilMercado: true },
    });
    if (!userData) return null;
    return mapToUser(userData);
  }

  async clearPasswordResetToken(userId: number): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { passwordResetToken: null, passwordResetExpiresAt: null },
    });
  }
}
