#!/usr/bin/env node
const { execSync } = require('child_process');
const path = require('path');

function trimEnv(v) {
  if (!v) return undefined;
  const t = String(v).replace(/^["']|["']$/g, '').trim();
  return t || undefined;
}

function isAccelerateUrl(url) {
  return url.startsWith('prisma://') || url.startsWith('prisma+postgres://');
}

function findAccelerateUrl() {
  for (const key of ['PRISMA_DATABASE_URL', 'POSTGRES_PRISMA_URL', 'DATABASE_URL', 'POSTGRES_URL']) {
    const v = trimEnv(process.env[key]);
    if (v && isAccelerateUrl(v)) return v;
  }
  return undefined;
}

function resolveDatabaseEnvForBuild() {
  const databaseUrl = trimEnv(process.env.DATABASE_URL);
  const accelerate = findAccelerateUrl();

  if (accelerate) {
    const shouldPrefer =
      !databaseUrl ||
      databaseUrl.includes('db.prisma.io') ||
      !isAccelerateUrl(databaseUrl);
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
