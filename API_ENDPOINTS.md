# 🔌 Endpoints de la API

## Base URL
```
https://tu-proyecto.vercel.app
```

## Endpoints Disponibles

### Health Check
```bash
GET /api/health
```

Respuesta:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:00:00.000Z",
  "environment": "production"
}
```

### Autenticación

#### Registro
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

#### Login
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "juan@example.com",
  "password": "password123"
}
```

### Market (Público)

#### Obtener items
```bash
GET /api/market
GET /api/market?rubro=servicios
GET /api/market?tipo=productos
```

#### Obtener item por ID
```bash
GET /api/market/:id
```

### Coincidencias (Público)
```bash
GET /api/coincidencias?userId=1
```

### Usuarios (Protegido - requiere token)
```bash
GET /api/users
Authorization: Bearer <token>
```

### Intercambios (Protegido - requiere token)
```bash
GET /api/intercambios/:userId
POST /api/intercambios
PATCH /api/intercambios/:id/confirm
Authorization: Bearer <token>
```

### Upload (Protegido - requiere token)
```bash
POST /api/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

FormData:
  image: <file>
```

## ⚠️ Nota sobre 404

Los errores 404 para `/` y `/favicon.ico` son **normales** y **esperados**:
- Este es un backend API puro, no tiene página de inicio
- El navegador intenta cargar recursos que no existen
- **No afecta la funcionalidad del API**

## ✅ Cómo Probar

### Desde el navegador:
```
https://tu-proyecto.vercel.app/api/health
```

### Desde terminal (curl):
```bash
curl https://tu-proyecto.vercel.app/api/health
```

### Desde Postman/Insomnia:
- URL: `https://tu-proyecto.vercel.app/api/health`
- Method: `GET`

## 🔐 Autenticación

Para endpoints protegidos, incluir el header:
```
Authorization: Bearer <tu-token-jwt>
```

El token se obtiene del endpoint `/api/auth/login`.
