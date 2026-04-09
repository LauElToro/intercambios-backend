import { MESES_REGULARIZACION_DEUDA, SALDO_POSITIVO_MAX_IOX } from '../../config/economy.js';

/**
 * Actualiza la marca de tiempo de "deuda al límite" cuando el saldo cruza -limite o se recupera.
 */
export function computeDeudaEnLimiteDesde(
  saldoAntes: number,
  saldoDespues: number,
  limite: number,
  prev: Date | null
): Date | null {
  const bajo = (s: number) => s <= -limite;
  if (!bajo(saldoDespues)) return null;
  if (bajo(saldoAntes) && prev) return prev;
  return new Date();
}

export function assertVendedorSaldoNoExcedeTope(saldoActual: number, precio: number): void {
  if (saldoActual + precio > SALDO_POSITIVO_MAX_IOX) {
    throw new Error(
      `El vendedor no puede superar ${SALDO_POSITIVO_MAX_IOX.toLocaleString('es-AR')} IOX de saldo positivo. Regularizá o contactá soporte.`
    );
  }
}

/** Referencia documentación: si hace falta aviso de regularización (no bloquea por sí solo). */
export function mesesDesde(fecha: Date | null): number | null {
  if (!fecha) return null;
  const ms = Date.now() - fecha.getTime();
  return ms / (1000 * 60 * 60 * 24 * 30.44);
}

export function requiereRegularizacionPorPlazo(deudaDesde: Date | null): boolean {
  const m = mesesDesde(deudaDesde);
  return m != null && m >= MESES_REGULARIZACION_DEUDA;
}
