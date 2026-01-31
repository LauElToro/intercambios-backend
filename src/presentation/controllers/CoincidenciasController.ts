import { Request, Response } from 'express';
import { GetCoincidenciasUseCase } from '../../application/use-cases/coincidencias/GetCoincidenciasUseCase.js';
import { UserRepository } from '../../infrastructure/repositories/UserRepository.js';
import { MarketItemRepository } from '../../infrastructure/repositories/MarketItemRepository.js';

const userRepository = new UserRepository();
const marketItemRepository = new MarketItemRepository();
const getCoincidenciasUseCase = new GetCoincidenciasUseCase(userRepository, marketItemRepository);

export class CoincidenciasController {
  static async getCoincidencias(req: Request, res: Response) {
    try {
      const userId = parseInt(req.params.userId);
      const margen = req.query.margen ? Number(req.query.margen) : 0.2;
      
      const coincidencias = await getCoincidenciasUseCase.execute(userId, margen);
      res.json(coincidencias);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}
