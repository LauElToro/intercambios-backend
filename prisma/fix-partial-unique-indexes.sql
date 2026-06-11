-- Índices únicos parciales creados fuera de Prisma: bloquean db push al recrear @unique estándar
DROP INDEX IF EXISTS "MarketItem_slug_key";
DROP INDEX IF EXISTS "User_referralSlug_key";
