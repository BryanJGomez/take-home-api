# Take Home API

<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

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
cd take-home-api
```

### 2. Configurar variables de entorno

Crea un archivo `.env` en la raíz del proyecto:

```bash
cp .env.example .env
```


### 3. Instalar dependencias (para VS Code IntelliSense)

> **Nota**: Las dependencias se instalan automáticamente en el contenedor Docker, pero es recomendable instalarlas localmente para evitar errores de linting y autocompletado en VS Code.

```bash
npm install
```

### 4. Construir y ejecutar con Docker

```bash
# Construir e iniciar todos los servicios
docker-compose up --build

# Solo construir la aplicación
docker-compose up app --build

# Ejecutar en background
docker-compose up -d
```

La aplicación estará disponible en:

- **API**: http://localhost:3000
- **Swagger**: http://localhost:3000/api
- **PostgreSQL**: localhost:5433
