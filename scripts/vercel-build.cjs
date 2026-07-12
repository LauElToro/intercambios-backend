#!/usr/bin/env node
/**
 * Build script para Vercel.
 * - Genera Prisma Client (siempre).
 * - Migraciones: en Vercel se saltan por defecto (timeout advisory lock con db.prisma.io).
 *   Ejecutá "npx prisma migrate deploy" desde tu máquina cuando haya nuevas migraciones.
 * - Para forzar migraciones en el build: RUN_MIGRATE_IN_VERCEL=1 (puede fallar por timeout).
 */

const { execSync } = require('child_process');
const path = require('path');

function trimEnv(v) {
  if (!v) return undefined;
  const t = String(v).replace(/^["']|["']$/g, '').trim();
  return t || undefined;
}

function resolveDatabaseEnvForBuild() {
  const prismaAccelerate = trimEnv(process.env.PRISMA_DATABASE_URL);
  const postgresPrisma = trimEnv(process.env.POSTGRES_PRISMA_URL);
  const databaseUrl = trimEnv(process.env.DATABASE_URL);
  const postgresUrl = trimEnv(process.env.POSTGRES_URL);
  const accelerate = prismaAccelerate || postgresPrisma;

  if (accelerate) {
    const shouldPrefer =
      !databaseUrl ||
      databaseUrl.includes('db.prisma.io') ||
      databaseUrl === postgresUrl;
    if (shouldPrefer) {
      process.env.DATABASE_URL = accelerate.replace(/^prisma\+postgres:\/\//, 'prisma://');
      process.env.PRISMA_ACCELERATE = '1';
    }
  }
}

resolveDatabaseEnvForBuild();

const schemaPath = path.join(__dirname, '../prisma/schema.prisma');
const isVercel = process.env.VERCEL === '1';
const runMigrateInVercel = process.env.RUN_MIGRATE_IN_VERCEL === '1';
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
require('./prisma-generate.cjs');

if (skipMigrate) {
  console.log('SKIP_DB_MIGRATE=1: skipping prisma migrate deploy');
  process.exit(0);
}

if (isVercel && !runMigrateInVercel) {
  console.log('');
  console.log('Vercel build: migraciones omitidas (evita timeout advisory lock).');
  console.log('Ejecutá "npx prisma migrate deploy" desde tu PC cuando agregues migraciones.');
  console.log('');
  process.exit(0);
}

if (!hasDatabaseUrl) {
  console.warn('');
  console.warn('⚠️  DATABASE_URL no está configurado.');
  console.warn('   La compilación continúa; ejecutá "prisma migrate deploy" manualmente si hace falta.');
  console.warn('');
  process.exit(0);
}

console.log('Running prisma migrate deploy...');
try {
  run(`npx prisma migrate deploy --schema=${schemaPath}`);
} catch (err) {
  console.error('');
  console.error('❌ prisma migrate deploy falló.');
  console.error('   En Vercel suele ser timeout (advisory lock). Ejecutá las migraciones desde tu máquina.');
  console.error('');
  process.exit(1);
}
