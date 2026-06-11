/** Distancia en km entre dos puntos (Haversine). */
export function haversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function roundDistanceKm(km: number): number {
  return Math.round(km * 10) / 10;
}

export function isValidCoord(lat: unknown, lng: unknown): boolean {
  return (
    typeof lat === 'number' &&
    !Number.isNaN(lat) &&
    typeof lng === 'number' &&
    !Number.isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

export function getValidCoords(
  lat: unknown,
  lng: unknown,
): { lat: number; lng: number } | null {
  if (!isValidCoord(lat, lng)) return null;
  return { lat: lat as number, lng: lng as number };
}
