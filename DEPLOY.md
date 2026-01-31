# 🚀 Deploy en Vercel

Guía para deployar el backend de Intercambius en Vercel.

## 📋 Prerrequisitos

1. Cuenta en [Vercel](https://vercel.com)
2. Base de datos PostgreSQL (puede ser [Vercel Postgres](https://vercel.com/storage/postgres), [Supabase](https://supabase.com), [Neon](https://neon.tech), etc.)
3. Token de Vercel Blob Storage

## 🔧 Configuración

### 1. Preparar el proyecto

Asegúrate de que todos los archivos estén commitados:

```bash
git add .
git commit -m "Preparar para deploy en Vercel"
```

### 2. Conectar con Vercel

#### Opción A: Desde la CLI

```bash
# Instalar Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy (desde la carpeta backend)
cd backend
vercel
```

#### Opción B: Desde el Dashboard

1. Ve a [vercel.com](https://vercel.com)
2. Click en "Add New Project"
3. Conecta tu repositorio de GitHub/GitLab/Bitbucket
4. Selecciona el directorio `backend` como root
5. Configura las variables de entorno (ver abajo)
6. Click en "Deploy"

### 3. Variables de Entorno

En el dashboard de Vercel, ve a **Settings > Environment Variables** y agrega:

| Variable | Valor | Descripción |
|----------|-------|-------------|
| `DATABASE_URL` | `postgresql://...` | URL de conexión a PostgreSQL |
| `JWT_SECRET` | `tu-secret-super-seguro` | Secret para firmar JWT tokens |
| `BLOB_READ_WRITE_TOKEN` | `vercel_blob_...` | Token de Vercel Blob Storage |
| `NODE_ENV` | `production` | Entorno de producción |

**Importante:** 
- Usa valores diferentes para `JWT_SECRET` en producción
- No compartas estos valores públicamente
- Vercel encripta las variables de entorno automáticamente

### 4. Configurar Base de Datos

#### Opción A: Vercel Postgres (Recomendado)

1. En el dashboard de Vercel, ve a **Storage**
2. Click en **Create Database** > **Postgres**
3. Selecciona tu proyecto
4. Copia la `DATABASE_URL` y úsala como variable de entorno

#### Opción B: Base de datos externa

Si usas Supabase, Neon, o cualquier otro proveedor:
1. Crea la base de datos
2. Copia la connection string
3. Agrégala como `DATABASE_URL` en Vercel

### 5. Ejecutar Migraciones

Después del primer deploy, necesitas ejecutar las migraciones:

```bash
# Opción 1: Desde tu máquina local
cd backend
DATABASE_URL="tu-database-url" npm run db:migrate

# Opción 2: Usar Vercel CLI
vercel env pull .env.local
npm run db:migrate
```

O puedes usar Prisma Studio para ejecutar las migraciones:
```bash
DATABASE_URL="tu-database-url" npx prisma migrate deploy
```

### 6. Verificar el Deploy

Una vez deployado, verifica que todo funcione:

```bash
# Health check
curl https://tu-proyecto.vercel.app/api/health

# Debería responder:
# {"status":"ok","timestamp":"2024-01-15T10:00:00.000Z"}
```

## 🔄 Deploy Automático

Vercel hace deploy automático cuando:
- Haces push a la rama `main` (producción)
- Haces push a otras ramas (preview deployments)
- Abres un Pull Request (preview deployment)

## 📝 Estructura para Vercel

```
backend/
├── api/
│   └── index.ts          # Entry point para Vercel
├── src/                  # Código fuente
├── prisma/              # Schema de Prisma
├── vercel.json          # Configuración de Vercel
└── package.json
```

## 🐛 Troubleshooting

### Error: "Cannot find module '@prisma/client'"

Asegúrate de que `vercel-build` incluya `prisma generate`:

```json
{
  "scripts": {
    "vercel-build": "prisma generate && tsc"
  }
}
```

### Error: "Database connection failed"

1. Verifica que `DATABASE_URL` esté configurada correctamente
2. Asegúrate de que la base de datos permita conexiones desde Vercel
3. Si usas una base de datos externa, verifica el firewall/whitelist

### Error: "BLOB_READ_WRITE_TOKEN no configurado"

1. Ve a [Vercel Blob Storage](https://vercel.com/storage/blob)
2. Crea un store o usa uno existente
3. Copia el token y agrégalo como variable de entorno

### Las funciones serverless no encuentran los módulos

Verifica que `tsconfig.json` tenga la configuración correcta:
- `moduleResolution: "node"`
- `module: "ESNext"` o `"CommonJS"`

## 🔐 Seguridad

- ✅ Nunca commitees `.env` o `.env.local`
- ✅ Usa variables de entorno para todos los secrets
- ✅ Rota `JWT_SECRET` periódicamente
- ✅ Usa HTTPS (Vercel lo hace automáticamente)
- ✅ Limita el acceso a la base de datos por IP si es posible

## 📊 Monitoreo

Vercel proporciona:
- **Logs**: Ve a tu proyecto > **Deployments** > Click en un deployment > **Functions** > Ver logs
- **Analytics**: Métricas de uso y rendimiento
- **Speed Insights**: Análisis de rendimiento

## 🚀 Próximos Pasos

1. Configura un dominio personalizado (opcional)
2. Configura webhooks para CI/CD
3. Configura alertas de errores (Sentry, etc.)
4. Configura monitoreo de base de datos

## 📚 Recursos

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres)
- [Vercel Blob Storage](https://vercel.com/docs/storage/vercel-blob)
- [Prisma + Vercel](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-vercel)
