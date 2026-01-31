-- AlterTable
-- Agregar columnas faltantes de forma segura
-- Esta migración es idempotente y no elimina datos

-- Agregar columna nombre si no existe
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "nombre" TEXT;

-- Actualizar valores NULL de nombre con valores por defecto (usando email como fallback)
UPDATE "User" 
SET "nombre" = COALESCE(
  (SELECT "email" FROM "User" u2 WHERE u2.id = "User".id LIMIT 1),
  'Usuario'
)
WHERE "nombre" IS NULL;

-- Hacer la columna nombre NOT NULL solo si no hay NULLs
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "User" WHERE "nombre" IS NULL LIMIT 1
  ) THEN
    ALTER TABLE "User" ALTER COLUMN "nombre" SET NOT NULL;
  END IF;
END $$;

-- Agregar columna contacto si no existe
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "contacto" TEXT;

-- Actualizar valores NULL de contacto con valores por defecto
UPDATE "User" 
SET "contacto" = 'Sin contacto'
WHERE "contacto" IS NULL;

-- Hacer la columna contacto NOT NULL solo si no hay NULLs
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "User" WHERE "contacto" IS NULL LIMIT 1
  ) THEN
    ALTER TABLE "User" ALTER COLUMN "contacto" SET NOT NULL;
  END IF;
END $$;
