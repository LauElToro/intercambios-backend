/**
 * Sincroniza el schema de la base de datos en tiempo de ejecución.
 * Añade columnas faltantes a User y crea tablas (MarketItem, etc.) si no existen.
 * Idempotente: seguro ejecutar en cada cold start.
 */

import prisma from './prisma.js';

let syncPromise: Promise<void> | null = null;

export function ensureSchema(): Promise<void> {
  if (syncPromise) return syncPromise;
  syncPromise = runSchemaSync();
  return syncPromise;
}

async function runSchemaSync(): Promise<void> {
  try {
    // User: añadir columnas que falten (PostgreSQL ADD COLUMN IF NOT EXISTS)
    const userColumns = [
      ['nombre', 'TEXT'],
      ['contacto', 'TEXT'],
      ['oferce', 'TEXT'],
      ['necesita', 'TEXT'],
      ['precioOferta', 'INTEGER DEFAULT 0'],
      ['saldo', 'INTEGER DEFAULT 0'],
      ['limite', 'INTEGER DEFAULT 15000'],
      ['rating', 'DOUBLE PRECISION'],
      ['totalResenas', 'INTEGER DEFAULT 0'],
      ['miembroDesde', 'TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP'],
      ['ubicacion', 'TEXT'],
      ['verificado', 'BOOLEAN DEFAULT false'],
      ['createdAt', 'TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP'],
      ['updatedAt', 'TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP'],
    ] as const;
    for (const [name, def] of userColumns) {
      try {
        await prisma.$executeRawUnsafe(
          `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "${name}" ${def};`
        );
      } catch {
        // Tabla User puede no existir aún; ignorar
      }
    }

    // Rellenar NULLs en User si hace falta
    try {
      await prisma.$executeRawUnsafe(
        `UPDATE "User" SET "ubicacion" = 'CABA' WHERE "ubicacion" IS NULL;`
      );
    } catch {
      // ignorar
    }

    // MarketItem y tablas relacionadas si no existen
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "MarketItem" (
          "id" SERIAL NOT NULL,
          "titulo" TEXT NOT NULL,
          "descripcion" TEXT NOT NULL,
          "descripcionCompleta" TEXT,
          "precio" INTEGER NOT NULL,
          "rubro" TEXT NOT NULL,
          "ubicacion" TEXT NOT NULL,
          "distancia" DOUBLE PRECISION,
          "imagen" TEXT NOT NULL,
          "vendedorId" INTEGER NOT NULL,
          "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "MarketItem_pkey" PRIMARY KEY ("id")
        );
      `);
      await prisma.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS "MarketItem_vendedorId_idx" ON "MarketItem"("vendedorId");`
      );
      await prisma.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS "MarketItem_rubro_idx" ON "MarketItem"("rubro");`
      );
      await prisma.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS "MarketItem_precio_idx" ON "MarketItem"("precio");`
      );
      await prisma.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS "MarketItem_ubicacion_idx" ON "MarketItem"("ubicacion");`
      );
    } catch {
      // ya existen
    }

    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "MarketItemDetalle" (
          "id" SERIAL NOT NULL,
          "marketItemId" INTEGER NOT NULL,
          "clave" TEXT NOT NULL,
          "valor" TEXT NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "MarketItemDetalle_pkey" PRIMARY KEY ("id")
        );
      `);
      await prisma.$executeRawUnsafe(
        `CREATE UNIQUE INDEX IF NOT EXISTS "MarketItemDetalle_marketItemId_clave_key" ON "MarketItemDetalle"("marketItemId", "clave");`
      );
      await prisma.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS "MarketItemDetalle_marketItemId_idx" ON "MarketItemDetalle"("marketItemId");`
      );
    } catch {
      // ya existen
    }

    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "MarketItemCaracteristica" (
          "id" SERIAL NOT NULL,
          "marketItemId" INTEGER NOT NULL,
          "texto" TEXT NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "MarketItemCaracteristica_pkey" PRIMARY KEY ("id")
        );
      `);
      await prisma.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS "MarketItemCaracteristica_marketItemId_idx" ON "MarketItemCaracteristica"("marketItemId");`
      );
    } catch {
      // ya existen
    }

    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "Intercambio" (
          "id" SERIAL NOT NULL,
          "usuarioId" INTEGER NOT NULL,
          "otraPersonaId" INTEGER NOT NULL,
          "otraPersonaNombre" TEXT NOT NULL,
          "descripcion" TEXT NOT NULL,
          "creditos" INTEGER NOT NULL,
          "fecha" TIMESTAMP(3) NOT NULL,
          "estado" TEXT NOT NULL DEFAULT 'pendiente',
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "Intercambio_pkey" PRIMARY KEY ("id")
        );
      `);
      await prisma.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS "Intercambio_usuarioId_idx" ON "Intercambio"("usuarioId");`
      );
      await prisma.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS "Intercambio_otraPersonaId_idx" ON "Intercambio"("otraPersonaId");`
      );
      await prisma.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS "Intercambio_estado_idx" ON "Intercambio"("estado");`
      );
      await prisma.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS "Intercambio_fecha_idx" ON "Intercambio"("fecha");`
      );
    } catch {
      // ya existen
    }

    // FKs si no existen
    const fks = [
      ['MarketItem', 'MarketItem_vendedorId_fkey', '"vendedorId"', 'User', 'CASCADE'],
      ['MarketItemDetalle', 'MarketItemDetalle_marketItemId_fkey', '"marketItemId"', 'MarketItem', 'CASCADE'],
      ['MarketItemCaracteristica', 'MarketItemCaracteristica_marketItemId_fkey', '"marketItemId"', 'MarketItem', 'CASCADE'],
      ['Intercambio', 'Intercambio_usuarioId_fkey', '"usuarioId"', 'User', 'RESTRICT'],
      ['Intercambio', 'Intercambio_otraPersonaId_fkey', '"otraPersonaId"', 'User', 'RESTRICT'],
    ] as const;
    for (const [table, conname, col, refTable, onDelete] of fks) {
      try {
        await prisma.$executeRawUnsafe(`
          DO $$
          BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '${conname}') THEN
              ALTER TABLE "${table}" ADD CONSTRAINT "${conname}" FOREIGN KEY (${col}) REFERENCES "${refTable}"("id") ON DELETE ${onDelete} ON UPDATE CASCADE;
            END IF;
          END $$;
        `);
      } catch {
        // ignorar
      }
    }
  } catch (err) {
    console.error('[ensureSchema]', err);
    // No relanzar: la app puede seguir y quizá la DB ya está bien
  }
}
