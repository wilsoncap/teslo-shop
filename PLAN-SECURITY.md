# Plan de Implementación — Seguridad (AuthN/AuthZ + Hardening) para Teslo-Shop

## 1. Objetivo

Implementar autenticación y autorización robustas en el API de Teslo-Shop, siguiendo las guías oficiales de NestJS (Authentication, Authorization, Encryption & Hashing, Helmet, CORS, CSRF, Rate Limiting), con patrones de producción nivel senior.

## 2. Decisiones de arquitectura (recomendadas)

| Dimensión | Decisión | Justificación |
|---|---|---|
| Autenticación | **Passport + JwtStrategy** (`@nestjs/passport` + `passport-jwt`) | Estándar de la industria; validación centralizada; extensible a otras estrategias. Referencia: capítulo "Passport integration" de los docs. |
| Hashing | **bcrypt** (10–12 rounds) | Recomendado por los docs; maduro y probado. |
| CSRF | **Omitir** (documentar en el `.md`) | El API usa JWT stateless por header `Authorization`, no cookies → CSRF no aplica. Queda anotado cómo activarlo si se migra a cookies. |
| Endpoints `/products` | **GET público + CRUD admin** | Patrón típico de e-commerce: catálogo visible sin login. |
| Rate limiting | **`@nestjs/throttler`** global + límites más estrictos en `/auth/login` | Mitiga fuerza bruta. |
| Hardening HTTP | **Helmet + CORS restringido** | Headers de seguridad + orígenes permitidos. |

## 3. Dependencias a instalar

```
npm i @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt helmet @nestjs/throttler
npm i -D @types/passport-jwt @types/bcrypt
```

(No se instala `csrf-csrf` ni `cookie-parser`: ver decisión CSRF.)

## 4. Variables de entorno (`.env` / `.env.example`)

```env
JWT_SECRET=<clave-secreta-compleja-aleatoria>
JWT_EXPIRES_IN=2h
CORS_ORIGINS=http://localhost:3000,http://localhost:4200
THROTTLE_TTL=60000
THROTTLE_LIMIT=10
```

- `JWT_SECRET` **nunca** se versiona en código (se documenta en `.env.example` vacío).
- `CORS_ORIGINS` como lista separada por comas.

## 5. Estructura de carpetas nueva

```
src/
├─ auth/
│  ├─ decorators/
│  │  ├─ public.decorator.ts        # @Public() → SetMetadata(IS_PUBLIC_KEY, true)
│  │  ├─ roles.decorator.ts         # @Roles(...roles)
│  │  └─ get-user.decorator.ts      # @GetUser() → extrae request.user
│  ├─ guards/
│  │  ├─ jwt-auth.guard.ts          # AuthGuard('jwt') + chequeo de @Public con Reflector
│  │  └─ roles.guard.ts             # Lee @Roles y valida contra user.roles
│  ├─ strategies/
│  │  └─ jwt.strategy.ts            # JwtStrategy (secret + payload → user)
│  ├─ entities/
│  │  ├─ user.entity.ts             # User (TypeORM)
│  │  └─ index.ts
│  ├─ dto/
│  │  ├─ login.dto.ts               # email + password
│  │  └─ create-user.dto.ts         # email, password (min 6), fullName, roles(opcional)
│  ├─ enums/
│  │  └─ role.enum.ts               # Role { User='user', Admin='admin' }
│  ├─ auth.controller.ts            # POST /auth/login, /auth/register, GET /auth/check-status
│  ├─ auth.service.ts               # validateUser, login, register (hash), checkStatus
│  └─ auth.module.ts                # JwtModule.registerAsync + PassportModule + TypeOrmModule.forFeature
└─ common/
   └─ guards/
      └─ throttler-behind-proxy.guard.ts  # Extrae IP real tras proxy
```

## 6. Implementación paso a paso

### 6.1 Entidad `User` (`auth/entities/user.entity.ts`)
- `id` uuid PK
- `email` texto único, normalizado a minúsculas
- `password` `select: false` (nunca se devuelve por defecto)
- `fullName`
- `isActive` boolean default `true`
- `roles` text array default `['user']`
- `@BeforeInsert` para normalizar email

### 6.2 `JwtModule` (`auth.module.ts`)
`JwtModule.registerAsync` leyendo `JWT_SECRET` y `JWT_EXPIRES_IN` desde `ConfigService` (nunca hardcode).

### 6.3 `JwtStrategy` (`strategies/jwt.strategy.ts`)
- `PassportStrategy(Strategy)`, `super({ jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), secretOrKey })`
- `validate(payload)` → devuelve el usuario (o solo `{ id, email, roles }`), se inyecta en `request.user`.

### 6.4 Guard global de autenticación (`guards/jwt-auth.guard.ts`)
- `AuthGuard('jwt')` registrado globalmente vía `APP_GUARD` en `AuthModule`.
- Usa `Reflector` para respetar `@Public()` (como el capítulo "Enable authentication globally").
- Sobre `canActivate` del guard base se añade lógica para cargar usuario activo (`isActive === true`).

### 6.5 Autorización RBAC
- `Role` enum + `@Roles(...)` decorator (`ROLES_KEY`).
- `RolesGuard` global (segundo `APP_GUARD`) que compara roles del usuario con los requeridos por la ruta. Sin metadata → permite.

### 6.6 `AuthService`
- `login(dto)` → busca por email, `bcrypt.compare`, firma JWT con payload `{ sub: user.id, email }`, devuelve `{ token, user }`.
- `register(dto)` → `bcrypt.hash(password, 10)` y persiste.
- `checkStatus(user)` → valida token vigente y re-firma JWT (renovación implícita).

### 6.7 `AuthController`
- `POST /api/auth/login` → `@Public()` + `@HttpCode(200)`
- `POST /api/auth/register` → `@Public()`
- `GET /api/auth/check-status` → protegido

### 6.8 Proteger `/products`
- `@Public()` en `GET` (listar y por término) del `ProductsController`.
- `@Roles(Role.Admin)` en `POST`, `PATCH`, `DELETE`.

### 6.9 Rate limiting
- `ThrottlerModule.forRootAsync` con `ConfigService` (TTL/limit desde env).
- `ThrottlerBehindProxyGuard` global (segundo guard en `common/`), con `trust proxy` en `main.ts`.
- `@Throttle({ default: { limit: 5, ttl: 60000 } })` en `POST /auth/login` (más estricto contra brute force).

### 6.10 `main.ts`
- `helmet()` **antes** de otros `app.use`.
- `app.enableCors({ origin: CORS_ORIGINS.split(','), credentials: true })`.
- `app.set('trust proxy', 'loopback')`.
- Mantener `setGlobalPrefix('api')` y `ValidationPipe`.

### 6.11 Seed de usuarios (`seed/`)
- Añadir al seed 2–3 usuarios con passwords hasheados (admin + user regular) para pruebas.
- `SeedModule` importa `AuthModule` (que exporta `User` repo).

## 7. Verificación

1. `npm run build` sin errores.
2. `npm run lint` sin errores.
3. Probar manualmente:
   - `POST /api/auth/login` → token.
   - `GET /api/products` sin token → 200 (público).
   - `POST /api/products` sin token → 401.
   - `POST /api/products` con token de user → 403.
   - `POST /api/products` con token de admin → 201.
   - `GET /api/auth/check-status` con token → 200.
   - 6 intentos rápidos a `/auth/login` → 429.

## 8. Nota CSRF (documentada)

El CSRF no aplica porque: (a) autenticación stateless vía header `Authorization`, (b) sin cookies de sesión. Si en el futuro se migra a auth por cookies, activar `csrf-csrf` + `cookie-parser` antes del enrutado y exponer un endpoint de token. Referencia: docs.nestjs.com/security/csrf.

## 9. Referencias

- https://docs.nestjs.com/security/authentication
- https://docs.nestjs.com/security/authorization
- https://docs.nestjs.com/security/encryption-and-hashing
- https://docs.nestjs.com/security/helmet
- https://docs.nestjs.com/security/cors
- https://docs.nestjs.com/security/csrf
- https://docs.nestjs.com/security/rate-limiting
