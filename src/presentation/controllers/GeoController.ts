import { Request, Response } from 'express';
import {
  geocodeAddress,
  isGoogleGeocodeConfigured,
  reverseGeocode,
} from '../../infrastructure/services/google-geocode.service.js';
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
}
