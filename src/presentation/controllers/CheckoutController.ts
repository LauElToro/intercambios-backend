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
    return res.status(410).json({
      error:
        'La compra directa ya no está disponible. Usá «Enviar propuesta» o «Contactar al vendedor» y confirmá con el código por email.',
      code: 'CHECKOUT_DISABLED',
    });
  }
}
