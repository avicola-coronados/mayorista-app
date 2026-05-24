# Flujo CI/CD

Este proyecto usa un flujo CI/CD híbrido:

- GitHub Actions valida que el código compile.
- Vercel despliega el frontend.
- Railway despliega el backend y aloja PostgreSQL.

## Resumen

1. El desarrollador hace cambios localmente.
2. Sube cambios a GitHub con `git push`.
3. GitHub Actions ejecuta el workflow de CI.
4. Vercel detecta cambios en la rama configurada y despliega el frontend.
5. Railway detecta cambios en la rama configurada y despliega el backend.
6. Si hay cambios de base de datos, Railway aplica las migraciones Prisma pendientes al arrancar el backend.

## Ramas

- `dev`: rama de trabajo y validación previa.
- `main`: rama estable conectada a producción.

## Archivos relevantes

- `.github/workflows/ci.yml`: validación de builds en GitHub Actions.
- `vercel.json` / `frontend/vercel.json`: build y rewrites SPA para Vercel.
- `backend/package.json`: scripts de build, start y migraciones.
- `backend/nixpacks.toml`: build en Railway.
- `backend/prisma/schema.prisma` y `backend/prisma/migrations/`: modelo de datos.
- `README.md`: guía general del proyecto, roles y endpoints.
- `docs/ci-cd/database.md`: referencia del modelo Prisma.
- `docs/ci-cd/railway.md`: deploy del backend y variables de entorno.

## Responsabilidades

GitHub Actions no despliega directamente. Su función es detectar errores antes o durante el push:

- Instala dependencias del backend.
- Ejecuta pruebas del backend.
- Ejecuta `npm run build:ci` en backend.
- Instala dependencias del frontend.
- Ejecuta pruebas del frontend.
- Ejecuta `npm run build` en frontend.

Vercel y Railway siguen siendo los responsables del despliegue.

Nota: el build de CI no ejecuta migraciones ni necesita conexión a PostgreSQL. En Railway, `npm start` ejecuta `prisma migrate deploy` antes de levantar `node dist/index.js`.
