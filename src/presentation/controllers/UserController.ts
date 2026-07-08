import { Request, Response } from 'express';
import { AuthRequest } from '../../infrastructure/middleware/auth.js';
import { CreateUserUseCase } from '../../application/use-cases/user/CreateUserUseCase.js';
import { UpdateUserSaldoUseCase } from '../../application/use-cases/user/UpdateUserSaldoUseCase.js';
import { UserRepository } from '../../infrastructure/repositories/UserRepository.js';
import { User } from '../../domain/entities/User.js';
import prisma from '../../infrastructure/database/prisma.js';
import { isNumericUserIdParam, updateUserProfileSlug } from '../../utils/profileSlug.js';

const MAX_INTERESES = 25;
const MAX_INTERES_LEN = 80;

/** Lista de intereses desde el body; [] limpia la lista. */
function parseInteresesQuiero(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const x of raw) {
    const s = String(x).trim().slice(0, MAX_INTERES_LEN);
    if (s.length < 2) continue;
    const low = s.toLowerCase();
    if (out.some((o) => o.toLowerCase() === low)) continue;
    out.push(s);
    if (out.length >= MAX_INTERESES) break;
  }
  return out;
}

const userRepository = new UserRepository();
const createUserUseCase = new CreateUserUseCase(userRepository);
const updateUserSaldoUseCase = new UpdateUserSaldoUseCase(userRepository);

async function resolveUserIdFromParam(param: string): Promise<number | null> {
  const raw = String(param || '').trim();
  if (!raw) return null;
  if (isNumericUserIdParam(raw)) return parseInt(raw, 10);
  const row = await prisma.user.findFirst({
    where: { profileSlug: { equals: raw, mode: 'insensitive' } },
    select: { id: true },
  });
  return row?.id ?? null;
}

async function loadProfileMeta(userId: number): Promise<{ profileSlug: string | null; nombreTienda: string | null }> {
  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: { profileSlug: true, nombreTienda: true },
  });
  return {
    profileSlug: row?.profileSlug ?? null,
    nombreTienda: row?.nombreTienda ?? null,
  };
}

export class UserController {
  static async getUsers(req: Request, res: Response) {
    try {
      const users = await userRepository.findAll();
      res.json(users.map((u) => u.toJSON()));
    } catch (error) {
      res.status(500).json({ error: 'Error al obtener usuarios' });
    }
  }

  static async getUserById(req: Request, res: Response) {
    try {
      const userId = await resolveUserIdFromParam(req.params.id);
      if (!userId) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }
      const user = await userRepository.findById(userId);
      
      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      const { profileSlug, nombreTienda } = await loadProfileMeta(userId);
      res.json({ ...user.toJSON(), profileSlug, nombreTienda });
    } catch (error) {
      res.status(500).json({ error: 'Error al obtener usuario' });
    }
  }

  /** Perfil público de la comunidad (sin email ni datos sensibles). */
  static async getPublicProfile(req: AuthRequest, res: Response) {
    try {
      const userId = await resolveUserIdFromParam(req.params.id);
      if (!userId) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }
      const user = await userRepository.findById(userId);
      
      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      const { profileSlug, nombreTienda } = await loadProfileMeta(userId);
      const safe = {
        id: user.id,
        profileSlug,
        nombreTienda,
        nombre: user.nombre,
        ubicacion: user.ubicacion,
        rating: user.rating,
        totalResenas: user.totalResenas,
        miembroDesde: user.miembroDesde,
        verificado: user.verificado,
        kycVerificado: user.kycVerificado,
        bio: user.bio,
        fotoPerfil: user.fotoPerfil,
        banner: user.banner,
        redesSociales: user.redesSociales,
        ofrece: user.ofrece,
        necesita: user.necesita,
        interesesQuiero: user.interesesQuiero ?? [],
      };
      res.json(safe);
    } catch (error) {
      res.status(500).json({ error: 'Error al obtener usuario' });
    }
  }

  static async createUser(req: Request, res: Response) {
    try {
      const user = await createUserUseCase.execute(req.body);
      res.status(201).json(user.toJSON());
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async updateUser(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const authUserId = (req as AuthRequest).userId;
      if (authUserId && authUserId !== id) {
        return res.status(403).json({ error: 'Solo podés editar tu propio perfil' });
      }
      const existingUser = await userRepository.findById(id);
      
      if (!existingUser) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      const body = req.body as Record<string, unknown>;
      const nextIntereses =
        'interesesQuiero' in body
          ? parseInteresesQuiero(body.interesesQuiero)
          : existingUser.interesesQuiero;

      if ('profileSlug' in body && body.profileSlug != null && String(body.profileSlug).trim()) {
        const slugResult = await updateUserProfileSlug(id, String(body.profileSlug));
        if ('error' in slugResult) {
          return res.status(400).json({ error: slugResult.error });
        }
      }

      const nombreTiendaRaw = 'nombreTienda' in body ? String(body.nombreTienda ?? '').trim() : undefined;

      const updatedUser = User.create({
        id: existingUser.id,
        nombre: req.body.nombre ?? existingUser.nombre,
        contacto: req.body.contacto ?? existingUser.contacto,
        saldo: existingUser.saldo,
        limite: existingUser.limite,
        email: req.body.email ?? existingUser.email,
        ofrece: req.body.ofrece !== undefined ? req.body.ofrece : existingUser.ofrece,
        necesita: req.body.necesita !== undefined ? req.body.necesita : existingUser.necesita,
        interesesQuiero: nextIntereses,
        precioOferta: existingUser.precioOferta,
        rating: req.body.rating ?? existingUser.rating,
        totalResenas: req.body.totalResenas ?? existingUser.totalResenas,
        miembroDesde: existingUser.miembroDesde,
        ubicacion: req.body.ubicacion ?? existingUser.ubicacion,
        verificado: req.body.verificado ?? existingUser.verificado,
        kycVerificado: existingUser.kycVerificado,
        bio: req.body.bio !== undefined ? req.body.bio : existingUser.bio,
        fotoPerfil: req.body.fotoPerfil !== undefined ? req.body.fotoPerfil : existingUser.fotoPerfil,
        banner: req.body.banner !== undefined ? req.body.banner : existingUser.banner,
        redesSociales: req.body.redesSociales !== undefined ? req.body.redesSociales : existingUser.redesSociales,
        nombreTienda: nombreTiendaRaw !== undefined ? (nombreTiendaRaw || null) : existingUser.nombreTienda,
      });

      const savedUser = await userRepository.update(updatedUser);
      const meta = await loadProfileMeta(id);
      res.json({ ...savedUser.toJSON(), ...meta });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async updateUserSaldo(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const { creditos } = req.body;
      
      const user = await updateUserSaldoUseCase.execute(id, creditos);
      res.json(user.toJSON());
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}
