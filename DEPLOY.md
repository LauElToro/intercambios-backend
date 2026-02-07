# Deploy en Vercel

## P1001: Can't reach database server

Si ves `P1001: Can't reach database server at db.prisma.io:5432`:

1. **Configurá DATABASE_URL** en Vercel: Project Settings → Environment Variables
2. La base debe ser **accesible desde Internet** (Neon, Supabase, Vercel Postgres, Railway, etc.)

### Connection pooling (Neon, Supabase)

Si usás conexión pooled (pgbouncer), las migraciones requieren una conexión directa. Editá `prisma/schema.prisma`:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")        // Conexión pooled
  directUrl = env("DIRECT_DATABASE_URL") // Conexión directa para migraciones
}
```

En Vercel, configurá ambas variables:
- `DATABASE_URL`: URL pooled (ej. Neon con `?pgbouncer=true` o puerto 6543)
- `DIRECT_DATABASE_URL`: URL directa (sin pgbouncer)

### Prisma Postgres / Vercel Postgres

Si usás Prisma Postgres o Vercel Postgres, las variables suelen llamarse:
- `POSTGRES_PRISMA_URL` (pooled)
- `POSTGRES_URL_NON_POOLING` (directa)

Renombrá o configurá `DATABASE_URL` y `DIRECT_DATABASE_URL` según corresponda.

### Preview deployments sin DB

Para saltar migraciones en previews: `SKIP_DB_MIGRATE=1`
