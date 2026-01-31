// Script completo para agregar TODAS las columnas faltantes
// Ejecutar manualmente: npm run db:fix-all-columns
// O se ejecuta automáticamente en deploy si migrate deploy falla

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient({
  log: ['error'],
});

async function fixAllColumns() {
  try {
    console.log('🔧 Iniciando verificación y creación de columnas...');
    
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
