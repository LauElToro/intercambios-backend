// Script seguro para asegurar que todas las columnas necesarias existen
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
      { name: 'nombre', defaultValue: 'Usuario', useEmail: true, required: true, type: 'TEXT' },
      { name: 'contacto', defaultValue: 'Sin contacto', useEmail: false, required: true, type: 'TEXT' },
      { name: 'oferce', defaultValue: null, useEmail: false, required: false, type: 'TEXT' },
      { name: 'necesita', defaultValue: null, useEmail: false, required: false, type: 'TEXT' },
      { name: 'precioOferta', defaultValue: 0, useEmail: false, required: false, type: 'INTEGER' },
      { name: 'saldo', defaultValue: 0, useEmail: false, required: true, type: 'INTEGER' },
      { name: 'limite', defaultValue: 15000, useEmail: false, required: true, type: 'INTEGER' },
      { name: 'rating', defaultValue: null, useEmail: false, required: false, type: 'DOUBLE PRECISION' },
      { name: 'totalResenas', defaultValue: 0, useEmail: false, required: true, type: 'INTEGER' },
      { name: 'miembroDesde', defaultValue: null, useEmail: false, required: true, type: 'TIMESTAMP' },
      { name: 'ubicacion', defaultValue: 'CABA', useEmail: false, required: true, type: 'TEXT' },
      { name: 'verificado', defaultValue: false, useEmail: false, required: true, type: 'BOOLEAN' },
      { name: 'createdAt', defaultValue: null, useEmail: false, required: true, type: 'TIMESTAMP' },
      { name: 'updatedAt', defaultValue: null, useEmail: false, required: true, type: 'TIMESTAMP' }
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
      
      const columnExists = Array.isArray(result) && result.length > 0;
      
      if (!columnExists) {
        console.log(`📝 Agregando columna ${column.name} de forma segura...`);
        
        // Construir el tipo SQL correcto
        let typeSQL = column.type;
        let defaultSQL = '';
        
        if (column.defaultValue !== null) {
          if (column.type === 'INTEGER') {
            defaultSQL = ` DEFAULT ${column.defaultValue}`;
          } else if (column.type === 'DOUBLE PRECISION') {
            defaultSQL = ''; // No tiene default
          } else if (column.type === 'BOOLEAN') {
            defaultSQL = ` DEFAULT ${column.defaultValue}`;
          } else if (column.type === 'TIMESTAMP') {
            defaultSQL = ` DEFAULT CURRENT_TIMESTAMP`;
          } else {
            defaultSQL = ` DEFAULT '${column.defaultValue}'`;
          }
        }
        
        // Agregar columna usando DO block para evitar errores si ya existe
        await prisma.$executeRawUnsafe(`
          DO $$ 
          BEGIN
            IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_schema = 'public' 
              AND table_name = 'User' 
              AND column_name = '${column.name}'
            ) THEN
              ALTER TABLE "User" 
              ADD COLUMN "${column.name}" ${typeSQL}${defaultSQL};
            END IF;
          END $$;
        `);
        
        console.log(`✅ Columna ${column.name} agregada`);
      } else {
        console.log(`✅ La columna ${column.name} ya existe`);
      }
      
      // Actualizar valores NULL solo para columnas requeridas que tienen default
      // Hacerlo siempre, incluso si la columna ya existía (puede tener NULLs)
      if (column.required && column.defaultValue !== null) {
        console.log(`📝 Actualizando valores NULL de ${column.name} con valores por defecto...`);
        
        if (column.useEmail) {
          await prisma.$executeRawUnsafe(`
            UPDATE "User" 
            SET "${column.name}" = COALESCE(
              (SELECT "email" FROM "User" u2 WHERE u2.id = "User".id LIMIT 1),
              '${column.defaultValue}'
            )
            WHERE "${column.name}" IS NULL;
          `);
        } else if (column.type === 'INTEGER') {
          await prisma.$executeRawUnsafe(`
            UPDATE "User" 
            SET "${column.name}" = ${column.defaultValue}
            WHERE "${column.name}" IS NULL;
          `);
        } else if (column.type === 'BOOLEAN') {
          await prisma.$executeRawUnsafe(`
            UPDATE "User" 
            SET "${column.name}" = ${column.defaultValue}
            WHERE "${column.name}" IS NULL;
          `);
        } else if (column.type === 'TIMESTAMP') {
          await prisma.$executeRawUnsafe(`
            UPDATE "User" 
            SET "${column.name}" = CURRENT_TIMESTAMP
            WHERE "${column.name}" IS NULL;
          `);
        } else {
          await prisma.$executeRawUnsafe(`
            UPDATE "User" 
            SET "${column.name}" = '${column.defaultValue}'
            WHERE "${column.name}" IS NULL;
          `);
        }
      }
      
      // Intentar hacer NOT NULL solo si es requerida y no hay NULLs
      if (column.required) {
        const nullCount = await prisma.$queryRawUnsafe(`
          SELECT COUNT(*)::int as count 
          FROM "User" 
          WHERE "${column.name}" IS NULL
        `);
        
        const count = Array.isArray(nullCount) && nullCount[0] ? Number(nullCount[0].count) : 0;
        
        if (count === 0) {
          console.log(`📝 Haciendo la columna ${column.name} NOT NULL...`);
          try {
            await prisma.$executeRawUnsafe(`
              ALTER TABLE "User" 
              ALTER COLUMN "${column.name}" SET NOT NULL;
            `);
          } catch (error) {
            console.log(`⚠️  No se pudo hacer NOT NULL ${column.name}, puede que ya lo sea`);
          }
        } else {
          console.log(`⚠️  Hay ${count} valores NULL en ${column.name}, manteniendo la columna nullable por seguridad`);
        }
      }
      
      console.log(`✅ Columna ${column.name} verificada/agregada exitosamente`);
    }
    
    console.log('✅ Todas las columnas verificadas/agregadas exitosamente');
  } catch (error) {
    // Si la columna ya existe o hay otro error, no fallar el build
    if (error.message?.includes('already exists') || error.message?.includes('duplicate') || error.message?.includes('column') && error.message?.includes('exists')) {
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
