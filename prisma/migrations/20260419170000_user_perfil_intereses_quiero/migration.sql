-- Palabras clave "Lo que quiero" para priorizar coincidencias y mostrar en perfil
ALTER TABLE "UserPerfilMercado" ADD COLUMN "interesesQuiero" TEXT[] NOT NULL DEFAULT '{}';
