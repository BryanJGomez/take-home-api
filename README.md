# VibePeak Image Processing API Gateway

<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

## Descripcion

API REST publica que gestiona trabajos de procesamiento de imagenes de forma asincrona. Construida con NestJS 11, TypeORM y PostgreSQL.

La API actua como gateway entre los desarrolladores externos y un servicio interno de procesamiento (mock). Se encarga de autenticacion, facturacion por creditos, idempotencia, limites de concurrencia por plan, y entrega de resultados via webhooks firmados.

## Prerrequisitos

- **Docker** >= 20.0
- **Docker Compose** >= 2.0
- **Git**

## Como ejecutar

```bash
# 1. Clonar el repositorio
git clone git@github.com:BryanJGomez/take-home-api.git
cd take-home-api

# 2. Configurar variables de entorno
cp .env.example .env

# 3. Levantar todo con Docker
docker compose up --build

# 4. En otra terminal, ejecutar migraciones y seeders
docker compose run --rm app npm run migration:run:seed
```

La aplicacion estara disponible en:

- **API**: http://localhost:3000/api/v1/
- **Swagger Docs**: http://localhost:3000/docs
- **Health Check**: http://localhost:3000/api/v1/health

## API Keys de prueba

Despues de correr los seeders, puedes usar las siguientes API keys:

| Usuario    | Plan  | Creditos | API Key                 |
| ---------- | ----- | -------- | ----------------------- |
| Basic User | basic | 10       | `pk_basic_test_key_001` |
| Pro User   | pro   | 100      | `pk_pro_test_key_001`   |

## Endpoints

### `POST /api/v1/jobs` — Crear un trabajo

```bash
curl -X POST http://localhost:3000/api/v1/jobs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer pk_pro_test_key_001" \
  -H "Idempotency-Key: my-unique-key-123" \
  -d '{
    "imageUrl": "https://picsum.photos/200/300",
    "webhookUrl": "https://example.com/webhook"
  }'
```

Response (202 Accepted):

```json
{
  "jobId": "a1b2c3d4-...",
  "status": "queued",
  "statusUrl": "/api/v1/jobs/a1b2c3d4-...",
  "createdAt": "2026-02-25T00:00:00.000Z"
}
```

### `GET /api/v1/jobs/:id` — Consultar estado

```bash
curl http://localhost:3000/api/v1/jobs/a1b2c3d4-... \
  -H "Authorization: Bearer pk_pro_test_key_001"
```

### `POST /api/v1/internal/callback` — Callback interno (solo servicio de procesamiento)

```bash
curl -X POST http://localhost:3000/api/v1/internal/callback \
  -H "Content-Type: application/json" \
  -H "X-Internal-Secret: take-home-secret" \
  -d '{
    "jobId": "a1b2c3d4-...",
    "status": "completed",
    "resultUrl": "https://storage.example.com/resultado.jpg"
  }'
```

## Tests

```bash
# Ejecutar tests unitarios
docker compose run --rm app npm test

# Ejecutar tests con watch
docker compose run --rm app npm run test:watch

# Ejecutar con cobertura
docker compose run --rm app npm run test:cov
```

## Arquitectura

### Flujo de un job

```
Cliente
  │
  ▼
POST /api/v1/jobs
  │
  ├─ ApiKeyGuard ──────────── Autenticacion (SHA-256 hash lookup)
  ├─ IdempotencyInterceptor ─ Cache de respuestas por Idempotency-Key
  ├─ ValidationPipe ───────── Validacion del body (class-validator)
  │
  ▼
JobsService
  │
  ├─ 1. Validacion SSRF ──── Resolucion DNS + check rangos privados
  ├─ 2. Transaccion atomica:
  │     ├─ Lock pesimista en la fila del usuario
  │     ├─ Verificar limite de concurrencia (basic=1, pro=5)
  │     ├─ Verificar creditos >= 1
  │     ├─ Descontar 1 credito
  │     └─ Crear registro del job
  ├─ 3. Despachar al mock (fire-and-forget)
  │     └─ Si falla: reembolsar credito + marcar job como failed
  │
  ▼
202 Accepted { jobId, status, statusUrl, createdAt }

────────── 3-5 segundos despues ──────────

Mock Processing Service
  │
  ▼
POST /api/v1/internal/callback
  │
  ├─ InternalCallbackGuard ── Validacion por shared secret
  │
  ▼
CallbackService
  ├─ 1. Actualizar job (completed/failed)
  └─ 2. Entregar webhook al cliente:
        ├─ Firmar con HMAC-SHA256 (X-Signature + X-Timestamp)
        └─ Reintentar hasta 3 veces con backoff (1s, 2s, 4s)
            ├─ Reintentar errores 5xx y de red
            └─ NO reintentar errores 4xx
```

### Estructura de modulos

```
src/
├── common/          # Guards, interceptors, filtros, validadores, HTTP client
├── config/          # Validacion y acceso tipado a variables de entorno
├── database/        # Configuracion TypeORM, migraciones, seeders
├── utils/           # Logger (Winston), helpers
└── app/
    ├── auth/        # API key entity, repositorio, servicio de validacion
    ├── users/       # Entidad de usuario, creditos, planes
    ├── jobs/        # Creacion y consulta de jobs (logica principal)
    ├── idempotency/ # Almacenamiento y consulta de claves de idempotencia
    ├── callback/    # Endpoint interno para resultados del procesamiento
    ├── webhook/     # Firma HMAC y entrega de webhooks con retry
    └── dispatcher/  # Interfaz + mock del servicio de procesamiento
```

## Nota de arquitectura

### Decisiones clave

**Pessimistic locking para créditos y concurrencia**
Uso `SELECT ... FOR UPDATE` dentro de una transacción para serializar requests concurrentes del mismo usuario. Garantiza que nunca se cobre de más ni se exceda el límite de concurrencia. El trade-off es rendimiento bajo alta carga del mismo usuario — una decisión consciente: en facturación la consistencia vale más que el throughput.

**Abstracción del dispatcher**
El mock usa `setTimeout` para simular procesamiento asíncrono. Los jobs se pierden si el servidor se reinicia, pero el challenge pide un mock, no durabilidad real. Lo importante es que la interfaz `IProcessingDispatcher` permite migrar a BullMQ, Cloud Tasks o SQS cambiando solo una clase sin tocar el resto del código.

**SHA-256 para API keys**
Las API keys son tokens de alta entropía generados por el sistema, no passwords de usuario. SHA-256 es suficiente — es rápido (se ejecuta en cada request) y determinista (permite buscar por hash en DB). bcrypt añadiría latencia sin beneficio real de seguridad en este caso.

**NestJS sobre Express/Fastify puro**
El sistema de módulos, guards e interceptors de NestJS permite aislar concerns claramente: auth, idempotencia, validación SSRF y webhooks viven cada uno en su propio módulo. El trade-off es más boilerplate inicial, que se amortiza rápido en mantenibilidad.

---


### Qué haría con más tiempo

**Tests de integración end-to-end** — Un test que levante la app, cree un job, espere el callback del mock y verifique la entrega del webhook. Es lo que más valor aportaría y lo primero que haría.

**Cola real para el dispatcher** — Migrar de `setTimeout` a BullMQ + Redis para tener persistencia y visibilidad sobre jobs pendientes. La interfaz ya está preparada para esto.

**Circuit breaker en el dispatcher** — Si el servicio de procesamiento falla N veces seguidas, cortar automáticamente y devolver 503 sin saturarlo más.

**Dead-letter queue para webhooks** — Los webhooks que agoten los reintentos deberían ir a una cola muerta con un endpoint admin para reintentar manualmente.

**Rate limiting por API key** — Throttling global (ej. 100 req/min) además de los límites de concurrencia por plan.
