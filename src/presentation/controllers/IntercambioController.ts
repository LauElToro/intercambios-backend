import { Request, Response } from 'express';
import { CreateIntercambioUseCase } from '../../application/use-cases/intercambio/CreateIntercambioUseCase.js';
import { GetIntercambiosUseCase } from '../../application/use-cases/intercambio/GetIntercambiosUseCase.js';
import { ConfirmIntercambioUseCase } from '../../application/use-cases/intercambio/ConfirmIntercambioUseCase.js';
import { IntercambioRepository } from '../../infrastructure/repositories/IntercambioRepository.js';
import { UserRepository } from '../../infrastructure/repositories/UserRepository.js';
import { AuthRequest } from '../../infrastructure/middleware/auth.js';

const intercambioRepository = new IntercambioRepository();
const userRepository = new UserRepository();
const createIntercambioUseCase = new CreateIntercambioUseCase(intercambioRepository, userRepository);
const getIntercambiosUseCase = new GetIntercambiosUseCase(intercambioRepository);
const confirmIntercambioUseCase = new ConfirmIntercambioUseCase(intercambioRepository);

export class IntercambioController {
  static async getIntercambios(req: AuthRequest, res: Response) {
    try {
      const userId = parseInt(req.params.userId);
      
      // Verificar que el usuario solo vea sus propios intercambios
      if (req.userId !== userId) {
        return res.status(403).json({ error: 'No autorizado' });
      }

      const intercambios = await getIntercambiosUseCase.execute(userId);
      res.json(intercambios);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async createIntercambio(req: AuthRequest, res: Response) {
    try {
      const { otraPersonaId, otraPersonaNombre, descripcion, creditos, fecha } = req.body;
      
      if (!otraPersonaId || !otraPersonaNombre || !descripcion || creditos === undefined) {
        return res.status(400).json({ error: 'Faltan campos requeridos' });
      }

      if (!req.userId) {
        return res.status(401).json({ error: 'No autorizado' });
      }

      const intercambio = await createIntercambioUseCase.execute({
        usuarioId: req.userId,
        otraPersonaId,
        otraPersonaNombre,
        descripcion,
        creditos,
        fecha: fecha ? new Date(fecha) : undefined,
      });

      res.status(201).json(intercambio);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async confirmIntercambio(req: AuthRequest, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const intercambio = await confirmIntercambioUseCase.execute(id);
      res.json(intercambio);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}
