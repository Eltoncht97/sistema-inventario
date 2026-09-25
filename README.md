# Sistema de inventario

Base de una API de inventario construida con NestJS, PostgreSQL y Prisma ORM 7.

## Requisitos

- Node.js 20.19 o superior
- npm
- Docker con Docker Compose

## Configuración inicial

1. Crea tu archivo de entorno local:

   ```bash
   cp .env.example .env
   ```

2. Ajusta las credenciales de `.env` y luego instala las dependencias:

   ```bash
   npm install
   ```

   La instalación genera automáticamente Prisma Client.

3. Inicia PostgreSQL:

   ```bash
   docker compose up -d
   ```

4. Inicia la API en modo desarrollo:

   ```bash
   npm run start:dev
   ```

5. Comprueba el estado del backend:

   ```bash
   curl http://localhost:3000/health
   ```

   Respuesta esperada:

   ```json
   { "status": "ok" }
   ```

Para detener PostgreSQL sin eliminar sus datos:

```bash
docker compose stop
```

## Prisma

El esquema está en `prisma/schema.prisma` y la configuración de Prisma 7 está en
`prisma7.config.ts`. El cliente generado se guarda en `src/generated/prisma` y no
se versiona.

```bash
# Regenerar Prisma Client
npm run prisma:generate

# Crear y aplicar una migración durante el desarrollo
npm run prisma:migrate -- --name nombre_de_la_migracion

# Abrir Prisma Studio
npm run prisma:studio
```

Todavía no hay modelos ni migraciones: están listos para agregarse cuando se
defina el dominio del proyecto.

## Comandos de calidad

```bash
docker compose up -d
npm run lint
npm test
npm run test:e2e
npm run build
```
