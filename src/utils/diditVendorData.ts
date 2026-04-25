/** vendor_data enviado al crear la sesión suele ser el id numérico del usuario (string). */

export function parseUserIdFromVendorData(vendorData: unknown): number | null {
  if (vendorData == null) return null;
  const s = String(vendorData).trim();
  const direct = parseInt(s, 10);
  if (Number.isFinite(direct) && direct >= 1) return direct;
  const m = s.match(/(\d+)/);
  if (m) {
    const v = parseInt(m[1], 10);
    if (Number.isFinite(v) && v >= 1) return v;
  }
  return null;
}
