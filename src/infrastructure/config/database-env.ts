function trimEnv(v: string | undefined): string | undefined {
  if (v == null) return undefined;
  const t = v.replace(/^["']|["']$/g, '').trim();
  return t || undefined;
}

function isAccelerateUrl(url: string): boolean {
  return url.startsWith('prisma://') || url.startsWith('prisma+postgres://');
}

function isDirectPrismaPostgres(url: string): boolean {
  return url.includes('db.prisma.io');
}

/**
 * Normaliza URLs de Prisma Accelerate para Prisma Client 5.x (`prisma generate --accelerate`).
 */
export function normalizeAccelerateUrl(url: string): string {
  return url.replace(/^prisma\+postgres:\/\//, 'prisma://');
}

function findAccelerateUrl(): string | undefined {
  const keys = [
    'PRISMA_DATABASE_URL',
    'POSTGRES_PRISMA_URL',
    'DATABASE_URL',
    'POSTGRES_URL',
  ];
  for (const key of keys) {
    const v = trimEnv(process.env[key]);
    if (v && isAccelerateUrl(v)) return v;
  }
  return undefined;
}

function findDirectUrl(): string | undefined {
  const keys = ['DIRECT_DATABASE_URL', 'POSTGRES_URL_NON_POOLING', 'POSTGRES_URL', 'DATABASE_URL'];
  for (const key of keys) {
    const v = trimEnv(process.env[key]);
    if (v && !isAccelerateUrl(v)) return v;
  }
  return undefined;
}

/**
 * En Vercel/Prisma Postgres:
 * - `DATABASE_URL` / `POSTGRES_URL` suelen ser TCP directo a db.prisma.io:5432 (falla en serverless).
 * - `PRISMA_DATABASE_URL` es la URL pooled vía Accelerate (prisma+postgres://…).
 */
export function resolveDatabaseEnv(): void {
  const databaseUrl = trimEnv(process.env.DATABASE_URL);
  const accelerate = findAccelerateUrl();
  const direct = findDirectUrl();

  if (accelerate) {
    const shouldPreferAccelerate =
      !databaseUrl ||
      isDirectPrismaPostgres(databaseUrl) ||
      !isAccelerateUrl(databaseUrl);

    if (shouldPreferAccelerate) {
      process.env.DATABASE_URL = normalizeAccelerateUrl(accelerate);
      process.env.PRISMA_ACCELERATE = '1';
    }
  } else if (databaseUrl && isDirectPrismaPostgres(databaseUrl)) {
    console.warn(
      '[database] DATABASE_URL apunta a db.prisma.io sin PRISMA_DATABASE_URL. ' +
        'En Vercel, agregá PRISMA_DATABASE_URL (prisma+postgres://…) desde Prisma Console.',
    );
    if (!databaseUrl.includes('sslmode=')) {
      const sep = databaseUrl.includes('?') ? '&' : '?';
      process.env.DATABASE_URL = `${databaseUrl}${sep}sslmode=require&connect_timeout=15`;
    }
  }

  if (direct && !trimEnv(process.env.DIRECT_DATABASE_URL)) {
    process.env.DIRECT_DATABASE_URL = direct;
  }
}

export function usesPrismaAccelerate(): boolean {
  const url = trimEnv(process.env.DATABASE_URL);
  return process.env.PRISMA_ACCELERATE === '1' || Boolean(url && isAccelerateUrl(url));
}

export function friendlyDatabaseErrorMessage(err: unknown): string | null {
  const msg = err instanceof Error ? err.message : String(err);
  const code = (err as { code?: string })?.code;

  if (code === 'P6003' || /planLimitReached|hold on your account/i.test(msg)) {
    return 'La base de datos de Intercambius alcanzó el límite del plan de Prisma Postgres. Contactá al equipo para reactivarla o migrar la base.';
  }
  if (code === 'P1001' || /Can't reach database server/i.test(msg) || /db\.prisma\.io/.test(msg)) {
    return 'No pudimos conectar con la base de datos. Si el problema persiste, el servicio de base de datos puede estar suspendido o mal configurado en el servidor.';
  }
  if (/prisma/i.test(msg) && /invocation/i.test(msg)) {
    return 'Error temporal de base de datos. Intentá de nuevo en unos minutos.';
  }
  return null;
}
