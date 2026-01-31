-- ProductImage: mediaType para soportar video
ALTER TABLE "ProductImage" ADD COLUMN IF NOT EXISTS "mediaType" TEXT DEFAULT 'image';

-- Favorito: tabla para favoritos por usuario
CREATE TABLE IF NOT EXISTS "Favorito" (
  "id" SERIAL NOT NULL,
  "userId" INTEGER NOT NULL,
  "marketItemId" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Favorito_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Favorito_userId_marketItemId_key" ON "Favorito"("userId", "marketItemId");
CREATE INDEX IF NOT EXISTS "Favorito_userId_idx" ON "Favorito"("userId");
CREATE INDEX IF NOT EXISTS "Favorito_marketItemId_idx" ON "Favorito"("marketItemId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Favorito_userId_fkey') THEN
    ALTER TABLE "Favorito" ADD CONSTRAINT "Favorito_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Favorito_marketItemId_fkey') THEN
    ALTER TABLE "Favorito" ADD CONSTRAINT "Favorito_marketItemId_fkey" FOREIGN KEY ("marketItemId") REFERENCES "MarketItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
