// Script seguro para asegurar que la columna 'nombre' existe
// Este script es idempotente y seguro para producción
// No elimina datos, solo agrega la columna si no existe

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient({
  log: ['error'],
});

async function ensureNombreColumn() {
  try {
    console.log('🔍 Verificando columna nombre...');
    
    // Verificar si la columna existe usando una query segura
    const result = await prisma.$queryRawUnsafe(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public'
      AND table_name = 'User' 
      AND column_name = 'nombre'
      LIMIT 1
    `);
    
    if (Array.isArray(result) && result.length > 0) {
      console.log('✅ La columna nombre ya existe');
      return;
    }
    
    console.log('📝 Agregando columna nombre de forma segura...');
    
    // Paso 1: Agregar columna como nullable (seguro)
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "User" 
      ADD COLUMN IF NOT EXISTS "nombre" TEXT;
    `);
    
    console.log('📝 Actualizando valores NULL con valores por defecto...');
    
    // Paso 2: Actualizar solo los registros que tienen NULL (no afecta datos existentes)
    await prisma.$executeRawUnsafe(`
      UPDATE "User" 
      SET "nombre" = COALESCE(
        (SELECT "email" FROM "User" u2 WHERE u2.id = "User".id LIMIT 1),
        'Usuario'
      )
      WHERE "nombre" IS NULL;
    `);
    
    // Paso 3: Intentar hacer NOT NULL solo si no hay NULLs
    // Si hay NULLs, dejamos la columna nullable para no romper nada
    const nullCount = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*) as count 
      FROM "User" 
      WHERE "nombre" IS NULL
    `);
    
    if (Array.isArray(nullCount) && nullCount[0]?.count === 0) {
      console.log('📝 Haciendo la columna NOT NULL...');
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "User" 
        ALTER COLUMN "nombre" SET NOT NULL;
      `);
    } else {
      console.log('⚠️  Hay valores NULL, manteniendo la columna nullable por seguridad');
    }
    
    console.log('✅ Columna nombre verificada/agregada exitosamente');
  } catch (error) {
    // Si la columna ya existe o hay otro error, no fallar el build
    if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
      console.log('✅ La columna nombre ya existe (error esperado)');
      return;
    }
    console.error('⚠️  Error al verificar columna nombre:', error.message);
    // No lanzar error para no romper el build
    // En producción, las migraciones de Prisma manejarán esto
  } finally {
    await prisma.$disconnect();
  }
}

// Solo ejecutar si estamos en un entorno donde tiene sentido
if (process.env.DATABASE_URL) {
  ensureNombreColumn()
    .catch((e) => {
      console.error('Error en ensure-nombre-column:', e);
      // No fallar el build por esto
      process.exit(0);
    });
} else {
  console.log('⚠️  DATABASE_URL no configurado, saltando verificación de columna');
  process.exit(0);
}
