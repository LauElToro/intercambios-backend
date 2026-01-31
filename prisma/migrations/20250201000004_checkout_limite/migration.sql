-- limite 150000 (saldo negativo), marketItemId en Intercambio

UPDATE "User" SET "limite" = 150000 WHERE "limite" = 15000;

ALTER TABLE "Intercambio" ADD COLUMN IF NOT EXISTS "marketItemId" INTEGER;

CREATE INDEX IF NOT EXISTS "Intercambio_marketItemId_idx" ON "Intercambio"("marketItemId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Intercambio_marketItemId_fkey') THEN
    ALTER TABLE "Intercambio" ADD CONSTRAINT "Intercambio_marketItemId_fkey" 
    FOREIGN KEY ("marketItemId") REFERENCES "MarketItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
