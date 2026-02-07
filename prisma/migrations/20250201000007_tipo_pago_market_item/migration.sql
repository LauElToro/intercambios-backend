-- Tipo de pago aceptado: ix (default), convenir, pesos, ix_pesos
ALTER TABLE "MarketItem" ADD COLUMN IF NOT EXISTS "tipoPago" TEXT DEFAULT 'ix';
