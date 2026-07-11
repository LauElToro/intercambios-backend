import { COMISION_IOX_MIN_PORCENTAJE, DEFAULT_CREDIT_LIMIT_IOX } from '../../config/economy.js';
import type { PropuestaPago } from './chatPropuesta.js';

export function minimoIoxRequerido(valorReferencia: number): number {
  if (valorReferencia <= 0) return 0;
  return Math.ceil((valorReferencia * COMISION_IOX_MIN_PORCENTAJE) / 100);
}

export function validarMinimoIoxEnPropuesta(
  propuesta: PropuestaPago,
  valorReferencia: number
): string | null {
  const min = minimoIoxRequerido(valorReferencia);
  if (min <= 0) return null;
  const iox = propuesta.iox ?? 0;
  if (iox < min) {
    return `Toda operación debe incluir al menos ${COMISION_IOX_MIN_PORCENTAJE}% en IOX (mínimo ${min} IOX para este intercambio).`;
  }
  return null;
}

export function validarSaldoPagador(
  saldo: number,
  limite: number = DEFAULT_CREDIT_LIMIT_IOX,
  montoIox: number
): string | null {
  if (montoIox <= 0) return null;
  if (saldo - montoIox < -limite) {
    return 'Saldo insuficiente: no tenés crédito disponible para esta propuesta en IOX.';
  }
  return null;
}
