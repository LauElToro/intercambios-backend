-- Migración completa para agregar todas las columnas faltantes
-- Esta migración es idempotente y segura - no elimina datos

-- Agregar columna nombre si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'User' 
    AND column_name = 'nombre'
  ) THEN
    ALTER TABLE "User" ADD COLUMN "nombre" TEXT;
    UPDATE "User" SET "nombre" = COALESCE(
      (SELECT "email" FROM "User" u2 WHERE u2.id = "User".id LIMIT 1),
      'Usuario'
    ) WHERE "nombre" IS NULL;
    ALTER TABLE "User" ALTER COLUMN "nombre" SET NOT NULL;
  END IF;
END $$;

-- Agregar columna contacto si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'User' 
    AND column_name = 'contacto'
  ) THEN
    ALTER TABLE "User" ADD COLUMN "contacto" TEXT;
    UPDATE "User" SET "contacto" = 'Sin contacto' WHERE "contacto" IS NULL;
    ALTER TABLE "User" ALTER COLUMN "contacto" SET NOT NULL;
  END IF;
END $$;

-- Agregar columna ofrece si no existe (opcional)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'User' 
    AND column_name = 'oferce'
  ) THEN
    ALTER TABLE "User" ADD COLUMN "oferce" TEXT;
  END IF;
END $$;

-- Agregar columna necesita si no existe (opcional)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'User' 
    AND column_name = 'necesita'
  ) THEN
    ALTER TABLE "User" ADD COLUMN "necesita" TEXT;
  END IF;
END $$;

-- Agregar columna precioOferta si no existe (opcional)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'User' 
    AND column_name = 'precioOferta'
  ) THEN
    ALTER TABLE "User" ADD COLUMN "precioOferta" INTEGER DEFAULT 0;
  END IF;
END $$;

-- Agregar columna saldo si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'User' 
    AND column_name = 'saldo'
  ) THEN
    ALTER TABLE "User" ADD COLUMN "saldo" INTEGER DEFAULT 0;
  END IF;
END $$;

-- Agregar columna limite si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'User' 
    AND column_name = 'limite'
  ) THEN
    ALTER TABLE "User" ADD COLUMN "limite" INTEGER DEFAULT 15000;
  END IF;
END $$;

-- Agregar columna rating si no existe (opcional)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'User' 
    AND column_name = 'rating'
  ) THEN
    ALTER TABLE "User" ADD COLUMN "rating" DOUBLE PRECISION;
  END IF;
END $$;

-- Agregar columna totalResenas si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'User' 
    AND column_name = 'totalResenas'
  ) THEN
    ALTER TABLE "User" ADD COLUMN "totalResenas" INTEGER DEFAULT 0;
  END IF;
END $$;

-- Agregar columna miembroDesde si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'User' 
    AND column_name = 'miembroDesde'
  ) THEN
    ALTER TABLE "User" ADD COLUMN "miembroDesde" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;

-- Agregar columna ubicacion si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'User' 
    AND column_name = 'ubicacion'
  ) THEN
    ALTER TABLE "User" ADD COLUMN "ubicacion" TEXT;
    UPDATE "User" SET "ubicacion" = 'CABA' WHERE "ubicacion" IS NULL;
    ALTER TABLE "User" ALTER COLUMN "ubicacion" SET NOT NULL;
  END IF;
END $$;

-- Agregar columna verificado si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'User' 
    AND column_name = 'verificado'
  ) THEN
    ALTER TABLE "User" ADD COLUMN "verificado" BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Agregar columna createdAt si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'User' 
    AND column_name = 'createdAt'
  ) THEN
    ALTER TABLE "User" ADD COLUMN "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;

-- Agregar columna updatedAt si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'User' 
    AND column_name = 'updatedAt'
  ) THEN
    ALTER TABLE "User" ADD COLUMN "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;
