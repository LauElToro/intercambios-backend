# Arquitectura DDD - Intercambius Backend

Este documento describe la arquitectura Domain-Driven Design (DDD) implementada en el backend de Intercambius.

## Estructura de Capas

### 1. Domain (Dominio)
**Ubicación:** `src/domain/`

Contiene la lógica de negocio pura, sin dependencias externas.

#### Entities (Entidades)
- `User.ts` - Entidad de usuario con lógica de negocio
- `MarketItem.ts` - Entidad de item del market
- `Intercambio.ts` - Entidad de intercambio

#### Value Objects
- `Currency.ts` - Value object para manejo de moneda

#### Repositories (Interfaces)
- `IUserRepository.ts` - Contrato para repositorio de usuarios
- `IMarketItemRepository.ts` - Contrato para repositorio de items
- `IIntercambioRepository.ts` - Contrato para repositorio de intercambios

### 2. Application (Aplicación)
**Ubicación:** `src/application/`

Contiene los casos de uso (use cases) que orquestan la lógica de negocio.

#### Use Cases
- `user/CreateUserUseCase.ts` - Crear usuario
- `user/UpdateUserSaldoUseCase.ts` - Actualizar saldo
- `market/GetMarketItemsUseCase.ts` - Obtener items del market
- `coincidencias/GetCoincidenciasUseCase.ts` - Obtener coincidencias

### 3. Infrastructure (Infraestructura)
**Ubicación:** `src/infrastructure/`

Implementa las interfaces definidas en el dominio y maneja detalles técnicos.

#### Database
- `database/prisma.ts` - Cliente de Prisma
- `database/seed.ts` - Seed de datos iniciales

#### Repositories (Implementaciones)
- `repositories/UserRepository.ts` - Implementación con Prisma
- `repositories/MarketItemRepository.ts` - Implementación con Prisma

### 4. Presentation (Presentación)
**Ubicación:** `src/presentation/`

Capa de entrada HTTP, maneja requests y responses.

#### Controllers
- `controllers/UserController.ts` - Controlador de usuarios
- `controllers/MarketController.ts` - Controlador de market
- `controllers/CoincidenciasController.ts` - Controlador de coincidencias

#### Routes
- `routes/users.ts` - Rutas de usuarios
- `routes/market.ts` - Rutas de market
- `routes/coincidencias.ts` - Rutas de coincidencias

## Flujo de Datos

```
HTTP Request
    ↓
Presentation Layer (Routes → Controllers)
    ↓
Application Layer (Use Cases)
    ↓
Domain Layer (Entities + Business Logic)
    ↓
Infrastructure Layer (Repositories → Prisma → PostgreSQL)
    ↓
Database (PostgreSQL)
```

## Principios DDD Aplicados

1. **Separación de Responsabilidades**:**
   - Cada capa tiene una responsabilidad específica
   - El dominio no depende de infraestructura

2. **Inversión de Dependencias:**
   - Las interfaces están en el dominio
   - Las implementaciones están en infraestructura

3. **Entidades Ricas:**
   - Las entidades contienen lógica de negocio
   - Ejemplo: `User.puedeRealizarIntercambio()`

4. **Value Objects:**
   - Objetos inmutables que representan conceptos del dominio
   - Ejemplo: `Currency` para manejo de moneda

5. **Repositories:**
   - Abstraen el acceso a datos
   - Permiten cambiar la implementación sin afectar el dominio

## Ejemplo de Flujo Completo

### Crear Usuario

1. **Request** → `POST /api/users`
2. **Route** → `usersRouter.post('/', UserController.createUser)`
3. **Controller** → `UserController.createUser(req, res)`
4. **Use Case** → `CreateUserUseCase.execute(data)`
5. **Entity** → `User.create(data)` - Validaciones de dominio
6. **Repository** → `UserRepository.save(user)` - Persistencia
7. **Prisma** → `prisma.user.create()` - SQL
8. **Response** → Usuario creado

## Ventajas de esta Arquitectura

- ✅ **Testeable**: Cada capa se puede testear independientemente
- ✅ **Mantenible**: Cambios en una capa no afectan otras
- ✅ **Escalable**: Fácil agregar nuevas funcionalidades
- ✅ **Desacoplada**: El dominio no depende de frameworks
- ✅ **Clara**: Separación clara de responsabilidades
