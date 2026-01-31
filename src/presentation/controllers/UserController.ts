import { Request, Response } from 'express';
import { CreateUserUseCase } from '../../application/use-cases/user/CreateUserUseCase.js';
import { UpdateUserSaldoUseCase } from '../../application/use-cases/user/UpdateUserSaldoUseCase.js';
import { UserRepository } from '../../infrastructure/repositories/UserRepository.js';
import { User } from '../../domain/entities/User.js';

const userRepository = new UserRepository();
const createUserUseCase = new CreateUserUseCase(userRepository);
const updateUserSaldoUseCase = new UpdateUserSaldoUseCase(userRepository);

export class UserController {
  static async getUsers(req: Request, res: Response) {
    try {
      const users = await userRepository.findAll();
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: 'Error al obtener usuarios' });
    }
  }

  static async getUserById(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const user = await userRepository.findById(id);
      
      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }
      
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: 'Error al obtener usuario' });
    }
  }

  static async createUser(req: Request, res: Response) {
    try {
      const user = await createUserUseCase.execute(req.body);
      res.status(201).json(user);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async updateUser(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const existingUser = await userRepository.findById(id);
      
      if (!existingUser) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      // Crear nueva instancia con los datos actualizados
      const updatedUser = User.create({
        id: existingUser.id,
        nombre: req.body.nombre ?? existingUser.nombre,
        contacto: req.body.contacto ?? existingUser.contacto,
        ofrece: req.body.ofrece ?? existingUser.ofrece,
        necesita: req.body.necesita ?? existingUser.necesita,
        precioOferta: req.body.precioOferta ?? existingUser.precioOferta,
        saldo: existingUser.saldo,
        limite: existingUser.limite,
        email: req.body.email ?? existingUser.email,
        rating: req.body.rating ?? existingUser.rating,
        totalResenas: req.body.totalResenas ?? existingUser.totalResenas,
        miembroDesde: existingUser.miembroDesde,
        ubicacion: req.body.ubicacion ?? existingUser.ubicacion,
        verificado: req.body.verificado ?? existingUser.verificado,
      });

      const savedUser = await userRepository.update(updatedUser);
      res.json(savedUser);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async updateUserSaldo(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const { creditos } = req.body;
      
      const user = await updateUserSaldoUseCase.execute(id, creditos);
      res.json(user);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}
