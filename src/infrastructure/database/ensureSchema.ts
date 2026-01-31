/**
 * Sincroniza el schema de la base de datos en tiempo de ejecución.
 * Añade columnas faltantes a User y crea tablas (MarketItem, etc.) si no existen.
 * Idempotente: seguro ejecutar en cada cold start.
 */

import prisma from './prisma.js';

let syncPromise: Promise<void> | null = null;

export function ensureSchema(): Promise<void> {
  if (syncPromise) return syncPromise;
  const p = runSchemaSync();
  p.catch(() => {
    syncPromise = null;
  });
  syncPromise = p;
  return syncPromise;
}

async function runSchemaSync(): Promise<void> {
  try {
    // User: añadir columnas usando el nombre real de la tabla (User o user)
    let userSyncOk = false;
    try {
      await prisma.$executeRawUnsafe(`
      DO $$
      DECLARE
        tname text;
      BEGIN
        SELECT tablename INTO tname FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('User', 'user') LIMIT 1;
        IF tname IS NOT NULL THEN
          EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS %I TEXT', tname, 'nombre');
          EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS %I TEXT', tname, 'contacto');
          EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS %I INTEGER DEFAULT 0', tname, 'saldo');
          EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS %I INTEGER DEFAULT 15000', tname, 'limite');
          EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS %I DOUBLE PRECISION', tname, 'rating');
          EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS %I INTEGER DEFAULT 0', tname, 'totalResenas');
          EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS %I TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP', tname, 'miembroDesde');
          EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS %I TEXT', tname, 'ubicacion');
          EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS %I BOOLEAN DEFAULT false', tname, 'verificado');
          EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS %I TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP', tname, 'createdAt');
          EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS %I TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP', tname, 'updatedAt');
        END IF;
      END $$;
    `);
      userSyncOk = true;
    } catch (e) {
      console.error('[ensureSchema] DO block User columns failed:', (e as Error)?.message);
      // Fallback: ALTER directo por si el DO falla (permisos, etc.)
      for (const [name, def] of [
        ['nombre', 'TEXT'],
        ['contacto', 'TEXT'],
        ['saldo', 'INTEGER DEFAULT 0'],
      ] as const) {
        try {
          await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "${name}" ${def};`);
          userSyncOk = true;
        } catch {
          try {
            await prisma.$executeRawUnsafe(`ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "${name}" ${def};`);
            userSyncOk = true;
          } catch (e2) {
            console.error('[ensureSchema] ADD COLUMN', name, (e2 as Error)?.message);
          }
        }
      }
    }

    // Rellenar NULLs en User (probar ambos nombres de tabla)
    try {
      await prisma.$executeRawUnsafe(`UPDATE "User" SET "ubicacion" = 'CABA' WHERE "ubicacion" IS NULL;`);
    } catch {
      try {
        await prisma.$executeRawUnsafe(`UPDATE "user" SET "ubicacion" = 'CABA' WHERE "ubicacion" IS NULL;`);
      } catch {
        // ignorar
      }
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

    // Category (marketplace)
    try {
      await prisma.$executeRawUnsafe(`
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
      `);
      await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Category_slug_key" ON "Category"("slug");`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Category_parentId_idx" ON "Category"("parentId");`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Category_rubro_idx" ON "Category"("rubro");`);
      try {
        await prisma.$executeRawUnsafe(`
          ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey"
          FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        `);
      } catch (_e) {
        // ya existe
      }
    } catch {
      // ya existe
    }

    // ProductImage (marketplace)
    try {
      await prisma.$executeRawUnsafe(`
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
      `);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ProductImage_marketItemId_idx" ON "ProductImage"("marketItemId");`);
      try {
        await prisma.$executeRawUnsafe(`
          ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_marketItemId_fkey"
          FOREIGN KEY ("marketItemId") REFERENCES "MarketItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        `);
      } catch (_e) {
        // ya existe
      }
    } catch {
      // ya existe
    }

    // MarketItem: columnas nuevas para feeds/metadata (ADD COLUMN IF NOT EXISTS)
    const marketItemCols = [
      ['slug', 'TEXT'],
      ['status', 'TEXT DEFAULT \'active\''],
      ['condition', 'TEXT'],
      ['availability', 'TEXT DEFAULT \'in_stock\''],
      ['brand', 'TEXT'],
      ['gtin', 'TEXT'],
      ['mpn', 'TEXT'],
      ['metaTitle', 'TEXT'],
      ['metaDescription', 'TEXT'],
      ['ogImage', 'TEXT'],
      ['schemaOrg', 'JSONB'],
      ['customLabel0', 'TEXT'],
      ['customLabel1', 'TEXT'],
      ['customLabel2', 'TEXT'],
      ['customLabel3', 'TEXT'],
      ['customLabel4', 'TEXT'],
      ['categoryId', 'INTEGER'],
    ] as const;
    for (const [name, def] of marketItemCols) {
      try {
        await prisma.$executeRawUnsafe(`ALTER TABLE "MarketItem" ADD COLUMN IF NOT EXISTS "${name}" ${def};`);
      } catch {
        // ignorar
      }
    }

    // User: bio
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "bio" TEXT;`);
    } catch {
      // ignorar
    }

    // UserPerfilMercado (ofrece, necesita, precioOferta por usuario)
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "UserPerfilMercado" (
          "id" SERIAL NOT NULL,
          "userId" INTEGER NOT NULL,
          "ofrece" TEXT,
          "necesita" TEXT,
          "precioOferta" INTEGER,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "UserPerfilMercado_pkey" PRIMARY KEY ("id")
        );
      `);
      await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "UserPerfilMercado_userId_key" ON "UserPerfilMercado"("userId");`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "UserPerfilMercado_userId_idx" ON "UserPerfilMercado"("userId");`);
      try {
        await prisma.$executeRawUnsafe(`
          ALTER TABLE "UserPerfilMercado" ADD CONSTRAINT "UserPerfilMercado_userId_fkey"
          FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        `);
      } catch (_e) {
        // ya existe
      }
    } catch {
      // ya existe
    }

    // Intercambio: externalId
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Intercambio" ADD COLUMN IF NOT EXISTS "externalId" TEXT;`);
    } catch {
      // ignorar
    }

    // FKs si no existen
    const fks = [
      ['MarketItem', 'MarketItem_vendedorId_fkey', '"vendedorId"', 'User', 'CASCADE'],
      ['MarketItem', 'MarketItem_categoryId_fkey', '"categoryId"', 'Category', 'SET NULL'],
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
