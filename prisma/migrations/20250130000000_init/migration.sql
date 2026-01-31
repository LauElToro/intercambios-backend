-- CreateTable
-- Migración inicial: crea todas las tablas del schema.
-- Si la tabla ya existe (por ejemplo en DB existente), las migraciones posteriores pueden fallar en ALTER;
-- en ese caso usar solo las migraciones de alteración.

CREATE TABLE IF NOT EXISTS "User" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "contacto" TEXT NOT NULL,
    "oferce" TEXT,
    "necesita" TEXT,
    "precioOferta" INTEGER DEFAULT 0,
    "saldo" INTEGER NOT NULL DEFAULT 0,
    "limite" INTEGER NOT NULL DEFAULT 15000,
    "rating" DOUBLE PRECISION,
    "totalResenas" INTEGER NOT NULL DEFAULT 0,
    "miembroDesde" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ubicacion" TEXT NOT NULL,
    "verificado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
CREATE INDEX IF NOT EXISTS "User_email_idx" ON "User"("email");
CREATE INDEX IF NOT EXISTS "User_ubicacion_idx" ON "User"("ubicacion");

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

CREATE TABLE IF NOT EXISTS "MarketItemCaracteristica" (
    "id" SERIAL NOT NULL,
    "marketItemId" INTEGER NOT NULL,
    "texto" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketItemCaracteristica_pkey" PRIMARY KEY ("id")
);

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

CREATE UNIQUE INDEX IF NOT EXISTS "MarketItemDetalle_marketItemId_clave_key" ON "MarketItemDetalle"("marketItemId", "clave");
CREATE INDEX IF NOT EXISTS "MarketItemDetalle_marketItemId_idx" ON "MarketItemDetalle"("marketItemId");
CREATE INDEX IF NOT EXISTS "MarketItemCaracteristica_marketItemId_idx" ON "MarketItemCaracteristica"("marketItemId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'MarketItem_vendedorId_fkey'
  ) THEN
    ALTER TABLE "MarketItem" ADD CONSTRAINT "MarketItem_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'MarketItemDetalle_marketItemId_fkey'
  ) THEN
    ALTER TABLE "MarketItemDetalle" ADD CONSTRAINT "MarketItemDetalle_marketItemId_fkey" FOREIGN KEY ("marketItemId") REFERENCES "MarketItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'MarketItemCaracteristica_marketItemId_fkey'
  ) THEN
    ALTER TABLE "MarketItemCaracteristica" ADD CONSTRAINT "MarketItemCaracteristica_marketItemId_fkey" FOREIGN KEY ("marketItemId") REFERENCES "MarketItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Intercambio_usuarioId_fkey'
  ) THEN
    ALTER TABLE "Intercambio" ADD CONSTRAINT "Intercambio_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Intercambio_otraPersonaId_fkey'
  ) THEN
    ALTER TABLE "Intercambio" ADD CONSTRAINT "Intercambio_otraPersonaId_fkey" FOREIGN KEY ("otraPersonaId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
