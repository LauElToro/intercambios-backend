export interface PropuestaPago {
  iox?: number;
  pesos?: number;
  usd?: number;
}

export interface MensajePropuesta {
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
    };
    if (o._t !== 'propuesta_pago') return null;
    const propuesta: PropuestaPago = {};
    if (o.iox != null && o.iox > 0) propuesta.iox = Math.floor(o.iox);
    if (o.pesos != null && o.pesos > 0) propuesta.pesos = Math.floor(o.pesos);
    if (o.usd != null && o.usd > 0) propuesta.usd = Math.floor(o.usd);
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
  pagadorId: number;
};

/** Busca la última propuesta aceptada en el hilo (soporta propuesta unificada o mensajes legacy). */
export function parseAcuerdoAceptadoDesdeMensajes(mensajes: MensajePropuesta[]): AcuerdoCompleto | null {
  const sorted = [...mensajes].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  for (let i = sorted.length - 1; i >= 0; i--) {
    const m = sorted[i];
    if (!mensajeEsAceptacionPropuesta(m.contenido)) continue;

    const aceptadorId = m.senderId;
    for (let j = i - 1; j >= 0; j--) {
      const p = sorted[j];
      if (p.senderId === aceptadorId) continue;
      const merged = mergePropuestasConsecutivas(sorted, j, p.senderId);
      if (!merged) continue;

      const acuerdo: AcuerdoCompleto = { pagadorId: p.senderId };
      if (merged.iox) acuerdo.iox = merged.iox;
      if (merged.pesos) acuerdo.pesos = merged.pesos;
      if (merged.usd) acuerdo.usd = merged.usd;
      return acuerdo;
    }
  }

  return null;
}
