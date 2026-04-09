-- AlterTable: stock en publicaciones (null = servicio / sin stock)
ALTER TABLE "MarketItem" ADD COLUMN IF NOT EXISTS "stock" INTEGER;

-- Datos existentes
UPDATE "MarketItem" SET "stock" = NULL WHERE "rubro" = 'servicios';
UPDATE "MarketItem" SET "stock" = 0 WHERE "rubro" <> 'servicios' AND "status" IN ('sold', 'paused') AND "stock" IS NULL;
UPDATE "MarketItem" SET "stock" = 1 WHERE "rubro" <> 'servicios' AND "status" = 'active' AND "stock" IS NULL;

-- Nuevo default de límite de crédito (usuarios nuevos vía Prisma)
ALTER TABLE "User" ALTER COLUMN "limite" SET DEFAULT 50000;

-- Alinear usuarios que aún tenían el límite anterior al nuevo tope
UPDATE "User" SET "limite" = 50000 WHERE "limite" IN (100000, 150000);
