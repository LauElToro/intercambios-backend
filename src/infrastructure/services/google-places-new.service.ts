import { isValidCoord } from '../utils/geo.js';
import type { GeocodeResult } from './google-geocode.service.js';

const API_KEY = process.env.GOOGLE_MAPS_API_KEY?.trim();

export interface PlaceSuggestion {
  placeId: string;
  label: string;
}

export function isGooglePlacesNewConfigured(): boolean {
  return Boolean(API_KEY);
}

/** Places API (New) — autocomplete sin la API legacy de JavaScript. */
export async function autocompletePlaces(input: string): Promise<PlaceSuggestion[]> {
  if (!API_KEY) return [];
  const q = input.trim();
  if (q.length < 2) return [];

  const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY,
    },
    body: JSON.stringify({
      input: q,
      includedRegionCodes: ['ar'],
      languageCode: 'es',
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    console.error('[PLACES_NEW] autocomplete failed:', res.status, errText.slice(0, 200));
    return [];
  }

  const data = (await res.json()) as {
    suggestions?: {
      placePrediction?: {
        placeId?: string;
        text?: { text?: string };
        structuredFormat?: {
          mainText?: { text?: string };
          secondaryText?: { text?: string };
        };
      };
    }[];
  };

  return (data.suggestions ?? [])
    .map((s) => {
      const p = s.placePrediction;
      if (!p?.placeId) return null;
      const label =
        p.text?.text ||
        [p.structuredFormat?.mainText?.text, p.structuredFormat?.secondaryText?.text]
          .filter(Boolean)
          .join(', ') ||
        p.placeId;
      return { placeId: p.placeId, label };
    })
    .filter((x): x is PlaceSuggestion => x != null)
    .slice(0, 8);
}

/** Detalle de lugar (New) → coordenadas para el mapa. */
export async function getPlaceById(placeId: string): Promise<GeocodeResult | null> {
  if (!API_KEY || !placeId.trim()) return null;

  const id = encodeURIComponent(placeId.trim());
  const res = await fetch(`https://places.googleapis.com/v1/places/${id}`, {
    headers: {
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': 'location,formattedAddress,displayName',
    },
  });

  if (!res.ok) {
    console.error('[PLACES_NEW] place details failed:', res.status);
    return null;
  }

  const data = (await res.json()) as {
    location?: { latitude?: number; longitude?: number };
    formattedAddress?: string;
    displayName?: { text?: string };
  };

  const lat = data.location?.latitude;
  const lng = data.location?.longitude;
  if (lat == null || lng == null || !isValidCoord(lat, lng)) return null;

  const address = data.formattedAddress || data.displayName?.text || placeId;
  return { lat, lng, address };
}
