# Migraciones Prisma

## Producción (Vercel)

En cada deploy se ejecuta:

1. `prisma generate` – genera el cliente
2. `prisma migrate resolve --rolled-back 20250131000000_add_nombre_column` – limpia migración fallida si existe (opcional)
3. `prisma migrate deploy` – aplica migraciones pendientes

Si `migrate deploy` falla (ej. sin `DATABASE_URL` en build), la API sigue funcionando: **en runtime** se sincroniza el schema (`ensureSchema`) y se añaden columnas/tablas faltantes en la primera petición.

## Crear una migración

```bash
cd backend
npm run db:migrate -- --name nombre_de_la_migracion
```

## Resolver migración fallida (P3009)

Si una migración quedó marcada como fallida:

```bash
npx prisma migrate resolve --rolled-back NOMBRE_DE_LA_MIGRACION --schema=./prisma/schema.prisma
```

Luego vuelve a ejecutar `prisma migrate deploy`.
