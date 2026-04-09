/**
 * Parámetros del diseño económico Intercambius (alineados con documentación / frontend).
 * @see src/lib/constants.ts en el cliente
 */

/** Límite de deuda en IOX (negativo) por defecto. */
export const DEFAULT_CREDIT_LIMIT_IOX = 50_000;

/** Mínimo de IOX sobre el valor de cada operación (compra/venta), en porcentaje. */
export const COMISION_IOX_MIN_PORCENTAJE = 5;

/** Tope de saldo positivo acumulable por usuario (referencia operativa). */
export const SALDO_POSITIVO_MAX_IOX = 300_000;

/** Meses con deuda al límite antes de considerar regularización. */
export const MESES_REGULARIZACION_DEUDA = 6;

/** Umbral de alerta: % del volumen de un grupo que sugiere colusión (referencia antifraude). */
export const COLUSION_ALERTA_PCT_VOLUMEN_GRUPO = 70;
