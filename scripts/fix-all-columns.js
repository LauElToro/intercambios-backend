// Script completo para agregar TODAS las columnas faltantes
// Ejecutar manualmente: npm run db:fix-all-columns
// O se ejecuta automáticamente en deploy si migrate deploy falla
// Si la tabla User no existe, primero ejecuta la migración inicial.

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const prisma = new PrismaClient({
  log: ['error'],
});

/** Comprueba si existe una tabla por nombre (pg_tables). */
async function tableExists(tablename) {
  try {
    const r = await prisma.$queryRawUnsafe(`
      SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = $1 LIMIT 1
    `, tablename);
    return Array.isArray(r) && r.length > 0;
  } catch {
    return false;
  }
}

/** Crea tabla User con todas las columnas si no existe. */
async function createUserTableIfMissing() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "User" (
      "id" SERIAL NOT NULL,
      "nombre" TEXT NOT NULL,
      "email" TEXT NOT NULL,
      "password" TEXT NOT NULL,
      "contacto" TEXT NOT NULL,
      "oferce" TEXT,
      "necesita" TEXT,
      "precioOferta" INTEGER DEFAULT 0,
      "saldo" INTEGER NOT NULL DEFAULT 0,
      "limite" INTEGER NOT NULL DEFAULT 15000,
      "rating" DOUBLE PRECISION,
      "totalResenas" INTEGER NOT NULL DEFAULT 0,
      "miembroDesde" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "ubicacion" TEXT NOT NULL,
      "verificado" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "User_pkey" PRIMARY KEY ("id")
    );
  `);
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "User_email_idx" ON "User"("email");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "User_ubicacion_idx" ON "User"("ubicacion");`);
}

/** Añade columnas faltantes a User (idempotente). */
async function ensureUserColumns() {
  const cols = [
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
  ];
  for (const [name, def] of cols) {
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "${name}" ${def};`);
    } catch (e) {
      if (!e.message?.includes('already exists')) console.error(`  ⚠️ ${name}:`, e.message);
    }
  }
}

/** Crea MarketItem y tablas relacionadas si no existen. */
async function createMarketTablesIfMissing() {
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
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "MarketItem_vendedorId_idx" ON "MarketItem"("vendedorId");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "MarketItem_rubro_idx" ON "MarketItem"("rubro");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "MarketItem_precio_idx" ON "MarketItem"("precio");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "MarketItem_ubicacion_idx" ON "MarketItem"("ubicacion");`);

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
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "MarketItemDetalle_marketItemId_clave_key" ON "MarketItemDetalle"("marketItemId", "clave");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "MarketItemDetalle_marketItemId_idx" ON "MarketItemDetalle"("marketItemId");`);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "MarketItemCaracteristica" (
      "id" SERIAL NOT NULL,
      "marketItemId" INTEGER NOT NULL,
      "texto" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "MarketItemCaracteristica_pkey" PRIMARY KEY ("id")
    );
  `);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "MarketItemCaracteristica_marketItemId_idx" ON "MarketItemCaracteristica"("marketItemId");`);

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
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Intercambio_usuarioId_idx" ON "Intercambio"("usuarioId");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Intercambio_otraPersonaId_idx" ON "Intercambio"("otraPersonaId");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Intercambio_estado_idx" ON "Intercambio"("estado");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Intercambio_fecha_idx" ON "Intercambio"("fecha");`);

  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "MarketItem" ADD CONSTRAINT "MarketItem_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;`);
  } catch (e) {
    if (!e.message?.includes('already exists')) {}
  }
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "MarketItemDetalle" ADD CONSTRAINT "MarketItemDetalle_marketItemId_fkey" FOREIGN KEY ("marketItemId") REFERENCES "MarketItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;`);
  } catch (e) {
    if (!e.message?.includes('already exists')) {}
  }
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "MarketItemCaracteristica" ADD CONSTRAINT "MarketItemCaracteristica_marketItemId_fkey" FOREIGN KEY ("marketItemId") REFERENCES "MarketItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;`);
  } catch (e) {
    if (!e.message?.includes('already exists')) {}
  }
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Intercambio" ADD CONSTRAINT "Intercambio_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;`);
  } catch (e) {
    if (!e.message?.includes('already exists')) {}
  }
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Intercambio" ADD CONSTRAINT "Intercambio_otraPersonaId_fkey" FOREIGN KEY ("otraPersonaId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;`);
  } catch (e) {
    if (!e.message?.includes('already exists')) {}
  }
}

/** Asegura que existan User (con columnas) y MarketItem, etc. */
async function ensureTablesExist() {
  const userExists = await tableExists('User') || await tableExists('user');
  if (!userExists) {
    console.log('📦 Tabla User no existe. Creando...');
    await createUserTableIfMissing();
    console.log('✅ Tabla User creada.');
  } else {
    console.log('✅ Tabla User existe. Sincronizando columnas...');
    await ensureUserColumns();
  }

  const marketExists = await tableExists('MarketItem');
  if (!marketExists) {
    console.log('📦 Tabla MarketItem no existe. Creando tablas de mercado...');
    await createMarketTablesIfMissing();
    console.log('✅ Tablas MarketItem, etc. creadas.');
  } else {
    console.log('✅ Tabla MarketItem existe.');
  }
}

async function fixAllColumns() {
  try {
    console.log('🔧 Iniciando verificación y creación de columnas...');
    await ensureTablesExist();

    const columns = [
      { name: 'nombre', type: 'TEXT', required: true, defaultValue: 'Usuario', useEmail: true },
      { name: 'contacto', type: 'TEXT', required: true, defaultValue: 'Sin contacto', useEmail: false },
      { name: 'oferce', type: 'TEXT', required: false, defaultValue: null, useEmail: false },
      { name: 'necesita', type: 'TEXT', required: false, defaultValue: null, useEmail: false },
      { name: 'precioOferta', type: 'INTEGER', required: false, defaultValue: 0, useEmail: false },
      { name: 'saldo', type: 'INTEGER', required: true, defaultValue: 0, useEmail: false },
      { name: 'limite', type: 'INTEGER', required: true, defaultValue: 15000, useEmail: false },
      { name: 'rating', type: 'DOUBLE PRECISION', required: false, defaultValue: null, useEmail: false },
      { name: 'totalResenas', type: 'INTEGER', required: true, defaultValue: 0, useEmail: false },
      { name: 'miembroDesde', type: 'TIMESTAMP', required: true, defaultValue: null, useEmail: false },
      { name: 'ubicacion', type: 'TEXT', required: true, defaultValue: 'CABA', useEmail: false },
      { name: 'verificado', type: 'BOOLEAN', required: true, defaultValue: false, useEmail: false },
      { name: 'createdAt', type: 'TIMESTAMP', required: true, defaultValue: null, useEmail: false },
      { name: 'updatedAt', type: 'TIMESTAMP', required: true, defaultValue: null, useEmail: false }
    ];

    for (const col of columns) {
      try {
        console.log(`\n🔍 Verificando columna: ${col.name}`);
        
        // Verificar si existe
        const exists = await prisma.$queryRawUnsafe(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_schema = 'public'
          AND table_name = 'User' 
          AND column_name = '${col.name}'
          LIMIT 1
        `);
        
        const columnExists = Array.isArray(exists) && exists.length > 0;
        
        if (columnExists) {
          console.log(`  ✅ Columna ${col.name} ya existe`);
        } else {
          console.log(`  📝 Creando columna ${col.name}...`);
          
          // Construir SQL para agregar columna
          let addColumnSQL = `ALTER TABLE "User" ADD COLUMN "${col.name}" ${col.type}`;
          
          if (col.defaultValue !== null) {
            if (col.type === 'INTEGER') {
              addColumnSQL += ` DEFAULT ${col.defaultValue}`;
            } else if (col.type === 'BOOLEAN') {
              addColumnSQL += ` DEFAULT ${col.defaultValue}`;
            } else if (col.type === 'TIMESTAMP') {
              addColumnSQL += ` DEFAULT CURRENT_TIMESTAMP`;
            } else if (col.type === 'DOUBLE PRECISION') {
              // Sin default
            } else {
              addColumnSQL += ` DEFAULT '${col.defaultValue}'`;
            }
          }
          addColumnSQL += ';';
          
          // Usar DO block para evitar errores si ya existe
          await prisma.$executeRawUnsafe(`
            DO $$ 
            BEGIN
              IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'User' 
                AND column_name = '${col.name}'
              ) THEN
                ${addColumnSQL}
              END IF;
            END $$;
          `);
          
          console.log(`  ✅ Columna ${col.name} creada`);
        }
        
        // Actualizar valores NULL para columnas requeridas
        if (col.required && col.defaultValue !== null) {
          console.log(`  📝 Actualizando valores NULL en ${col.name}...`);
          
          if (col.useEmail) {
            await prisma.$executeRawUnsafe(`
              UPDATE "User" 
              SET "${col.name}" = COALESCE(
                (SELECT "email" FROM "User" u2 WHERE u2.id = "User".id LIMIT 1),
                '${col.defaultValue}'
              )
              WHERE "${col.name}" IS NULL;
            `);
          } else if (col.type === 'INTEGER') {
            await prisma.$executeRawUnsafe(`
              UPDATE "User" 
              SET "${col.name}" = ${col.defaultValue}
              WHERE "${col.name}" IS NULL;
            `);
          } else if (col.type === 'BOOLEAN') {
            await prisma.$executeRawUnsafe(`
              UPDATE "User" 
              SET "${col.name}" = ${col.defaultValue}
              WHERE "${col.name}" IS NULL;
            `);
          } else if (col.type === 'TIMESTAMP') {
            await prisma.$executeRawUnsafe(`
              UPDATE "User" 
              SET "${col.name}" = CURRENT_TIMESTAMP
              WHERE "${col.name}" IS NULL;
            `);
          } else {
            await prisma.$executeRawUnsafe(`
              UPDATE "User" 
              SET "${col.name}" = '${col.defaultValue}'
              WHERE "${col.name}" IS NULL;
            `);
          }
        }
        
        // Hacer NOT NULL si es requerida
        if (col.required) {
          const nullCount = await prisma.$queryRawUnsafe(`
            SELECT COUNT(*)::int as count 
            FROM "User" 
            WHERE "${col.name}" IS NULL
          `);
          
          const count = Array.isArray(nullCount) && nullCount[0] ? Number(nullCount[0].count) : 0;
          
          if (count === 0) {
            console.log(`  📝 Haciendo ${col.name} NOT NULL...`);
            try {
              await prisma.$executeRawUnsafe(`
                ALTER TABLE "User" 
                ALTER COLUMN "${col.name}" SET NOT NULL;
              `);
              console.log(`  ✅ ${col.name} es ahora NOT NULL`);
            } catch (error) {
              console.log(`  ⚠️  ${col.name} ya es NOT NULL o hay un problema`);
            }
          } else {
            console.log(`  ⚠️  Hay ${count} valores NULL en ${col.name}, manteniendo nullable`);
          }
        }
        
      } catch (error) {
        console.error(`  ❌ Error con columna ${col.name}:`, error.message);
        // Continuar con la siguiente columna
      }
    }
    
    console.log('\n✅ Verificación de columnas completada');
    
  } catch (error) {
    console.error('❌ Error general:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar
if (process.env.DATABASE_URL) {
  fixAllColumns()
    .then(() => {
      console.log('✅ Script completado exitosamente');
      process.exit(0);
    })
    .catch((e) => {
      console.error('❌ Error en el script:', e);
      process.exit(1);
    });
} else {
  console.error('❌ DATABASE_URL no configurado');
  process.exit(1);
}
