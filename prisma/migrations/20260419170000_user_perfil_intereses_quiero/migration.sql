-- Palabras clave "Lo que quiero" para priorizar coincidencias y mostrar en perfil
-- IF NOT EXISTS: compatible con columnas ya creadas por ensureSchema / entornos previos
ALTER TABLE "UserPerfilMercado" ADD COLUMN IF NOT EXISTS "interesesQuiero" TEXT[] NOT NULL DEFAULT '{}';
