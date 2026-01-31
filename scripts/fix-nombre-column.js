// Script para agregar la columna 'nombre' a la tabla User
// Uso: node scripts/fix-nombre-column.js

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔧 Verificando y agregando columna nombre...');
    
    // Verificar si la columna existe
    const result = await prisma.$queryRawUnsafe(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'User' 
      AND column_name = 'nombre'
    `);
    
    if (Array.isArray(result) && result.length > 0) {
      console.log('✅ La columna nombre ya existe');
      return;
    }
    
    console.log('📝 Agregando columna nombre...');
    
    // Agregar columna como nullable primero
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "User" ADD COLUMN "nombre" TEXT;
    `);
    
    console.log('📝 Estableciendo valores por defecto para usuarios existentes...');
    
    // Actualizar usuarios existentes
    await prisma.$executeRawUnsafe(`
      UPDATE "User" SET "nombre" = 'Usuario' WHERE "nombre" IS NULL;
    `);
    
    console.log('📝 Haciendo la columna NOT NULL...');
    
    // Hacer la columna NOT NULL
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "User" ALTER COLUMN "nombre" SET NOT NULL;
    `);
    
    console.log('✅ Columna nombre agregada exitosamente');
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
