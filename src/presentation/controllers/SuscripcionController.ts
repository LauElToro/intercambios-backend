import { Response } from 'express';
import { AuthRequest } from '../../infrastructure/middleware/auth.js';
import {
  SuscripcionError,
  crearCheckout,
  estadoSuscripcion,
} from '../../infrastructure/services/mercadopago-suscripcion.service.js';

function responderError(res: Response, error: unknown) {
  const status = error instanceof SuscripcionError ? error.status : 500;
  const message = error instanceof Error ? error.message : 'Error inesperado.';
  return res.status(status).json({ error: message });
}

export class SuscripcionController {
  static async estado(req: AuthRequest, res: Response) {
    try {
      if (!req.userId) return res.status(401).json({ error: 'No autorizado' });
      const data = await estadoSuscripcion(req.userId);
      return res.json(data);
    } catch (error) {
      return responderError(res, error);
    }
  }

  static async checkout(req: AuthRequest, res: Response) {
    try {
      if (!req.userId) return res.status(401).json({ error: 'No autorizado' });
      const data = await crearCheckout(req.userId, req.body ?? {}, req);
      return res.json(data);
    } catch (error) {
      return responderError(res, error);
    }
  }

  static async webhook(_req: AuthRequest, res: Response) {
    return res.json({ ok: true });
  }
}
