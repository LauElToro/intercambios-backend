-- Perfil editable: fotoPerfil, banner, redesSociales

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "fotoPerfil" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "banner" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "redesSociales" JSONB;
