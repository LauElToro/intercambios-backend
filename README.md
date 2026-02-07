# Intercambius Backend

API REST para el marketplace Intercambius. Arquitectura DDD, Express, Prisma y PostgreSQL.

---

## Índice

- [Inicio rápido](#inicio-rápido)
- [Estructura del proyecto](#estructura-del-proyecto)
- [API Reference](#api-reference)
- [Autenticación](#autenticación)
- [Variables de entorno](#variables-de-entorno)
- [Scripts](#scripts)
- [Troubleshooting](#troubleshooting)

---

## Inicio rápido

### Prerrequisitos

- Node.js 18+
- PostgreSQL 14+ (o base en la nube)
- npm

### Instalación local

```bash
npm install
```

### Variables de entorno

Crear `backend/.env`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/intercambius?schema=public"
PORT=3001
NODE_ENV=development
JWT_SECRET=tu-secret-jwt-cambiar-en-produccion
BLOB_READ_WRITE_TOKEN=tu-vercel-blob-token
FRONTEND_URL=http://localhost:8080
```

### Base de datos

```bash
npm run db:generate
npm run db:migrate
# Opcional: npm run db:seed
```

### Ejecutar

```bash
npm run dev
```

Servidor en `http://localhost:3001`

---

## Estructura del proyecto

```
backend/
├── api/
│   └── index.ts              # Entry point para Vercel serverless
├── src/
│   ├── domain/               # Capa de dominio (DDD)
│   │   ├── entities/         # User, MarketItem, Intercambio, Auth
│   │   ├── value-objects/    # Currency
│   │   └── repositories/    # Interfaces IUserRepository, etc.
│   ├── application/          # Casos de uso
│   │   └── use-cases/
│   │       ├── auth/         # Login, Register
│   │       ├── checkout/     # CheckoutUseCase
│   │       ├── market/       # GetMarketItemsUseCase
│   │       ├── intercambio/  # Create, Get, Confirm
│   │       ├── coincidencias/
│   │       └── user/
│   ├── infrastructure/       # Implementaciones
│   │   ├── database/         # Prisma client, ensureSchema, seed
│   │   ├── repositories/     # MarketItemRepository, UserRepository, etc.
│   │   ├── middleware/       # auth (JWT)
│   │   └── storage/          # vercel-blob
│   └── presentation/
│       ├── controllers/      # AuthController, MarketController, etc.
│       └── routes/           # auth, market, chat, checkout, etc.
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── scripts/
│   ├── vercel-build.cjs      # Build para Vercel
│   └── check-and-backfill-coords.ts
├── vercel.json
└── package.json
```

---

## API Reference

### Base URL

- Local: `http://localhost:3001`
- Producción: `https://[tu-proyecto].vercel.app`

### Endpoints

#### Públicos

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/` | Info de la API |
| GET | `/api/health` | Health check |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/register` | Registro |
| GET | `/api/market` | Listar items (filtros por query) |
| GET | `/api/market/:id` | Detalle de item |
| GET | `/api/coincidencias` | Matching ofertas/necesidades |

#### Protegidos (requieren `Authorization: Bearer <token>`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/users/me` | Usuario actual |
| PUT | `/api/users/me` | Actualizar usuario actual |
| GET | `/api/users/:id` | Usuario por ID |
| POST | `/api/market` | Crear item |
| PUT | `/api/market/:id` | Actualizar item |
| DELETE | `/api/market/:id` | Eliminar item |
| GET | `/api/favoritos` | Mis favoritos |
| POST | `/api/favoritos/:marketItemId` | Toggle favorito |
| POST | `/api/checkout/:marketItemId` | Comprar con IX |
| POST | `/api/chat/iniciar` | Iniciar conversación |
| GET | `/api/chat` | Listar conversaciones |
| GET | `/api/chat/:conversacionId` | Mensajes de conversación |
| POST | `/api/chat/:conversacionId` | Enviar mensaje |
| GET | `/api/intercambios/:userId` | Intercambios del usuario |
| POST | `/api/intercambios` | Crear intercambio |
| PATCH | `/api/intercambios/:id/confirm` | Confirmar intercambio |
| POST | `/api/upload` | Subir imagen |

### Query params para Market

| Param | Tipo | Descripción |
|-------|------|-------------|
| `rubro` | string | servicios, productos, alimentos, experiencias |
| `tipo` | string | productos, servicios |
| `precioMin` | number | Precio mínimo (IX) |
| `precioMax` | number | Precio máximo (IX) |
| `userLat` | number | Latitud del usuario (filtro distancia) |
| `userLng` | number | Longitud del usuario |
| `distanciaMax` | number | Distancia máxima en km |

---

## Autenticación

### Registro

```bash
POST /api/auth/register
Content-Type: application/json

{
  "nombre": "Juan Pérez",
  "email": "juan@example.com",
  "password": "password123",
  "contacto": "+54 11 1234-5678",
  "ubicacion": "CABA"
}
```

Respuesta: `201` + objeto `user` (sin password).

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
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "nombre": "Juan Pérez",
    "email": "juan@example.com",
    "saldo": 0,
    "limite": 150000,
    ...
  }
}
```

### Uso del token

Incluir en todas las peticiones protegidas:

```
Authorization: Bearer <token>
```

El token expira en **7 días**.

### Errores de auth

- `401 No autorizado`: Header Authorization faltante o inválido
- `401 Token inválido`: Token expirado o malformado

---

## Upload de imágenes

```bash
POST /api/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

FormData:
  image: <file>
  tipo: "market" | "fotoPerfil" | "banner"  (opcional)
```

Respuesta:
```json
{
  "url": "https://xxx.public.blob.vercel-storage.com/...",
  "pathname": "market/1/1234567890-image.jpg",
  "mediaType": "image"
}
```

---

## Checkout (compra con IX)

```bash
POST /api/checkout/:marketItemId
Authorization: Bearer <token>
```

Descuenta el precio del item del saldo del comprador y acredita al vendedor. Crea el intercambio y una conversación de chat.

---

## Variables de entorno

| Variable | Descripción | Requerido | Default |
|----------|-------------|-----------|---------|
| `DATABASE_URL` | PostgreSQL connection string | ✅ | - |
| `JWT_SECRET` | Secret para firmar JWT | ✅ | - |
| `BLOB_READ_WRITE_TOKEN` | Token de Vercel Blob Storage | ✅ | - |
| `FRONTEND_URL` | Origen permitido para CORS | ❌ | * |
| `PORT` | Puerto (solo local) | ❌ | 3001 |
| `NODE_ENV` | development / production | ❌ | development |

---

## Scripts

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Servidor desarrollo (tsx watch) |
| `npm run build` | tsc + prisma generate |
| `npm run start` | Servidor producción |
| `npm run vercel-build` | Build para Vercel |
| `npm run db:generate` | prisma generate |
| `npm run db:push` | Sincronizar schema (dev) |
| `npm run db:migrate` | prisma migrate dev |
| `npm run db:migrate:deploy` | Migraciones en producción |
| `npm run db:studio` | Prisma Studio |
| `npm run db:seed` | Seed de datos |
| `npm run db:check-coords` | Backfill coordenadas en MarketItems |

---

## Deploy en Vercel

Ver [DEPLOY.md](./DEPLOY.md) para la guía completa.

---

## Troubleshooting

### "Cannot find module '@prisma/client'"
```bash
npm run db:generate
```

### "Database connection failed"
- Verificar que PostgreSQL esté corriendo
- Verificar `DATABASE_URL` en `.env`
- En Vercel: configurar la variable en Project Settings

### "BLOB_READ_WRITE_TOKEN no configurado"
- Crear un store en Vercel Blob y agregar el token en `.env` o Vercel Dashboard

### "Module not found" en Vercel
- Verificar que todos los imports usen extensión `.js`
- Verificar que `vercel-build` ejecute `prisma generate`

### CORS
- Configurar `FRONTEND_URL` con la URL exacta del frontend (ej. `https://tu-app.netlify.app`)
