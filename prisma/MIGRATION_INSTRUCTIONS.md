# Instrucciones para agregar la columna `nombre` a la tabla User

## Opción 1: Usar Prisma Migrate (Recomendado)

Si tienes `DATABASE_URL` configurado en tu archivo `.env`:

```bash
cd backend
npx prisma migrate dev --name add_nombre_column
```

## Opción 2: Ejecutar SQL manualmente

Si no puedes usar Prisma Migrate, ejecuta este SQL directamente en tu base de datos:

```sql
-- Agregar columna nombre si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'User' 
        AND column_name = 'nombre'
    ) THEN
        ALTER TABLE "User" ADD COLUMN "nombre" TEXT;
        
        -- Si hay usuarios existentes, establecer un valor por defecto
        UPDATE "User" SET "nombre" = 'Usuario' WHERE "nombre" IS NULL;
        
        -- Hacerla NOT NULL después de establecer defaults
        ALTER TABLE "User" ALTER COLUMN "nombre" SET NOT NULL;
    END IF;
END $$;
```

## Opción 3: Usar Prisma DB Push (Sincronización directa)

```bash
cd backend
npx prisma db push
```

**Nota:** `db push` sincroniza el schema directamente sin crear migraciones. Úsalo solo en desarrollo.

## Verificar

Después de ejecutar cualquiera de las opciones, verifica que la columna existe:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'User' 
AND column_name = 'nombre';
```
