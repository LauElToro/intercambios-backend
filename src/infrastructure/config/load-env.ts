import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

/**
 * Carga backend/.env y **sobrescribe** variables del sistema (p. ej. SMTP_USER de Windows).
 * Sin override:true, un SMTP_USER global del OS pisa noreply@ y rompe OAuth Gmail.
 */
dotenv.config({
  path: path.join(backendRoot, '.env'),
  override: true,
});
