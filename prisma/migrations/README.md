# Migraciones de Prisma

## Comportamiento en Producción (Vercel)

Cuando se hace deploy a Vercel, el script `vercel-build` ejecuta automáticamente:

1. `prisma generate` - Genera el cliente de Prisma
2. `prisma migrate deploy` - Aplica migraciones pendientes de forma segura

### Seguridad

- ✅ **Nunca elimina datos**: `migrate deploy` solo aplica migraciones pendientes
- ✅ **Idempotente**: Puede ejecutarse múltiples veces sin problemas
- ✅ **Solo agrega/modifica**: No ejecuta migraciones que eliminen datos
- ✅ **Fallback seguro**: Si `migrate deploy` falla, ejecuta un script de verificación que solo agrega columnas si no existen

### Script de Verificación Segura

Si `migrate deploy` falla (por ejemplo, si no hay migraciones creadas), se ejecuta `ensure-nombre-column.js` que:

- Verifica si la columna existe antes de agregarla
- Usa `ADD COLUMN IF NOT EXISTS` para evitar errores
- Solo actualiza valores NULL, no modifica datos existentes
- No falla el build si hay problemas

## Crear una Nueva Migración

Para crear una nueva migración en desarrollo:

```bash
cd backend
npm run db:migrate -- --name nombre_de_la_migracion
```

Esto creará una migración en `prisma/migrations/` que se aplicará automáticamente en producción.

## Importante

- **Nunca elimines migraciones** que ya se hayan aplicado en producción
- **Siempre revisa** las migraciones antes de hacer commit
- Las migraciones se aplican en orden cronológico
- `migrate deploy` es seguro para producción (no ejecuta `migrate dev`)
