import { Response } from 'express';
import { AuthRequest } from '../../infrastructure/middleware/auth.js';
import { CheckoutUseCase } from '../../application/use-cases/checkout/CheckoutUseCase.js';
import { UserRepository } from '../../infrastructure/repositories/UserRepository.js';
import { MarketItemRepository } from '../../infrastructure/repositories/MarketItemRepository.js';
import { IntercambioRepository } from '../../infrastructure/repositories/IntercambioRepository.js';

const userRepository = new UserRepository();
const marketItemRepository = new MarketItemRepository();
const intercambioRepository = new IntercambioRepository();
const checkoutUseCase = new CheckoutUseCase(userRepository, marketItemRepository, intercambioRepository);

export class CheckoutController {
  static async checkout(req: AuthRequest, res: Response) {
    try {
      const compradorId = req.userId;
      const marketItemId = parseInt(req.params.marketItemId ?? req.body.marketItemId);

      if (!compradorId) {
        return res.status(401).json({ error: 'Debes iniciar sesión para comprar' });
      }

      if (!marketItemId) {
        return res.status(400).json({ error: 'Falta el ID del producto' });
      }

      const result = await checkoutUseCase.execute({ compradorId, marketItemId });
      res.status(201).json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}
