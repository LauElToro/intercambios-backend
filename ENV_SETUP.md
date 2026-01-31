# 🔐 Configuración de Variables de Entorno

## Variables para Vercel Dashboard

Configura estas variables en **Settings > Environment Variables** de tu proyecto en Vercel:

### Base de Datos

```env
DATABASE_URL=prisma+postgres://accelerate.prisma-data.net/?api_key=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqd3RfaWQiOjEsInNlY3VyZV9rZXkiOiJza19obU5ib2w4SWlVbnRaV2RNZDBESnkiLCJhcGlfa2V5IjoiMDFLRzdFSDlZNFM1MDM3QjRESDFNQkpTUFYiLCJ0ZW5hbnRfaWQiOiJlZmM1OTM0ZDM2OTUwNjQzY2ZkNTViYTFlOTgxYzIzMzdiOGJiOWMzOWZkZmM0ZWFkMDgzYmYzOTlhMjNjZWNkIiwiaW50ZXJuYWxfc2VjcmV0IjoiZWVmM2NkOGEtOWU1Yi00OTcyLTljNDItNGMzOGU1Y2RlNmE4In0.9Eoe7aJTdt2azi61T3qSRyVrDl8MRtj3dcUCF_JlI04
```

### Autenticación

```env
JWT_SECRET=intercambius-super-secret-jwt-key-change-in-production-2024
```

### Vercel Blob Storage

Para obtener el token de Blob Storage:

1. Ve a [Vercel Dashboard](https://vercel.com/dashboard)
2. Navega a **Storage** > Tu store (`store_iuW1gnctN1Hxzcnx`)
3. Ve a **Settings** > **Tokens**
4. Crea un nuevo token con permisos de lectura/escritura
5. Copia el token y úsalo aquí:

```env
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_iuW1gnctN1Hxzcnx_TU_TOKEN_AQUI
```

### Frontend (Opcional)

```env
FRONTEND_URL=https://tu-frontend.vercel.app
```

### Entorno

```env
NODE_ENV=production
```

## 📝 Notas Importantes

- **NUNCA** commitees el archivo `.env` con valores reales
- Las variables de entorno en Vercel están encriptadas automáticamente
- Usa diferentes `JWT_SECRET` para desarrollo y producción
- El token de Blob Storage es sensible, mantenlo seguro

## 🔄 Para Desarrollo Local

Crea un archivo `.env.local` (está en `.gitignore`) con los mismos valores para desarrollo local.
