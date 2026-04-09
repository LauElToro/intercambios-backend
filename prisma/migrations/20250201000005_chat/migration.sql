-- Tablas de chat: Conversacion y Mensaje

CREATE TABLE IF NOT EXISTS "Conversacion" (
  "id" SERIAL PRIMARY KEY,
  "compradorId" INTEGER NOT NULL,
  "vendedorId" INTEGER NOT NULL,
  "marketItemId" INTEGER,
  "intercambioId" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS "Mensaje" (
  "id" SERIAL PRIMARY KEY,
  "conversacionId" INTEGER NOT NULL,
  "senderId" INTEGER NOT NULL,
  "contenido" TEXT NOT NULL,
  "leido" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "Conversacion_compradorId_vendedorId_key" ON "Conversacion"("compradorId", "vendedorId");
CREATE INDEX IF NOT EXISTS "Conversacion_compradorId_idx" ON "Conversacion"("compradorId");
CREATE INDEX IF NOT EXISTS "Conversacion_vendedorId_idx" ON "Conversacion"("vendedorId");
CREATE INDEX IF NOT EXISTS "Mensaje_conversacionId_idx" ON "Mensaje"("conversacionId");
CREATE INDEX IF NOT EXISTS "Mensaje_senderId_idx" ON "Mensaje"("senderId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Conversacion_compradorId_fkey') THEN
    ALTER TABLE "Conversacion" ADD CONSTRAINT "Conversacion_compradorId_fkey" 
    FOREIGN KEY ("compradorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Conversacion_vendedorId_fkey') THEN
    ALTER TABLE "Conversacion" ADD CONSTRAINT "Conversacion_vendedorId_fkey" 
    FOREIGN KEY ("vendedorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Conversacion_marketItemId_fkey') THEN
    ALTER TABLE "Conversacion" ADD CONSTRAINT "Conversacion_marketItemId_fkey" 
    FOREIGN KEY ("marketItemId") REFERENCES "MarketItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Mensaje_conversacionId_fkey') THEN
    ALTER TABLE "Mensaje" ADD CONSTRAINT "Mensaje_conversacionId_fkey" 
    FOREIGN KEY ("conversacionId") REFERENCES "Conversacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Mensaje_senderId_fkey') THEN
    ALTER TABLE "Mensaje" ADD CONSTRAINT "Mensaje_senderId_fkey" 
    FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
