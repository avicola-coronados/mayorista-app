# Railway

Railway se usa para desplegar el backend Node/Express y alojar la base de datos PostgreSQL.

## Estructura En Railway

El proyecto tiene dos servicios principales:

```text
Postgres
mayorista-app
```

### `Postgres`

Servicio administrado por Railway.

Responsabilidades:

- Alojar la base de datos PostgreSQL.
- Proveer la variable `DATABASE_URL`.
- Mantener persistencia mediante volumen administrado por Railway.

### `mayorista-app`

Servicio de aplicación conectado al repositorio GitHub.

Responsabilidades:

- Construir el backend.
- Ejecutar el servidor Express.
- Exponer el API público.

El servicio apunta al directorio:

```text
backend/
```

## Builder

Railway usa Nixpacks.

El backend tiene configuración explícita en:

```text
backend/nixpacks.toml
```

Configuración actual:

```toml
[phases.install]
cmds = ["npm ci"]

[phases.build]
cmds = ["npm run build"]

[start]
cmd = "npm start"
```

Esto significa:

1. Railway instala dependencias con `npm ci`.
2. Ejecuta el build del backend.
3. Levanta el servidor con `npm start`.

## Scripts Del Backend

Archivo:

```text
backend/package.json
```

Scripts importantes:

```json
{
  "build": "prisma generate && tsc",
  "start": "prisma migrate deploy && node dist/index.js",
  "db:deploy": "prisma migrate deploy"
}
```

El build genera Prisma Client y compila TypeScript.

El start aplica migraciones pendientes y luego ejecuta el archivo compilado:

```text
prisma migrate deploy
backend/dist/index.js
```

Motivo: `DATABASE_URL` normalmente apunta al host privado `postgres.railway.internal`. Ese host no siempre está disponible durante la fase de build de Nixpacks, pero sí durante el arranque del servicio desplegado.

## Networking

El backend escucha usando:

```ts
app.listen(PORT, "0.0.0.0")
```

Esto es importante porque Railway necesita que el servicio escuche en todas las interfaces, no solo en `localhost`.

La URL pública actual del backend sigue este formato:

```text
https://mayorista-app-production.up.railway.app
```

En Public Networking, el puerto publicado debe coincidir con el `PORT` usado por la app.

## Variables De Entorno

Variables importantes del servicio `mayorista-app`:

```text
DATABASE_URL
JWT_SECRET
FRONTEND_URLS
APP_TIMEZONE
PORT
```

### `DATABASE_URL`

Debe apuntar al servicio Postgres de Railway.

Puede ser una referencia interna de Railway, por ejemplo:

```text
${{Postgres.DATABASE_URL}}
```

### `JWT_SECRET`

Se usa para firmar tokens de login.

Debe mantenerse privado y no debe subirse al repo.

### `FRONTEND_URLS`

Controla CORS.

Debe incluir el dominio de producción de Vercel y, si se usan previews, un patrón compatible:

```text
https://mayorista-app-olive.vercel.app,https://mayorista-*.vercel.app
```

Si esta variable no incluye el dominio correcto, el login puede fallar por CORS.

### `APP_TIMEZONE`

Zona horaria del negocio:

```text
America/Lima
```

### `PORT`

Puerto donde escucha Express.

Si se configura manualmente, debe coincidir con Public Networking en Railway.

## Deploy Automático

Railway está conectado a GitHub.

Flujo básico:

1. Se hace push a la rama configurada.
2. Railway detecta el commit.
3. Ejecuta Nixpacks.
4. Instala dependencias.
5. Compila backend.
6. Ejecuta `npm start`.
7. Reemplaza el deployment activo si el nuevo arranca correctamente.

## Migraciones

El deploy de Railway aplica migraciones automáticamente al arrancar el backend, porque `npm start` ejecuta:

```bash
prisma migrate deploy && node dist/index.js
```

Si hay cambios en:

```text
backend/prisma/schema.prisma
backend/prisma/migrations/
```

quedan aplicados en el siguiente deploy del backend.

También se puede ejecutar manualmente:

```bash
npm run db:deploy
```

Ese script equivale a:

```bash
prisma migrate deploy
```

Punto importante: no usar `prisma migrate dev` en producción.

## Usuarios Base

El backend ejecuta un bootstrap al arrancar para asegurar usuarios base del sistema. Esto evita tener que crear usuarios manualmente en la base de datos de Railway después de un deploy.

Archivo:

```text
backend/src/bootstrap/default-users.ts
```

Usuarios asegurados:

```text
admin
operario
cajero
```

Comportamiento:

- Si el usuario no existe, lo crea con contraseña por defecto.
- Si el usuario ya existe, lo mantiene activo y asegura su rol.
- No sobrescribe la contraseña de usuarios existentes.
- Solo gestiona usuarios base; no crea datos demo de clientes, granjas o jornadas.

Contraseñas por defecto:

```text
admin: admin2024
operario: coronados2024
cajero: coronados2024
```

Se pueden cambiar desde variables de entorno antes de crear los usuarios:

```text
DEFAULT_ADMIN_USERNAME
DEFAULT_ADMIN_PASSWORD
DEFAULT_OPERARIO_USERNAME
DEFAULT_OPERARIO_PASSWORD
DEFAULT_CAJERO_USERNAME
DEFAULT_CAJERO_PASSWORD
```

Después de cambiar una contraseña desde la pantalla de administración, el bootstrap no la pisa en siguientes deploys.

## CORS

El backend lee:

```text
FRONTEND_URLS
```

y permite solo esos orígenes.

Síntomas de mala configuración:

- Login falla desde Vercel.
- Consola del navegador muestra error de CORS.
- La API funciona desde Railway pero no desde frontend.

## Health Check

El backend expone:

```text
GET /api/health
```

Respuesta esperada:

```json
{
  "ok": true
}
```

También existe:

```text
GET /
```

que responde con información básica del servicio.

## Aspectos Importantes A Considerar

- Railway debe desplegar el commit correcto. Revisar el hash del deployment si algo no coincide.
- Si el backend devuelve `502`, revisar primero Deploy Logs y luego HTTP Logs.
- Si el deploy está activo pero todas las rutas devuelven `502`, revisar puerto y `0.0.0.0`.
- Si el build falla con Prisma, revisar `DATABASE_URL` y que `prisma generate` pueda ejecutarse.
- Si el login falla, revisar `FRONTEND_URLS`, `JWT_SECRET` y conectividad con Postgres.
- Si hay cambios de schema, aplicar migraciones antes de probar funcionalidades nuevas.
- No guardar secretos en `.env.example`, README ni documentación.

## Validación Rápida

Después de un deploy:

```text
GET https://mayorista-app-production.up.railway.app/api/health
```

Luego probar login desde Vercel.
