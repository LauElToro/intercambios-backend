-- AlterTable
ALTER TABLE "Intercambio" ADD COLUMN "conversacionId" INTEGER;

-- AlterTable
ALTER TABLE "Conversacion" ADD COLUMN "registroIntercambioCompletadoAt" TIMESTAMP(3);
