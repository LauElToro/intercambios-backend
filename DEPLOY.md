# Deploy en Vercel

Guía para deployar el backend de Intercambius en Vercel.

---

## Índice

- [Configuración básica](#configuración-básica)
- [Variables de entorno](#variables-de-entorno)
- [P1001: Can't reach database server](#p1001-cant-reach-database-server)
- [Connection pooling](#connection-pooling)
- [Preview deployments](#preview-deployments)
- [Troubleshooting](#troubleshooting)

---

## Configuración básica

1. **Conectar repositorio** a Vercel
2. **Root directory**: `backend`
3. **Build command**: `npm run vercel-build` (definido en `vercel.json`)
4. **Output directory**: `public` (Vercel usa el handler serverless)
5. **Framework preset**: Other

El `vercel.json` configura:
- `buildCommand`: ejecuta `prisma generate` y `prisma migrate deploy`
- `functions`: `api/index.ts` como serverless handler
- `rewrites`: todo el tráfico va a `/api/index.ts`

---

## Variables de entorno

En **Project Settings → Environment Variables** configurar:

| Variable | Valor | Ambientes |
|----------|-------|-----------|
| `DATABASE_URL` | `postgresql://user:pass@host:5432/db?sslmode=require` | Production, Preview |
| `JWT_SECRET` | String aleatorio seguro | Production, Preview |
| `BLOB_READ_WRITE_TOKEN` | Token de Vercel Blob | Production, Preview |
| `FRONTEND_URL` | URL del frontend (opcional) | Production |

---

## P1001: Can't reach database server

Si ves:

```
Error: P1001: Can't reach database server at `db.prisma.io`:`5432`
Please make sure your database server is running at `db.prisma.io`:`5432`.
```

### Causas comunes

1. **DATABASE_URL no configurado** o apuntando a un placeholder
2. **Base de datos inaccesible** desde la red de Vercel (firewall, IP privada)
3. **Credenciales incorrectas** o base eliminada

### Soluciones

1. **Verificar DATABASE_URL**
   - Entrar a Vercel → Project → Settings → Environment Variables
   - Confirmar que `DATABASE_URL` existe y apunta a una base real
   - La base debe ser accesible desde Internet (Neon, Supabase, Vercel Postgres, Railway, etc.)

2. **Probar la conexión localmente**
   ```bash
   DATABASE_URL="tu-url" npx prisma db pull
   ```

3. **Si usás base local o en red privada**
   - Usar un túnel (ngrok, Cloudflare Tunnel) o
   - Migrar a una base en la nube con IP pública

4. **Si `db.prisma.io` es un placeholder**
   - Reemplazar por la URL real de tu proveedor

---

## Connection pooling

En serverless (Vercel), cada invocación puede abrir una nueva conexión. Con muchas requests, la base puede agotar conexiones. Usar **connection pooling** es recomendado.

### Neon

Neon ofrece dos URLs:
- **Pooled** (puerto 5432 o 6543): para la app
- **Direct** (puerto 5432): para migraciones

1. En el dashboard de Neon, copiar ambas URLs.
2. En `prisma/schema.prisma`:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")        // URL pooled
  directUrl = env("DIRECT_DATABASE_URL") // URL directa
}
```

3. En Vercel, configurar:
   - `DATABASE_URL`: URL pooled (ej. con `?pgbouncer=true` o puerto 6543)
   - `DIRECT_DATABASE_URL`: URL directa (sin pgbouncer)

### Supabase

Supabase también tiene connection pooler. Usar:
- `DATABASE_URL`: URL del pooler (modo Session o Transaction)
- `DIRECT_DATABASE_URL`: URL directa (puerto 5432) para migraciones

### Vercel Postgres / Prisma Postgres

Si usás Vercel Postgres o Prisma Postgres, las variables suelen llamarse:
- `POSTGRES_PRISMA_URL` (pooled)
- `POSTGRES_URL_NON_POOLING` (directa)

Opción 1: renombrar en Vercel a `DATABASE_URL` y `DIRECT_DATABASE_URL`.

Opción 2: en el schema, usar los nombres que provee el servicio:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("POSTGRES_PRISMA_URL")
  directUrl = env("POSTGRES_URL_NON_POOLING")
}
```

### Sin directUrl

Si usás **conexión directa** (no pooled), no hace falta `directUrl`. El schema puede quedar:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

---

## Preview deployments

Por defecto, cada PR genera un preview deployment. Si no tenés una base separada para previews:

1. **Opción A**: Usar la misma `DATABASE_URL` (las migraciones se aplican a la misma base)
2. **Opción B**: Saltar migraciones en previews con `SKIP_DB_MIGRATE=1`
   - En Vercel: Add Variable → `SKIP_DB_MIGRATE` = `1` → solo en Preview

Con `SKIP_DB_MIGRATE=1`, el build ejecuta solo `prisma generate`, no `prisma migrate deploy`. La app funcionará si el schema ya está aplicado en la base.

---

## Troubleshooting

### Build falla en "prisma migrate deploy"

- Revisar que `DATABASE_URL` esté configurado
- Si usás pooling: agregar `directUrl` en el schema
- Revisar logs de Vercel para el mensaje exacto

### "prisma: command not found"

- `prisma` debe estar en `dependencies` (no solo en `devDependencies`) para que esté disponible en el build de Vercel

### Funciones timeout (504)

- Aumentar `maxDuration` en `vercel.json` (máx. 60s en plan Hobby, más en Pro)
- Revisar queries lentas o falta de índices

### CORS

- Configurar `FRONTEND_URL` con la URL exacta del frontend
- Si usás múltiples dominios, puede hacerse un middleware que evalúe el `Origin` y responda con la lista permitida
