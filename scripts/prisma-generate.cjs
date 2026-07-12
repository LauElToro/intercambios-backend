#!/usr/bin/env node
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
const usesAccelerate =
  process.env.PRISMA_ACCELERATE === '1' ||
  (process.env.DATABASE_URL || '').startsWith('prisma://') ||
  (process.env.PRISMA_DATABASE_URL || '').startsWith('prisma+postgres://');

const cmd = usesAccelerate
  ? `npx prisma generate --accelerate --schema=${schemaPath}`
  : `npx prisma generate --schema=${schemaPath}`;

console.log(usesAccelerate ? 'prisma generate --accelerate' : 'prisma generate');
execSync(cmd, { stdio: 'inherit', cwd: path.join(__dirname, '..') });
