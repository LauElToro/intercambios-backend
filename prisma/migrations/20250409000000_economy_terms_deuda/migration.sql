-- Campos de auditoría y seguimiento de deuda (diseño económico Intercambius)
ALTER TABLE "User" ADD COLUMN "terminosAceptadosAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "deudaEnLimiteDesde" TIMESTAMP(3);
