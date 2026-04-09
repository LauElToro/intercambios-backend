-- AlterTable: agregar nombre y contacto a User. Idempotente y segura si la tabla no existe aún.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'User') THEN
    ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "nombre" TEXT;
    UPDATE "User" SET "nombre" = COALESCE((SELECT "email" FROM "User" u2 WHERE u2.id = "User".id LIMIT 1), 'Usuario') WHERE "nombre" IS NULL;
    IF NOT EXISTS (SELECT 1 FROM "User" WHERE "nombre" IS NULL LIMIT 1) THEN
      ALTER TABLE "User" ALTER COLUMN "nombre" SET NOT NULL;
    END IF;

    ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "contacto" TEXT;
    UPDATE "User" SET "contacto" = 'Sin contacto' WHERE "contacto" IS NULL;
    IF NOT EXISTS (SELECT 1 FROM "User" WHERE "contacto" IS NULL LIMIT 1) THEN
      ALTER TABLE "User" ALTER COLUMN "contacto" SET NOT NULL;
    END IF;
  END IF;
END $$;
