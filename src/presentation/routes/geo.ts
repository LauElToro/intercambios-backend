import express from 'express';
import { GeoController } from '../controllers/GeoController.js';

export const geoRouter = express.Router();

geoRouter.get('/geocode', GeoController.geocode);
geoRouter.get('/reverse', GeoController.reverse);
geoRouter.get('/autocomplete', GeoController.autocomplete);
geoRouter.get('/place', GeoController.place);
