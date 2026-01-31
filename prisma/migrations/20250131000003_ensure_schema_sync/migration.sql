-- Asegura que User tenga todas las columnas y que existan MarketItem, etc.
-- Idempotente: seguro ejecutar varias veces.

-- User: agregar columnas que falten (ADD COLUMN IF NOT EXISTS en PostgreSQL 9.5+)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "nombre" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "contacto" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "oferce" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "necesita" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "precioOferta" INTEGER DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "saldo" INTEGER DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "limite" INTEGER DEFAULT 15000;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "rating" DOUBLE PRECISION;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "totalResenas" INTEGER DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "miembroDesde" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "ubicacion" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "verificado" BOOLEAN DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;

-- Rellenar ubicacion si es NULL (para filas existentes)
UPDATE "User" SET "ubicacion" = 'CABA' WHERE "ubicacion" IS NULL;
UPDATE "User" SET "saldo" = 0 WHERE "saldo" IS NULL;
UPDATE "User" SET "limite" = 15000 WHERE "limite" IS NULL;
UPDATE "User" SET "totalResenas" = 0 WHERE "totalResenas" IS NULL;
UPDATE "User" SET "verificado" = false WHERE "verificado" IS NULL;

-- MarketItem y resto de tablas si no existen
CREATE TABLE IF NOT EXISTS "MarketItem" (
    "id" SERIAL NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "descripcionCompleta" TEXT,
    "precio" INTEGER NOT NULL,
    "rubro" TEXT NOT NULL,
    "ubicacion" TEXT NOT NULL,
    "distancia" DOUBLE PRECISION,
    "imagen" TEXT NOT NULL,
    "vendedorId" INTEGER NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MarketItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "MarketItem_vendedorId_idx" ON "MarketItem"("vendedorId");
CREATE INDEX IF NOT EXISTS "MarketItem_rubro_idx" ON "MarketItem"("rubro");
CREATE INDEX IF NOT EXISTS "MarketItem_precio_idx" ON "MarketItem"("precio");
CREATE INDEX IF NOT EXISTS "MarketItem_ubicacion_idx" ON "MarketItem"("ubicacion");

CREATE TABLE IF NOT EXISTS "MarketItemDetalle" (
    "id" SERIAL NOT NULL,
    "marketItemId" INTEGER NOT NULL,
    "clave" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MarketItemDetalle_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MarketItemDetalle_marketItemId_clave_key" ON "MarketItemDetalle"("marketItemId", "clave");
CREATE INDEX IF NOT EXISTS "MarketItemDetalle_marketItemId_idx" ON "MarketItemDetalle"("marketItemId");

CREATE TABLE IF NOT EXISTS "MarketItemCaracteristica" (
    "id" SERIAL NOT NULL,
    "marketItemId" INTEGER NOT NULL,
    "texto" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MarketItemCaracteristica_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "MarketItemCaracteristica_marketItemId_idx" ON "MarketItemCaracteristica"("marketItemId");

CREATE TABLE IF NOT EXISTS "Intercambio" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "otraPersonaId" INTEGER NOT NULL,
    "otraPersonaNombre" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "creditos" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Intercambio_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Intercambio_usuarioId_idx" ON "Intercambio"("usuarioId");
CREATE INDEX IF NOT EXISTS "Intercambio_otraPersonaId_idx" ON "Intercambio"("otraPersonaId");
CREATE INDEX IF NOT EXISTS "Intercambio_estado_idx" ON "Intercambio"("estado");
CREATE INDEX IF NOT EXISTS "Intercambio_fecha_idx" ON "Intercambio"("fecha");

-- FKs solo si no existen
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MarketItem_vendedorId_fkey') THEN
    ALTER TABLE "MarketItem" ADD CONSTRAINT "MarketItem_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MarketItemDetalle_marketItemId_fkey') THEN
    ALTER TABLE "MarketItemDetalle" ADD CONSTRAINT "MarketItemDetalle_marketItemId_fkey" FOREIGN KEY ("marketItemId") REFERENCES "MarketItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MarketItemCaracteristica_marketItemId_fkey') THEN
    ALTER TABLE "MarketItemCaracteristica" ADD CONSTRAINT "MarketItemCaracteristica_marketItemId_fkey" FOREIGN KEY ("marketItemId") REFERENCES "MarketItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Intercambio_usuarioId_fkey') THEN
    ALTER TABLE "Intercambio" ADD CONSTRAINT "Intercambio_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Intercambio_otraPersonaId_fkey') THEN
    ALTER TABLE "Intercambio" ADD CONSTRAINT "Intercambio_otraPersonaId_fkey" FOREIGN KEY ("otraPersonaId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
