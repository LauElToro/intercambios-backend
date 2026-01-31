-- Mover ofrece, necesita, precioOferta de User a tabla UserPerfilMercado

CREATE TABLE IF NOT EXISTS "UserPerfilMercado" (
  "id" SERIAL NOT NULL,
  "userId" INTEGER NOT NULL,
  "ofrece" TEXT,
  "necesita" TEXT,
  "precioOferta" INTEGER,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserPerfilMercado_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserPerfilMercado_userId_key" ON "UserPerfilMercado"("userId");
CREATE INDEX IF NOT EXISTS "UserPerfilMercado_userId_idx" ON "UserPerfilMercado"("userId");

-- Migrar datos existentes (si User tiene esas columnas)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'User' AND column_name = 'ofrece'
  ) THEN
    INSERT INTO "UserPerfilMercado" ("userId", "ofrece", "necesita", "precioOferta", "updatedAt")
    SELECT "id", "ofrece", "necesita", "precioOferta", NOW()
    FROM "User"
    ON CONFLICT ("userId") DO NOTHING;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UserPerfilMercado_userId_fkey') THEN
    ALTER TABLE "UserPerfilMercado" ADD CONSTRAINT "UserPerfilMercado_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Eliminar columnas de User (solo si existen)
ALTER TABLE "User" DROP COLUMN IF EXISTS "ofrece";
ALTER TABLE "User" DROP COLUMN IF EXISTS "necesita";
ALTER TABLE "User" DROP COLUMN IF EXISTS "precioOferta";
