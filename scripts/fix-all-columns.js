// Script completo para agregar TODAS las columnas faltantes
// Ejecutar manualmente: npm run db:fix-all-columns
// O se ejecuta automáticamente en deploy si migrate deploy falla
// Si la tabla User no existe, primero ejecuta la migración inicial.

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const prisma = new PrismaClient({
  log: ['error'],
});

/** Comprueba si la tabla User existe (pg_tables usa el nombre real, puede ser "User" o "user"). */
async function userTableExists() {
  try {
    const r = await prisma.$queryRawUnsafe(`
      SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'User' LIMIT 1
    `);
    if (Array.isArray(r) && r.length > 0) return true;
    const r2 = await prisma.$queryRawUnsafe(`
      SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user' LIMIT 1
    `);
    return Array.isArray(r2) && r2.length > 0;
  } catch {
    return false;
  }
}

/** Ejecuta la migración inicial para crear todas las tablas si no existen. */
async function ensureTablesExist() {
  if (await userTableExists()) {
    console.log('✅ Tabla User ya existe, continuando con columnas...');
    return;
  }
  console.log('📦 Tabla User no existe. Ejecutando migración inicial...');
  const migrationPath = path.join(__dirname, '..', 'prisma', 'migrations', '20250130000000_init', 'migration.sql');
  const createUserTable = async () => {
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
    console.log('✅ Tabla User creada.');
  };

  try {
    const sql = readFileSync(migrationPath, 'utf-8');
    await prisma.$executeRawUnsafe(sql);
    console.log('✅ Migración inicial aplicada.');
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.log('⚠️  Archivo de migración inicial no encontrado. Creando solo tabla User...');
      await createUserTable();
    } else {
      console.log('⚠️  Migración inicial falló, creando solo tabla User:', err.message);
      await createUserTable();
    }
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
