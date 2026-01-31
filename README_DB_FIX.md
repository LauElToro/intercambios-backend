# Base de datos en producción

## Si falta la columna `User.ofrece` (u otras)

La API **sincroniza el schema en runtime** en la primera petición (`ensureSchema`). No hace falta ejecutar scripts a mano: con un nuevo deploy o recargando la web, la primera petición añade columnas/tablas faltantes.

## Si Prisma marca una migración como fallida (P3009)

Ejecuta una vez (con `DATABASE_URL` configurado):

```bash
cd backend
npx prisma migrate resolve --rolled-back 20250131000000_add_nombre_column --schema=./prisma/schema.prisma
```

Luego haz un nuevo deploy; en el build se volverá a ejecutar `migrate deploy`.

## SQL manual (opcional)

Si tienes acceso directo a la base:

```sql
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "oferce" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "necesita" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "precioOferta" INTEGER DEFAULT 0;
```
