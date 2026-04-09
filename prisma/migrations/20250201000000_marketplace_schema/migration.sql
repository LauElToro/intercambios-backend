-- Refactor marketplace: Category, Product metadata, ProductImage, Intercambio.externalId
-- Todas las columnas nuevas son opcionales o con default para no romper datos existentes.

-- User: bio para metadata
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "bio" TEXT;

-- Category (nueva tabla)
CREATE TABLE IF NOT EXISTS "Category" (
  "id" SERIAL NOT NULL,
  "parentId" INTEGER,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "rubro" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "metaTitle" TEXT,
  "metaDescription" TEXT,
  "googleProductCategoryId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Category_slug_key" ON "Category"("slug");
CREATE INDEX IF NOT EXISTS "Category_parentId_idx" ON "Category"("parentId");
CREATE INDEX IF NOT EXISTS "Category_rubro_idx" ON "Category"("rubro");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Category_parentId_fkey') THEN
    ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- MarketItem: campos para feeds y metadata
ALTER TABLE "MarketItem" ADD COLUMN IF NOT EXISTS "slug" TEXT;
ALTER TABLE "MarketItem" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'active';
ALTER TABLE "MarketItem" ADD COLUMN IF NOT EXISTS "condition" TEXT;
ALTER TABLE "MarketItem" ADD COLUMN IF NOT EXISTS "availability" TEXT DEFAULT 'in_stock';
ALTER TABLE "MarketItem" ADD COLUMN IF NOT EXISTS "brand" TEXT;
ALTER TABLE "MarketItem" ADD COLUMN IF NOT EXISTS "gtin" TEXT;
ALTER TABLE "MarketItem" ADD COLUMN IF NOT EXISTS "mpn" TEXT;
ALTER TABLE "MarketItem" ADD COLUMN IF NOT EXISTS "metaTitle" TEXT;
ALTER TABLE "MarketItem" ADD COLUMN IF NOT EXISTS "metaDescription" TEXT;
ALTER TABLE "MarketItem" ADD COLUMN IF NOT EXISTS "ogImage" TEXT;
ALTER TABLE "MarketItem" ADD COLUMN IF NOT EXISTS "schemaOrg" JSONB;
ALTER TABLE "MarketItem" ADD COLUMN IF NOT EXISTS "customLabel0" TEXT;
ALTER TABLE "MarketItem" ADD COLUMN IF NOT EXISTS "customLabel1" TEXT;
ALTER TABLE "MarketItem" ADD COLUMN IF NOT EXISTS "customLabel2" TEXT;
ALTER TABLE "MarketItem" ADD COLUMN IF NOT EXISTS "customLabel3" TEXT;
ALTER TABLE "MarketItem" ADD COLUMN IF NOT EXISTS "customLabel4" TEXT;
ALTER TABLE "MarketItem" ADD COLUMN IF NOT EXISTS "categoryId" INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS "MarketItem_slug_key" ON "MarketItem"("slug") WHERE "slug" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "MarketItem_status_idx" ON "MarketItem"("status");
CREATE INDEX IF NOT EXISTS "MarketItem_categoryId_idx" ON "MarketItem"("categoryId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MarketItem_categoryId_fkey') THEN
    ALTER TABLE "MarketItem" ADD CONSTRAINT "MarketItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- ProductImage (nueva tabla)
CREATE TABLE IF NOT EXISTS "ProductImage" (
  "id" SERIAL NOT NULL,
  "marketItemId" INTEGER NOT NULL,
  "url" TEXT NOT NULL,
  "alt" TEXT,
  "position" INTEGER NOT NULL DEFAULT 0,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ProductImage_marketItemId_idx" ON "ProductImage"("marketItemId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProductImage_marketItemId_fkey') THEN
    ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_marketItemId_fkey" FOREIGN KEY ("marketItemId") REFERENCES "MarketItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Intercambio: externalId para exportación
ALTER TABLE "Intercambio" ADD COLUMN IF NOT EXISTS "externalId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Intercambio_externalId_key" ON "Intercambio"("externalId") WHERE "externalId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "Intercambio_externalId_idx" ON "Intercambio"("externalId");
