export interface PropuestaPago {
  iox?: number;
  pesos?: number;
  usd?: number;
  cantidad?: number;
}

export interface MensajePropuesta {
  id?: number;
  senderId: number;
  contenido: string;
  createdAt: Date;
}

export function parsePropuestaPagoJson(contenido: string): PropuestaPago | null {
  const t = contenido.trim();
  if (!t.startsWith('{')) return null;
  try {
    const o = JSON.parse(t) as {
      _t?: string;
      iox?: number | null;
      pesos?: number | null;
      usd?: number | null;
      cantidad?: number | null;
    };
    if (o._t !== 'propuesta_pago') return null;
    const propuesta: PropuestaPago = {};
    if (o.iox != null && o.iox > 0) propuesta.iox = Math.floor(o.iox);
    if (o.pesos != null && o.pesos > 0) propuesta.pesos = Math.floor(o.pesos);
    if (o.usd != null && o.usd > 0) propuesta.usd = Math.floor(o.usd);
    if (o.cantidad != null && o.cantidad > 0) propuesta.cantidad = Math.floor(o.cantidad);
    return propuesta.iox || propuesta.pesos || propuesta.usd ? propuesta : null;
  } catch {
    return null;
  }
}

function parseLegacyPropuestaLinea(contenido: string): PropuestaPago | null {
  const propuesta: PropuestaPago = {};
  const ix = contenido.match(/propongo pagar (\d+)\s*(?:IX|IOX)/i);
  if (ix) propuesta.iox = parseInt(ix[1], 10);
  const pesos = contenido.match(/propongo pagar (\d+)\s*pesos/i);
  if (pesos) propuesta.pesos = parseInt(pesos[1], 10);
  const usd = contenido.match(/propongo pagar (\d+)\s*USD/i);
  if (usd) propuesta.usd = parseInt(usd[1], 10);
  return propuesta.iox || propuesta.pesos || propuesta.usd ? propuesta : null;
}

function mergePropuestas(a: PropuestaPago, b: PropuestaPago): PropuestaPago {
  return {
    ...(b.iox ? { iox: b.iox } : a.iox ? { iox: a.iox } : {}),
    ...(b.pesos ? { pesos: b.pesos } : a.pesos ? { pesos: a.pesos } : {}),
    ...(b.usd ? { usd: b.usd } : a.usd ? { usd: a.usd } : {}),
    ...(b.cantidad ? { cantidad: b.cantidad } : a.cantidad ? { cantidad: a.cantidad } : {}),
  };
}

function mergePropuestasConsecutivas(
  mensajes: MensajePropuesta[],
  endIdx: number,
  senderId: number
): PropuestaPago | null {
  let combined: PropuestaPago = {};
  for (let j = endIdx; j >= 0; j--) {
    const m = mensajes[j];
    if (m.senderId !== senderId) break;
    const json = parsePropuestaPagoJson(m.contenido);
    if (json) {
      combined = mergePropuestas(combined, json);
      continue;
    }
    if (/propongo pagar/i.test(m.contenido)) {
      const leg = parseLegacyPropuestaLinea(m.contenido);
      if (leg) {
        combined = mergePropuestas(combined, leg);
        continue;
      }
    }
    if (j === endIdx) break;
    break;
  }
  return combined.iox || combined.pesos || combined.usd ? combined : null;
}

export function mensajeEsAceptacionPropuesta(contenido: string): boolean {
  return /acepto la propuesta/i.test(contenido);
}

export function mensajeEsRechazoPropuesta(contenido: string): boolean {
  return /rechazo la propuesta/i.test(contenido);
}

function esMensajePropuestaPago(contenido: string): boolean {
  return parsePropuestaPagoJson(contenido) !== null || /propongo pagar/i.test(contenido);
}

function hayRechazoEntrePropuestaYAceptacion(
  mensajes: MensajePropuesta[],
  propuestaIdx: number,
  aceptacionIdx: number,
  proposerId: number,
  aceptadorId: number
): boolean {
  for (let k = propuestaIdx + 1; k < aceptacionIdx; k++) {
    const m = mensajes[k];
    if (m.senderId === aceptadorId && mensajeEsRechazoPropuesta(m.contenido)) return true;
    if (m.senderId === proposerId && esMensajePropuestaPago(m.contenido)) return true;
  }
  return false;
}

export function encontrarUltimaPropuestaPago(
  mensajes: MensajePropuesta[]
): { propuesta: PropuestaPago; proposerId: number; lastIdx: number } | null {
  for (let i = mensajes.length - 1; i >= 0; i--) {
    const m = mensajes[i];
    const merged = mergePropuestasConsecutivas(mensajes, i, m.senderId);
    if (merged) {
      return { propuesta: merged, proposerId: m.senderId, lastIdx: i };
    }
  }
  return null;
}

export function propuestaPagoToResumen(p: PropuestaPago): string {
  const parts: string[] = [];
  if (p.iox) parts.push(`${p.iox} IOX`);
  if (p.pesos) parts.push(`${p.pesos} pesos`);
  if (p.usd) parts.push(`${p.usd} USD`);
  return parts.join(' + ');
}

export type AcuerdoCompleto = {
  iox?: number;
  pesos?: number;
  usd?: number;
  cantidad?: number;
  pagadorId: number;
};

export type AcuerdoAceptado = AcuerdoCompleto & {
  aceptadoAt: Date;
  aceptacionMensajeId: number;
};

/** Última propuesta aceptada en el hilo (soporta propuesta unificada o mensajes legacy). */
export function parseUltimoAcuerdoAceptado(mensajes: MensajePropuesta[]): AcuerdoAceptado | null {
  const sorted = [...mensajes].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  for (let i = sorted.length - 1; i >= 0; i--) {
    const m = sorted[i];
    if (!mensajeEsAceptacionPropuesta(m.contenido)) continue;
    if (!m.id) continue;

    const aceptadorId = m.senderId;
    for (let j = i - 1; j >= 0; j--) {
      const p = sorted[j];
      if (p.senderId === aceptadorId) continue;
      const merged = mergePropuestasConsecutivas(sorted, j, p.senderId);
      if (!merged) continue;
      if (hayRechazoEntrePropuestaYAceptacion(sorted, j, i, p.senderId, aceptadorId)) continue;

      const acuerdo: AcuerdoAceptado = {
        /** Proponente de la propuesta aceptada; usar `resolverPagadorId` para el débito real. */
        pagadorId: p.senderId,
        aceptadoAt: m.createdAt,
        aceptacionMensajeId: m.id,
      };
      if (merged.iox) acuerdo.iox = merged.iox;
      if (merged.pesos) acuerdo.pesos = merged.pesos;
      if (merged.usd) acuerdo.usd = merged.usd;
      if (merged.cantidad) acuerdo.cantidad = merged.cantidad;
      return acuerdo;
    }
  }

  return null;
}

/** True si hay un acuerdo aceptado que aún no se confirmó con código (permite 2.ª compra en el mismo chat). */
export function acuerdoPendienteDeConfirmar(
  acuerdo: AcuerdoAceptado | null,
  registroCompletadoAt: Date | null | undefined
): boolean {
  if (!acuerdo) return false;
  if (!registroCompletadoAt) return true;
  return acuerdo.aceptadoAt.getTime() > registroCompletadoAt.getTime();
}

/** Busca la última propuesta aceptada en el hilo (soporta propuesta unificada o mensajes legacy). */
export function parseAcuerdoAceptadoDesdeMensajes(mensajes: MensajePropuesta[]): AcuerdoCompleto | null {
  const acuerdo = parseUltimoAcuerdoAceptado(mensajes);
  if (!acuerdo) return null;
  const { aceptadoAt: _, ...rest } = acuerdo;
  return rest;
}

function propuestaPagoToDisplayText(p: PropuestaPago): string {
  const parts: string[] = [];
  if (p.iox) parts.push(`${p.iox} IOX de diferencia`);
  if (p.pesos) parts.push(`${p.pesos} pesos (por fuera)`);
  if (p.usd) parts.push(`${p.usd} USD (por fuera)`);
  if (parts.length === 0) return '';
  return `Propongo cerrar el intercambio con: ${parts.join(', ')}. Ambos debemos aprobar el acuerdo.`;
}

export function tienePropuestaIntercambioEnHilo(mensajes: MensajePropuesta[]): boolean {
  return mensajes.some(
    (m) =>
      /"_t":"intercambio"/.test(m.contenido) ||
      (/quiero realizar un intercambio/i.test(m.contenido) &&
        (/ver mi producto/i.test(m.contenido) || /imagen del producto/i.test(m.contenido)))
  );
}

function parseIntercambioPreciosPorRol(
  mensajes: MensajePropuesta[],
  compradorId: number
): { precioComprador: number; precioVendedor: number } | null {
  const msg = mensajes.find((m) => /"_t":"intercambio"/.test(m.contenido));
  if (!msg) return null;
  try {
    const p = JSON.parse(msg.contenido) as {
      _t?: string;
      miProducto?: { precio?: number };
      tuProducto?: { precio?: number };
    };
    if (p._t !== 'intercambio' || !p.miProducto || !p.tuProducto) return null;
    const mi = Number(p.miProducto.precio ?? 0) || 0;
    const tu = Number(p.tuProducto.precio ?? 0) || 0;
    if (msg.senderId === compradorId) {
      return { precioComprador: mi, precioVendedor: tu };
    }
    return { precioComprador: tu, precioVendedor: mi };
  } catch {
    return null;
  }
}

/**
 * Quién debe pagar IOX según el acuerdo.
 * - Compra en market (sin permuta): siempre el comprador de la conversación.
 * - Permuta: quien tiene el producto de menor valor paga la diferencia; si el proponente
 *   tiene el de mayor valor, la diferencia la paga la otra parte.
 */
export function resolverPagadorId(
  compradorId: number,
  vendedorId: number,
  mensajes: MensajePropuesta[],
  proposerId: number
): number {
  if (!tienePropuestaIntercambioEnHilo(mensajes)) {
    return compradorId;
  }

  const precios = parseIntercambioPreciosPorRol(mensajes, compradorId);
  if (!precios) {
    return proposerId;
  }

  const proposerEsComprador = proposerId === compradorId;
  const precioProposer = proposerEsComprador ? precios.precioComprador : precios.precioVendedor;
  const precioOtro = proposerEsComprador ? precios.precioVendedor : precios.precioComprador;

  if (precioProposer < precioOtro) {
    return proposerId;
  }
  return proposerEsComprador ? vendedorId : compradorId;
}

export function cantidadAcuerdo(acuerdo: { cantidad?: number } | null | undefined): number {
  const n = acuerdo?.cantidad ?? 1;
  return n > 0 ? Math.floor(n) : 1;
}

function parseProductIdFromUrl(url?: string): number | null {
  if (!url) return null;
  const m = url.match(/\/producto\/(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

/** IDs de publicaciones cuyo stock debe moverse al confirmar (compra o permuta). */
export function marketItemIdsParaStock(
  conversacion: { marketItemId: number | null },
  mensajes: MensajePropuesta[]
): number[] {
  const ids = new Set<number>();
  if (conversacion.marketItemId) ids.add(conversacion.marketItemId);

  const msgInter = mensajes.find((m) => /"_t":"intercambio"/.test(m.contenido));
  if (msgInter) {
    try {
      const p = JSON.parse(msgInter.contenido) as {
        miProducto?: { url?: string };
        tuProducto?: { url?: string };
      };
      const miId = parseProductIdFromUrl(p.miProducto?.url);
      const tuId = parseProductIdFromUrl(p.tuProducto?.url);
      if (miId) ids.add(miId);
      if (tuId) ids.add(tuId);
    } catch {
      /* ignore */
    }
  }

  return [...ids];
}

/** Texto legible para previews de chat, notificaciones y emails (nunca JSON crudo). */
export function formatearPreviewMensaje(contenido: string): string {
  const trimmed = contenido.trim();
  const json = parsePropuestaPagoJson(trimmed);
  if (json) return propuestaPagoToDisplayText(json);
  const legacy = parseLegacyPropuestaLinea(trimmed);
  if (legacy) return propuestaPagoToDisplayText(legacy);
  if (trimmed.startsWith('{"_t":"intercambio"')) return 'Propuesta de intercambio';
  if (/quiero realizar un intercambio/i.test(contenido)) return 'Propuesta de intercambio';
  if (mensajeEsAceptacionPropuesta(contenido)) return 'Aceptó la propuesta de pago';
  if (mensajeEsRechazoPropuesta(contenido)) return 'Rechazó la propuesta de pago';
  if (/código de verificación enviado por email/i.test(contenido)) {
    return 'Código de verificación enviado por email';
  }
  return contenido.replace(/\*\*/g, '').split('\n')[0];
}
