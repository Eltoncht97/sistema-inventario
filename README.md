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

## Comandos de calidad

```bash
docker compose up -d
npm run lint
npm test
npm run test:e2e
npm run build
```

## Tests e2e

Los tests e2e utilizan una base PostgreSQL desechable e independiente de
desarrollo: `inventory_e2e` en el puerto `5433`. Para ejecutarlos localmente:

```bash
cp .env.e2e.example .env.e2e
npm run test:e2e
npm run db:e2e:down
```

`npm run test:e2e` inicia exclusivamente `postgres-e2e`, espera su healthcheck,
aplica las migraciones existentes mediante `prisma migrate deploy` y ejecuta
Vitest con el entorno e2e cargado antes de importar la aplicación.

Antes de cada test se eliminan primero los balances y luego los productos. El
helper de limpieza se niega a ejecutar eliminaciones salvo que `NODE_ENV` sea
exactamente `test` y que `DATABASE_URL` apunte exactamente a la base
`inventory_e2e`, evitando limpiar accidentalmente la base de desarrollo.

## Dominio

Las reglas, invariantes, casos de uso y límites iniciales están documentados en
[`docs/domain.md`](docs/domain.md).

Las variables `POSTGRES_*` y los valores incluidos en `DATABASE_URL` deben
mantenerse sincronizados.
