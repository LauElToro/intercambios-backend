import { isValidCoord } from '../utils/geo.js';

const API_KEY = process.env.GOOGLE_MAPS_API_KEY?.trim();

export interface GeocodeResult {
  lat: number;
  lng: number;
  address: string;
}

function pickAddress(components: { long_name: string; types: string[] }[]): string {
  const parts: string[] = [];
  const neighbourhood = components.find((c) =>
    c.types.some((t) => t === 'neighborhood' || t === 'sublocality' || t === 'sublocality_level_1'),
  );
  const locality = components.find((c) =>
    c.types.some((t) => t === 'locality' || t === 'administrative_area_level_2'),
  );
  const admin = components.find((c) => c.types.includes('administrative_area_level_1'));
  if (neighbourhood) parts.push(neighbourhood.long_name);
  if (locality) parts.push(locality.long_name);
  if (admin) parts.push(admin.long_name);
  return parts.join(', ');
}

export function isGoogleGeocodeConfigured(): boolean {
  return Boolean(API_KEY);
}

export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  if (!API_KEY || !address.trim()) return null;
  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
  url.searchParams.set('address', address.trim());
  url.searchParams.set('key', API_KEY);
  url.searchParams.set('region', 'ar');
  url.searchParams.set('language', 'es');

  const res = await fetch(url.toString());
  if (!res.ok) return null;
  const data = (await res.json()) as {
    status: string;
    results?: {
      formatted_address: string;
      geometry: { location: { lat: number; lng: number } };
      address_components: { long_name: string; types: string[] }[];
    }[];
  };
  if (data.status !== 'OK' || !data.results?.length) return null;
  const r = data.results[0];
  const { lat, lng } = r.geometry.location;
  if (!isValidCoord(lat, lng)) return null;
  const short = pickAddress(r.address_components);
  return { lat, lng, address: short || r.formatted_address };
}

export async function reverseGeocode(lat: number, lng: number): Promise<GeocodeResult | null> {
  if (!API_KEY || !isValidCoord(lat, lng)) return null;
  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
  url.searchParams.set('latlng', `${lat},${lng}`);
  url.searchParams.set('key', API_KEY);
  url.searchParams.set('language', 'es');

  const res = await fetch(url.toString());
  if (!res.ok) return null;
  const data = (await res.json()) as {
    status: string;
    results?: {
      formatted_address: string;
      address_components: { long_name: string; types: string[] }[];
    }[];
  };
  if (data.status !== 'OK' || !data.results?.length) return null;
  const r = data.results[0];
  const short = pickAddress(r.address_components);
  return { lat, lng, address: short || r.formatted_address };
}
