-- AlterTable: KYC Didit (idempotente si ensureSchema ya creó las columnas)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "kycVerificado" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "kycVerificadoAt" TIMESTAMP(3);
