#!/usr/bin/env node
/**
 * Build script para Vercel.
 * - Genera Prisma Client
 * - Ejecuta migraciones (saltea si SKIP_DB_MIGRATE=1 o DATABASE_URL no está configurado)
 */

const { execSync } = require('child_process');
const path = require('path');

const schemaPath = path.join(__dirname, '../prisma/schema.prisma');
const skipMigrate = process.env.SKIP_DB_MIGRATE === '1';
const hasDatabaseUrl = !!process.env.DATABASE_URL;

function run(cmd, optional = false) {
  try {
    execSync(cmd, { stdio: 'inherit', cwd: path.join(__dirname, '..') });
    return true;
  } catch (err) {
    if (optional) return false;
    throw err;
  }
}

console.log('Running prisma generate...');
run(`npx prisma generate --schema=${schemaPath}`);

if (skipMigrate) {
  console.log('SKIP_DB_MIGRATE=1: skipping prisma migrate deploy');
  process.exit(0);
}

if (!hasDatabaseUrl) {
  console.warn('');
  console.warn('⚠️  DATABASE_URL no está configurado en Vercel.');
  console.warn('   Configurá DATABASE_URL en Project Settings → Environment Variables.');
  console.warn('   La compilación continúa; ejecutá "prisma migrate deploy" manualmente si hace falta.');
  console.warn('');
  process.exit(0);
}

const hasDirectUrl = !!process.env.DIRECT_DATABASE_URL;
if (!hasDirectUrl) {
  console.warn('');
  console.warn('⚠️  DIRECT_DATABASE_URL no está configurado.');
  console.warn('   Para evitar timeout en migraciones (advisory lock), configurá DIRECT_DATABASE_URL en Vercel');
  console.warn('   con la URL directa a Postgres (sin pool). Si usás Prisma Accelerate: DATABASE_URL = accelerate, DIRECT_DATABASE_URL = postgres://...');
  console.warn('');
}

console.log('Running prisma migrate deploy...');
try {
  run(`npx prisma migrate deploy --schema=${schemaPath}`);
} catch (err) {
  console.error('');
  console.error('❌ prisma migrate deploy falló. Posibles causas:');
  console.error('   - Timeout advisory lock: añadí DIRECT_DATABASE_URL en Vercel con la URL directa a Postgres (no Accelerate).');
  console.error('   - DATABASE_URL incorrecto o base inaccesible desde Vercel.');
  console.error('   - Firewall o red bloqueando la conexión.');
  console.error('');
  process.exit(1);
}
