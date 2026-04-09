-- AlterTable
-- Hacer campos ofrece, necesita y precioOferta opcionales
-- Esta migración es segura y no elimina datos

-- Hacer ofrece nullable
ALTER TABLE "User" ALTER COLUMN "oferce" DROP NOT NULL;

-- Hacer necesita nullable
ALTER TABLE "User" ALTER COLUMN "necesita" DROP NOT NULL;

-- Hacer precioOferta nullable
ALTER TABLE "User" ALTER COLUMN "precioOferta" DROP NOT NULL;

-- Establecer valores por defecto para NULLs existentes
UPDATE "User" SET "oferce" = NULL WHERE "oferce" = '';
UPDATE "User" SET "necesita" = NULL WHERE "necesita" = '';
UPDATE "User" SET "precioOferta" = NULL WHERE "precioOferta" = 0;
