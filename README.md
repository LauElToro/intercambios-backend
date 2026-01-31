# Intercambius Backend

Backend API para Intercambius con arquitectura DDD, PostgreSQL y Prisma.

## 🚀 Inicio Rápido

### Prerrequisitos

- Node.js 18+ 
- PostgreSQL 14+
- npm o yarn

### Instalación Local

1. **Instalar dependencias:**
```bash
npm install
```

2. **Configurar variables de entorno:**
```bash
cp .env.example .env
```

Editar `.env` con tus credenciales:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/intercambius?schema=public"
PORT=3001
NODE_ENV=development
JWT_SECRET=your-super-secret-jwt-key-change-in-production
BLOB_READ_WRITE_TOKEN=your-vercel-blob-token
FRONTEND_URL=http://localhost:5173
```

3. **Generar cliente de Prisma:**
```bash
npm run db:generate
```

4. **Ejecutar migraciones:**
```bash
npm run db:migrate
```

5. **Poblar base de datos (opcional):**
```bash
npm run db:seed
```

6. **Iniciar servidor de desarrollo:**
```bash
npm run dev
```

El servidor estará disponible en `http://localhost:3001`

## 🌐 Deploy en Vercel

Para deployar en Vercel, consulta la guía completa en [DEPLOY.md](./DEPLOY.md)

**Resumen rápido:**
1. Conecta tu repositorio con Vercel
2. Selecciona el directorio `backend` como root
3. Configura las variables de entorno
4. Deploy automático en cada push

## 📁 Estructura del Proyecto

```
backend/
├── api/
│   └── index.ts              # Entry point para Vercel
├── src/
│   ├── domain/              # Capa de dominio (DDD)
│   │   ├── entities/        # Entidades de negocio
│   │   ├── value-objects/   # Value objects
│   │   └── repositories/    # Interfaces de repositorios
│   ├── application/         # Casos de uso
│   │   └── use-cases/
│   ├── infrastructure/      # Implementaciones técnicas
│   │   ├── database/        # Prisma client
│   │   ├── repositories/    # Implementación de repositorios
│   │   ├── middleware/      # Middlewares (auth, etc.)
│   │   └── storage/         # Almacenamiento (Vercel Blob)
│   └── presentation/        # Capa de presentación
│       ├── controllers/     # Controladores HTTP
│       └── routes/          # Rutas de la API
├── prisma/
│   └── schema.prisma        # Schema de Prisma
├── vercel.json              # Configuración de Vercel
└── package.json
```

## 🔐 Autenticación

### Registro
```bash
POST /api/auth/register
Content-Type: application/json

{
  "nombre": "Juan Pérez",
  "email": "juan@example.com",
  "password": "password123",
  "contacto": "+54 11 1234-5678",
  "ofrece": "Diseño gráfico",
  "necesita": "Clases de inglés",
  "precioOferta": 100,
  "ubicacion": "CABA"
}
```

### Login
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "juan@example.com",
  "password": "password123"
}
```

Respuesta:
```json
{
  "token": "jwt-token-here",
  "user": { ... }
}
```

### Uso del Token

Incluir el token en el header `Authorization`:
```
Authorization: Bearer <token>
```

## 📤 Upload de Imágenes

### Subir Imagen
```bash
POST /api/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

FormData:
  image: <file>
```

Respuesta:
```json
{
  "url": "https://iuw1gnctn1hxzcnx.public.blob.vercel-storage.com/...",
  "pathname": "market/1/1234567890-image.jpg"
}
```

## 🔄 Intercambios

### Crear Intercambio
```bash
POST /api/intercambios
Authorization: Bearer <token>
Content-Type: application/json

{
  "otraPersonaId": 2,
  "otraPersonaNombre": "María García",
  "descripcion": "Intercambio de servicios",
  "creditos": 50,
  "fecha": "2024-01-15T10:00:00Z"
}
```

### Obtener Intercambios
```bash
GET /api/intercambios/:userId
Authorization: Bearer <token>
```

### Confirmar Intercambio
```bash
PATCH /api/intercambios/:id/confirm
Authorization: Bearer <token>
```

## 💰 Sistema de Tokens

- **1 IX = 1 Peso Argentino** (temporal)
- Límite de crédito negativo: **15,000 IX** (equivalente a 15,000 pesos)
- Los usuarios pueden tener saldo negativo hasta el límite

## 🛠️ Scripts Disponibles

- `npm run dev` - Inicia servidor en modo desarrollo
- `npm run build` - Compila TypeScript y genera Prisma client
- `npm run start` - Inicia servidor en producción
- `npm run type-check` - Verifica tipos sin compilar
- `npm run db:generate` - Genera cliente de Prisma
- `npm run db:push` - Sincroniza schema con BD (desarrollo)
- `npm run db:migrate` - Ejecuta migraciones
- `npm run db:studio` - Abre Prisma Studio
- `npm run db:seed` - Pobla la base de datos
- `npm run vercel-build` - Build para Vercel (incluye Prisma)

## 📚 Documentación

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Arquitectura DDD
- [DEPLOY.md](./DEPLOY.md) - Guía de deploy en Vercel

## 🔒 Variables de Entorno

| Variable | Descripción | Requerido | Default |
|----------|-------------|-----------|---------|
| `DATABASE_URL` | URL de conexión a PostgreSQL | ✅ | - |
| `PORT` | Puerto del servidor (solo local) | ❌ | 3001 |
| `NODE_ENV` | Entorno (development/production) | ❌ | development |
| `JWT_SECRET` | Secret para firmar JWT | ✅ | - |
| `BLOB_READ_WRITE_TOKEN` | Token de Vercel Blob Storage | ✅ | - |
| `FRONTEND_URL` | URL del frontend (para CORS) | ❌ | * |

## 🐛 Troubleshooting

### Error: "Cannot find module '@prisma/client'"
```bash
npm run db:generate
```

### Error: "Database connection failed"
- Verificar que PostgreSQL esté corriendo
- Verificar `DATABASE_URL` en `.env`
- Verificar credenciales de la base de datos
- En Vercel: Verificar que la variable de entorno esté configurada

### Error: "BLOB_READ_WRITE_TOKEN no configurado"
- Agregar el token de Vercel Blob Storage en `.env` (local) o en Vercel Dashboard (producción)

### Error en Vercel: "Module not found"
- Verificar que `vercel-build` incluya `prisma generate`
- Verificar que `tsconfig.json` tenga la configuración correcta
- Asegurarse de que todos los imports usen extensiones `.js`

## 🧪 Testing

### Health Check
```bash
# Local
curl http://localhost:3001/api/health

# Vercel
curl https://tu-proyecto.vercel.app/api/health
```

### Test de Autenticación
```bash
# Registro
curl -X POST https://tu-proyecto.vercel.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Test","email":"test@test.com","password":"123456","contacto":"+541112345678","ofrece":"Test","necesita":"Test"}'

# Login
curl -X POST https://tu-proyecto.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"123456"}'
```

## 📊 Monitoreo

En Vercel:
- **Logs**: Dashboard > Deployments > Functions > Ver logs
- **Analytics**: Métricas de uso y rendimiento
- **Speed Insights**: Análisis de rendimiento

## 🔐 Seguridad

- ✅ Nunca commitees `.env` o `.env.local`
- ✅ Usa variables de entorno para todos los secrets
- ✅ Rota `JWT_SECRET` periódicamente
- ✅ Usa HTTPS (Vercel lo hace automáticamente)
- ✅ Limita el acceso a la base de datos por IP si es posible
- ✅ Valida y sanitiza todas las entradas
