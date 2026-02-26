# VibePeak Image Processing API Gateway

<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

## Descripción

Public REST API gateway for an async image processing service. Built with NestJS 11, TypeORM, and PostgreSQL.

## Prerrequisitos

Antes de comenzar, asegúrate de tener instalado:

- **Docker** >= 20.0
- **Docker Compose** >= 2.0
- **Git**
- **VS Code** (recomendado para aprovechar las tasks configuradas)

## Setup inicial

### 1. Clonar el repositorio

```bash
git clone git@github.com:BryanJGomez/take-home-api.git
cd contentful-products-api
```

### 2. Configurar variables de entorno

Crea un archivo `.env` en la raíz del proyecto:

```bash
cp .env.example .env
```

### 3. Construir y ejecutar con Docker

```bash
# Construir e iniciar todos los servicios
docker-compose up --build

# Solo construir la aplicación
docker-compose up app --build

# Ejecutar en background
docker-compose up -d
```

La aplicación estará disponible en:

- **API**: http://localhost:3000/api
- **Swagger Docs**: http://localhost:3000/docs
- **Health Check**: http://localhost:3000/api/health

## Base de datos y migraciones

### Ejecutar migraciones

```bash
# Ejecutar todas las migraciones pendientes
docker-compose run --rm app npm run migration:run

# Ejecutar seeders para poblar datos de prueba
docker-compose run --rm app npm run seed

# Ejecutar migraciones y seeders
docker-compose run --rm app npm run migration:run:seed
```

### Crear nueva migración

```bash
# Generar migración basada en cambios en entidades
docker-compose run --rm app npm run migration:generate -- src/database/migrations/NombreDeLaMigracion

# Crear migración vacía
docker-compose run --rm app npm run typeorm -- migration:create src/database/migrations/NombreDeLaMigracion
```

### Revertir migración

```bash
# Revertir la última migración
docker-compose run --rm app npm run migration:revert
```

## Demo API Keys

después de correr los seeders, puedes usar las siguientes API keys para probar la autenticación y funcionalidades:

| User       | Plan  | Credits | API Key                 |
| ---------- | ----- | ------- | ----------------------- |
| Basic User | basic | 10      | `pk_basic_test_key_001` |
| Pro User   | pro   | 100     | `pk_pro_test_key_001`   |

## API Endpoints

### `POST /api/v1/jobs` - Create a processing job

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

Response (202):

```json
{
  "jobId": "job_a1b2c3d4-...",
  "status": "queued",
  "statusUrl": "/v1/jobs/job_a1b2c3d4-...",
  "createdAt": "2026-02-25T00:00:00.000Z"
}
```

### `GET /api/v1/jobs/:id` - Get job status

```bash
curl http://localhost:3000/api/v1/jobs/job_a1b2c3d4-... \
  -H "Authorization: Bearer pk_pro_test_key_001"
```
