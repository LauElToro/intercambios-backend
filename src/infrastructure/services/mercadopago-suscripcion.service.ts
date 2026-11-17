import { randomUUID } from 'crypto';
import type { Request } from 'express';
import prisma from '../database/prisma.js';

export class SuscripcionError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const PLANES = {
  intercambio_mensual: { grupo: 'intercambio' as const, monto: 3, frecuencia: 1, incluyeKyc: false, motivo: 'Intercambius — trueque, canje y compras (mensual)' },
  intercambio_anual: { grupo: 'intercambio' as const, monto: 30, frecuencia: 12, incluyeKyc: true, motivo: 'Intercambius — trueque, canje y compras (anual, incluye KYC)' },
  vendedor_mensual: { grupo: 'vendedor' as const, monto: 5, frecuencia: 1, incluyeKyc: false, motivo: 'Intercambius — ventas (mensual)' },
  vendedor_anual: { grupo: 'vendedor' as const, monto: 45, frecuencia: 12, incluyeKyc: true, motivo: 'Intercambius — ventas (anual, incluye KYC)' },
};

type CodigoPlan = keyof typeof PLANES;
type Grupo = 'intercambio' | 'vendedor';

const KYC_USD = 3;
const CANCELADAS = new Set([
  'cancelado',
  'cancelada',
  'rechazado',
  'rechazada',
  'anulado',
  'anulada',
  'fallido',
]);

let tokenCache: { token: string; until: number } | null = null;
let cotizacionCache: { arsPorUsd: number; until: number } | null = null;

/** La cuenta es de Argentina: las suscripciones solo aceptan ARS. El KYC sí puede cobrarse en USD. */
const MONEDA_SUSCRIPCION = 'ARS';
const MINIMO_SUSCRIPCION_ARS = 15;

function frontendUrl(): string {
  return (process.env.FRONTEND_URL || 'https://intercambius.com.ar').replace(/\/$/, '');
}

export function backendPublicUrl(req?: Request): string {
  const fromEnv = process.env.BACKEND_PUBLIC_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  const host = req?.get('x-forwarded-host') || req?.get('host');
  const proto = (req?.get('x-forwarded-proto') || 'https').split(',')[0]?.trim() || 'https';
  if (host && !/localhost|127\.0\.0\.1/.test(host)) return `${proto}://${host}`;
  return 'https://intercambios-backend.vercel.app';
}

function credencialesPresentes(): boolean {
  return Boolean(
    process.env.MERCADOPAGO_ACCESS_TOKEN?.trim() ||
      (process.env.MERCADOPAGO_CLIENT_ID?.trim() && process.env.MERCADOPAGO_CLIENT_SECRET?.trim()),
  );
}

async function arsPorUsd(): Promise<number> {
  if (cotizacionCache && cotizacionCache.until > Date.now()) return cotizacionCache.arsPorUsd;
  const token = await accessToken();
  const response = await fetch('https://api.mercadopago.com/currency_conversions/search?from=USD&to=ARS', {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  const data = (await response.json().catch(() => ({}))) as { rate?: number; ratio?: number };
  const rate = Number(data.rate || data.ratio);
  if (response.ok && rate > 0) {
    cotizacionCache = { arsPorUsd: rate, until: Date.now() + 10 * 60 * 1000 };
    return rate;
  }
  const fijo = Number(process.env.MERCADOPAGO_ARS_PER_USD);
  if (fijo > 0) return fijo;
  throw new SuscripcionError('No pudimos cotizar el dólar para cobrar la suscripción.', 503);
}

function montoSuscripcionArs(usd: number, rate: number): number {
  return Math.max(MINIMO_SUSCRIPCION_ARS, Math.round(usd * rate));
}

function mensajeMp(data: { cause?: { description?: string }[]; message?: string; error?: string }): string {
  if (Array.isArray(data?.cause) && data.cause[0]?.description) return String(data.cause[0].description);
  if (typeof data?.message === 'string' && data.message && data.message !== 'bad_request') return data.message;
  if (typeof data?.error === 'string' && data.error && data.error !== 'bad_request') return data.error;
  return 'Mercado Pago rechazó la operación.';
}

async function accessToken(): Promise<string> {
  const directo = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();
  if (directo) return directo;
  if (tokenCache && tokenCache.until > Date.now()) return tokenCache.token;

  const clientId = process.env.MERCADOPAGO_CLIENT_ID?.trim();
  const clientSecret = process.env.MERCADOPAGO_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new SuscripcionError(
      'Falta el Access Token de Mercado Pago en el servidor (MERCADOPAGO_ACCESS_TOKEN).',
      503,
    );
  }

  const response = await fetch('https://api.mercadopago.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials',
    }),
  });
  const data = (await response.json().catch(() => ({}))) as { access_token?: string; expires_in?: number };
  if (!response.ok || !data.access_token) {
    throw new SuscripcionError(
      'Mercado Pago no aceptó el id y el secret de la aplicación. En el panel, copiá el Access Token de producción y cargalo como MERCADOPAGO_ACCESS_TOKEN.',
      503,
    );
  }
  const expiresIn = Number(data.expires_in) || 3600;
  tokenCache = { token: data.access_token, until: Date.now() + Math.max(60, expiresIn - 120) * 1000 };
  return data.access_token;
}

async function mp(method: string, pathname: string, payload?: unknown): Promise<Record<string, unknown>> {
  const token = await accessToken();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
  };
  if (payload) {
    headers['Content-Type'] = 'application/json';
    headers['X-Idempotency-Key'] = randomUUID();
  }
  const response = await fetch(`https://api.mercadopago.com${pathname}`, {
    method,
    headers,
    body: payload ? JSON.stringify(payload) : undefined,
  });
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    throw new SuscripcionError(mensajeMp(data as { cause?: { description?: string }[]; message?: string; error?: string }), 502);
  }
  return data;
}

function cuentaComoTransaccion(estado: string | null | undefined): boolean {
  const e = String(estado ?? '').trim().toLowerCase();
  if (!e) return true;
  return !CANCELADAS.has(e);
}

function esCanje(item: { modo: string | null; otroMarketItemId: number | null; descripcion: string }): boolean {
  if (item.modo === 'permuta') return true;
  if (item.otroMarketItemId != null && item.otroMarketItemId > 0) return true;
  if (item.descripcion && /^Canje(\s|:)/i.test(item.descripcion.trim())) return true;
  return false;
}

function esVentaPura(
  item: {
    usuarioId: number;
    otraPersonaId: number;
    creditos: number;
    estado: string;
    modo: string | null;
    otroMarketItemId: number | null;
    descripcion: string;
  },
  userId: number,
): boolean {
  if (!cuentaComoTransaccion(item.estado)) return false;
  if (esCanje(item)) return false;
  const creditos = Number(item.creditos) || 0;
  return (item.usuarioId === userId && creditos > 0) || (item.otraPersonaId === userId && creditos < 0);
}

async function grupoDeUsuario(userId: number): Promise<Grupo> {
  const lista = await prisma.intercambio.findMany({
    where: { OR: [{ usuarioId: userId }, { otraPersonaId: userId }] },
    select: {
      usuarioId: true,
      otraPersonaId: true,
      creditos: true,
      estado: true,
      modo: true,
      otroMarketItemId: true,
      descripcion: true,
    },
  });
  return lista.some((item) => esVentaPura(item, userId)) ? 'vendedor' : 'intercambio';
}

function referenciaPlan(userId: number, plan: string): string {
  return `ix-u-${userId}-${plan}`;
}

function referenciaKyc(userId: number): string {
  return `ix-kyc-u-${userId}`;
}

function initPoint(data: Record<string, unknown>, token: string): string | null {
  const test = token.startsWith('TEST-');
  const elegido = test ? data.sandbox_init_point : data.init_point;
  const url = (typeof elegido === 'string' && elegido) || (typeof data.init_point === 'string' && data.init_point) || (typeof data.sandbox_init_point === 'string' && data.sandbox_init_point);
  return url || null;
}

async function planesAutorizados(userId: number): Promise<CodigoPlan[]> {
  const activos: CodigoPlan[] = [];
  for (const codigo of Object.keys(PLANES) as CodigoPlan[]) {
    const data = await mp('GET', `/preapproval/search?external_reference=${encodeURIComponent(referenciaPlan(userId, codigo))}`);
    const results = Array.isArray(data.results) ? data.results : [];
    if (results.some((item) => (item as { status?: string }).status === 'authorized')) activos.push(codigo);
  }
  return activos;
}

async function kycEstaPago(userId: number, planes: CodigoPlan[]): Promise<boolean> {
  if (planes.some((codigo) => PLANES[codigo].incluyeKyc)) return true;
  const data = await mp(
    'GET',
    `/v1/payments/search?sort=date_created&criteria=desc&external_reference=${encodeURIComponent(referenciaKyc(userId))}`,
  );
  const results = Array.isArray(data.results) ? data.results : [];
  return results.some((item) => {
    const status = (item as { status?: string }).status;
    return status === 'approved' || status === 'accredited';
  });
}

export async function estadoSuscripcion(userId: number): Promise<{
  configurado: boolean;
  planesAutorizados: string[];
  kycPago: boolean;
  cotizacionArsPorUsd: number | null;
}> {
  if (!credencialesPresentes()) {
    return { configurado: false, planesAutorizados: [], kycPago: false, cotizacionArsPorUsd: null };
  }
  const planes = await planesAutorizados(userId);
  const kycPago = await kycEstaPago(userId, planes);
  let cotizacionArsPorUsd: number | null = null;
  try {
    cotizacionArsPorUsd = await arsPorUsd();
  } catch {
    cotizacionArsPorUsd = null;
  }
  return { configurado: true, planesAutorizados: planes, kycPago, cotizacionArsPorUsd };
}

export async function crearCheckout(
  userId: number,
  body: { tipo?: string; plan?: string },
  req: Request,
): Promise<{ initPoint: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, nombre: true },
  });
  if (!user) throw new SuscripcionError('No encontramos tu usuario.', 404);

  const tipo = body.tipo === 'kyc' ? 'kyc' : 'suscripcion';
  const token = await accessToken();
  const vuelta = `${frontendUrl()}/suscripcion?retorno=1`;
  const notificationUrl = `${backendPublicUrl(req)}/api/webhooks/mercadopago`;

  if (tipo === 'kyc') {
    const preference = await mp('POST', '/checkout/preferences', {
      items: [
        {
          title: 'KYC Intercambius',
          description: 'Verificación de identidad, pago único',
          quantity: 1,
          currency_id: 'USD',
          unit_price: KYC_USD,
        },
      ],
      payer: { email: user.email, name: user.nombre },
      external_reference: referenciaKyc(user.id),
      back_urls: { success: vuelta, pending: vuelta, failure: vuelta },
      auto_return: 'approved',
      notification_url: notificationUrl,
    });
    const url = initPoint(preference, token);
    if (!url) throw new SuscripcionError('Mercado Pago no devolvió el link de pago.', 502);
    return { initPoint: url };
  }

  const codigo = String(body.plan || '') as CodigoPlan;
  const plan = PLANES[codigo];
  if (!plan) throw new SuscripcionError('Ese plan no existe.', 400);
  if (!user.email) throw new SuscripcionError('Tu cuenta no tiene email para cobrar la suscripción.', 400);

  const grupo = await grupoDeUsuario(user.id);
  if (plan.grupo !== grupo) {
    throw new SuscripcionError(
      grupo === 'vendedor'
        ? 'Como ya tuviste una venta, el plan que corresponde es el de USD 5 por mes o USD 45 al año.'
        : 'Todavía no registraste una venta. El plan que corresponde es el de USD 3 por mes o USD 30 al año.',
      400,
    );
  }

  const cotizacion = await arsPorUsd();
  const montoArs = montoSuscripcionArs(plan.monto, cotizacion);
  const preapproval = await mp('POST', '/preapproval', {
    reason: `${plan.motivo}. Equivale a USD ${plan.monto}.`,
    external_reference: referenciaPlan(user.id, codigo),
    payer_email: user.email,
    back_url: vuelta,
    status: 'pending',
    auto_recurring: {
      frequency: plan.frecuencia,
      frequency_type: 'months',
      transaction_amount: montoArs,
      currency_id: MONEDA_SUSCRIPCION,
    },
  });
  const url = initPoint(preapproval, token);
  if (!url) throw new SuscripcionError('Mercado Pago no devolvió el link de la suscripción.', 502);
  return { initPoint: url };
}
