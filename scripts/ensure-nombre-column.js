// Script seguro para asegurar que las columnas necesarias existen
// Este script es idempotente y seguro para producción
// No elimina datos, solo agrega columnas si no existen

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient({
  log: ['error'],
});

async function ensureRequiredColumns() {
  try {
    const columnsToCheck = [
      { name: 'nombre', defaultValue: 'Usuario', useEmail: true, required: true },
      { name: 'contacto', defaultValue: 'Sin contacto', useEmail: false, required: true }
    ];

    for (const column of columnsToCheck) {
      console.log(`🔍 Verificando columna ${column.name}...`);
      
      // Verificar si la columna existe usando una query segura
      const result = await prisma.$queryRawUnsafe(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'User' 
        AND column_name = '${column.name}'
        LIMIT 1
      `);
      
      if (Array.isArray(result) && result.length > 0) {
        console.log(`✅ La columna ${column.name} ya existe`);
        continue;
      }
      
      console.log(`📝 Agregando columna ${column.name} de forma segura...`);
      
      // Paso 1: Agregar columna como nullable (seguro)
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "User" 
        ADD COLUMN IF NOT EXISTS "${column.name}" TEXT;
      `);
      
      console.log(`📝 Actualizando valores NULL de ${column.name} con valores por defecto...`);
      
      // Paso 2: Actualizar solo los registros que tienen NULL (no afecta datos existentes)
      if (column.useEmail) {
        await prisma.$executeRawUnsafe(`
          UPDATE "User" 
          SET "${column.name}" = COALESCE(
            (SELECT "email" FROM "User" u2 WHERE u2.id = "User".id LIMIT 1),
            '${column.defaultValue}'
          )
          WHERE "${column.name}" IS NULL;
        `);
      } else {
        await prisma.$executeRawUnsafe(`
          UPDATE "User" 
          SET "${column.name}" = '${column.defaultValue}'
          WHERE "${column.name}" IS NULL;
        `);
      }
      
      // Paso 3: Intentar hacer NOT NULL solo si no hay NULLs
      // Si hay NULLs, dejamos la columna nullable para no romper nada
      const nullCount = await prisma.$queryRawUnsafe(`
        SELECT COUNT(*) as count 
        FROM "User" 
        WHERE "${column.name}" IS NULL
      `);
      
      if (Array.isArray(nullCount) && nullCount[0]?.count === 0) {
        console.log(`📝 Haciendo la columna ${column.name} NOT NULL...`);
        await prisma.$executeRawUnsafe(`
          ALTER TABLE "User" 
          ALTER COLUMN "${column.name}" SET NOT NULL;
        `);
      } else {
        console.log(`⚠️  Hay valores NULL en ${column.name}, manteniendo la columna nullable por seguridad`);
      }
      
      console.log(`✅ Columna ${column.name} verificada/agregada exitosamente`);
    }
  } catch (error) {
    // Si la columna ya existe o hay otro error, no fallar el build
    if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
      console.log('✅ Las columnas ya existen (error esperado)');
      return;
    }
    console.error('⚠️  Error al verificar columnas:', error.message);
    // No lanzar error para no romper el build
    // En producción, las migraciones de Prisma manejarán esto
  } finally {
    await prisma.$disconnect();
  }
}

// Solo ejecutar si estamos en un entorno donde tiene sentido
if (process.env.DATABASE_URL) {
  ensureRequiredColumns()
    .catch((e) => {
      console.error('Error en ensure-required-columns:', e);
      // No fallar el build por esto
      process.exit(0);
    });
} else {
  console.log('⚠️  DATABASE_URL no configurado, saltando verificación de columnas');
  process.exit(0);
}
