# 🔧 Fix de Base de Datos - Columnas Faltantes

## ⚠️ Problema
Si recibes el error: `Invalid prisma.user.findUnique() invocation: The column User.ofrece does not exist in the current database.`

## ✅ Solución Rápida

### Opción 1: Ejecutar SQL directamente (MÁS RÁPIDO) ⚡

1. Abre tu cliente SQL (pgAdmin, DBeaver, psql, etc.)
2. Conéctate a tu base de datos PostgreSQL
3. Copia y pega el contenido completo de `backend/scripts/fix-db-direct.sql`
4. Ejecuta el script

Esto agregará todas las columnas faltantes inmediatamente.

### Opción 2: Ejecutar script Node.js

```bash
cd backend
npm run db:fix-all-columns
```

Este script agregará todas las columnas faltantes de forma segura.

### Opción 3: Usar Prisma DB Push (solo desarrollo)

```bash
cd backend
npm run db:push
```

## 📋 Columnas que se agregan

El script agrega las siguientes columnas si no existen:

- ✅ `nombre` (TEXT, NOT NULL)
- ✅ `contacto` (TEXT, NOT NULL)
- ✅ `oferce` (TEXT, nullable) ⚠️ **Esta es la que falta**
- ✅ `necesita` (TEXT, nullable)
- ✅ `precioOferta` (INTEGER, nullable)
- ✅ `saldo` (INTEGER, DEFAULT 0)
- ✅ `limite` (INTEGER, DEFAULT 15000)
- ✅ `rating` (DOUBLE PRECISION, nullable)
- ✅ `totalResenas` (INTEGER, DEFAULT 0)
- ✅ `miembroDesde` (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP)
- ✅ `ubicacion` (TEXT, NOT NULL)
- ✅ `verificado` (BOOLEAN, DEFAULT false)
- ✅ `createdAt` (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP)
- ✅ `updatedAt` (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP)

## 🚀 En Producción (Vercel)

El script se ejecuta automáticamente en cada deploy si `prisma migrate deploy` falla. No necesitas hacer nada manualmente.

## 🔍 Verificación

Para verificar que todas las columnas existen:

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'User'
ORDER BY column_name;
```

## ⚡ Solución Inmediata

Si necesitas solucionarlo AHORA, ejecuta este SQL directamente:

```sql
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "oferce" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "necesita" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "precioOferta" INTEGER DEFAULT 0;
```
