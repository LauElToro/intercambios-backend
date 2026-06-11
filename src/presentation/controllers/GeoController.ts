import { Request, Response } from 'express';
import {
  geocodeAddress,
  isGoogleGeocodeConfigured,
  reverseGeocode,
} from '../../infrastructure/services/google-geocode.service.js';
import {
  autocompletePlaces,
  getPlaceById,
  isGooglePlacesNewConfigured,
} from '../../infrastructure/services/google-places-new.service.js';
import { isValidCoord } from '../../infrastructure/utils/geo.js';

export class GeoController {
  static async geocode(req: Request, res: Response) {
    try {
      if (!isGoogleGeocodeConfigured()) {
        return res.status(503).json({ error: 'Geocoding no configurado (GOOGLE_MAPS_API_KEY)' });
      }
      const address = String(req.query.address || req.query.q || '').trim();
      if (address.length < 2) {
        return res.status(400).json({ error: 'Parámetro address requerido' });
      }
      const result = await geocodeAddress(address);
      if (!result) {
        return res.status(404).json({ error: 'No se encontró la ubicación' });
      }
      res.json(result);
    } catch {
      res.status(500).json({ error: 'Error al geocodificar' });
    }
  }

  static async reverse(req: Request, res: Response) {
    try {
      if (!isGoogleGeocodeConfigured()) {
        return res.status(503).json({ error: 'Geocoding no configurado (GOOGLE_MAPS_API_KEY)' });
      }
      const lat = Number(req.query.lat);
      const lng = Number(req.query.lng);
      if (!isValidCoord(lat, lng)) {
        return res.status(400).json({ error: 'lat y lng válidos requeridos' });
      }
      const result = await reverseGeocode(lat, lng);
      if (!result) {
        return res.status(404).json({ error: 'No se pudo resolver la dirección' });
      }
      res.json(result);
    } catch {
      res.status(500).json({ error: 'Error en reverse geocoding' });
    }
  }

  static async autocomplete(req: Request, res: Response) {
    try {
      if (!isGooglePlacesNewConfigured()) {
        return res.status(503).json({ error: 'Places API no configurada (GOOGLE_MAPS_API_KEY)' });
      }
      const input = String(req.query.input || req.query.q || '').trim();
      if (input.length < 2) {
        return res.json([]);
      }
      const suggestions = await autocompletePlaces(input);
      res.json(suggestions);
    } catch {
      res.status(500).json({ error: 'Error en autocomplete' });
    }
  }

  static async place(req: Request, res: Response) {
    try {
      if (!isGooglePlacesNewConfigured()) {
        return res.status(503).json({ error: 'Places API no configurada (GOOGLE_MAPS_API_KEY)' });
      }
      const placeId = String(req.query.placeId || req.params.placeId || '').trim();
      if (!placeId) {
        return res.status(400).json({ error: 'placeId requerido' });
      }
      const result = await getPlaceById(placeId);
      if (!result) {
        return res.status(404).json({ error: 'No se encontró el lugar' });
      }
      res.json(result);
    } catch {
      res.status(500).json({ error: 'Error al obtener lugar' });
    }
  }
}
