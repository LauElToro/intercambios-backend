-- Script SQL directo para ejecutar en la base de datos
-- Ejecutar este SQL directamente en tu base de datos PostgreSQL
-- Copia y pega todo este contenido en tu cliente SQL (pgAdmin, DBeaver, etc.)

-- Agregar todas las columnas faltantes de forma segura

-- nombre
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'User' AND column_name = 'nombre'
  ) THEN
    ALTER TABLE "User" ADD COLUMN "nombre" TEXT;
    UPDATE "User" SET "nombre" = COALESCE("email", 'Usuario') WHERE "nombre" IS NULL;
    ALTER TABLE "User" ALTER COLUMN "nombre" SET NOT NULL;
  END IF;
END $$;

-- contacto
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'User' AND column_name = 'contacto'
  ) THEN
    ALTER TABLE "User" ADD COLUMN "contacto" TEXT;
    UPDATE "User" SET "contacto" = 'Sin contacto' WHERE "contacto" IS NULL;
    ALTER TABLE "User" ALTER COLUMN "contacto" SET NOT NULL;
  END IF;
END $$;

-- ofrece (opcional)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'User' AND column_name = 'oferce'
  ) THEN
    ALTER TABLE "User" ADD COLUMN "oferce" TEXT;
  END IF;
END $$;

-- necesita (opcional)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'User' AND column_name = 'necesita'
  ) THEN
    ALTER TABLE "User" ADD COLUMN "necesita" TEXT;
  END IF;
END $$;

-- precioOferta (opcional)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'User' AND column_name = 'precioOferta'
  ) THEN
    ALTER TABLE "User" ADD COLUMN "precioOferta" INTEGER DEFAULT 0;
  END IF;
END $$;

-- saldo
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'User' AND column_name = 'saldo'
  ) THEN
    ALTER TABLE "User" ADD COLUMN "saldo" INTEGER DEFAULT 0;
    ALTER TABLE "User" ALTER COLUMN "saldo" SET NOT NULL;
  END IF;
END $$;

-- limite
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'User' AND column_name = 'limite'
  ) THEN
    ALTER TABLE "User" ADD COLUMN "limite" INTEGER DEFAULT 15000;
    ALTER TABLE "User" ALTER COLUMN "limite" SET NOT NULL;
  END IF;
END $$;

-- rating (opcional)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'User' AND column_name = 'rating'
  ) THEN
    ALTER TABLE "User" ADD COLUMN "rating" DOUBLE PRECISION;
  END IF;
END $$;

-- totalResenas
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'User' AND column_name = 'totalResenas'
  ) THEN
    ALTER TABLE "User" ADD COLUMN "totalResenas" INTEGER DEFAULT 0;
    ALTER TABLE "User" ALTER COLUMN "totalResenas" SET NOT NULL;
  END IF;
END $$;

-- miembroDesde
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'User' AND column_name = 'miembroDesde'
  ) THEN
    ALTER TABLE "User" ADD COLUMN "miembroDesde" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    ALTER TABLE "User" ALTER COLUMN "miembroDesde" SET NOT NULL;
  END IF;
END $$;

-- ubicacion
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'User' AND column_name = 'ubicacion'
  ) THEN
    ALTER TABLE "User" ADD COLUMN "ubicacion" TEXT;
    UPDATE "User" SET "ubicacion" = 'CABA' WHERE "ubicacion" IS NULL;
    ALTER TABLE "User" ALTER COLUMN "ubicacion" SET NOT NULL;
  END IF;
END $$;

-- verificado
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'User' AND column_name = 'verificado'
  ) THEN
    ALTER TABLE "User" ADD COLUMN "verificado" BOOLEAN DEFAULT false;
    ALTER TABLE "User" ALTER COLUMN "verificado" SET NOT NULL;
  END IF;
END $$;

-- createdAt
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'User' AND column_name = 'createdAt'
  ) THEN
    ALTER TABLE "User" ADD COLUMN "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    ALTER TABLE "User" ALTER COLUMN "createdAt" SET NOT NULL;
  END IF;
END $$;

-- updatedAt
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'User' AND column_name = 'updatedAt'
  ) THEN
    ALTER TABLE "User" ADD COLUMN "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    ALTER TABLE "User" ALTER COLUMN "updatedAt" SET NOT NULL;
  END IF;
END $$;

-- Verificar que todas las columnas existen
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'User'
ORDER BY column_name;
