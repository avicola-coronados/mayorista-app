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
6. Si hay cambios de base de datos, se deben aplicar migraciones Prisma con `prisma migrate deploy`.

## Ramas

- `dev`: rama de trabajo y validación previa.
- `main`: rama estable conectada a producción.

## Archivos Relevantes

- `.github/workflows/ci.yml`: validación de builds en GitHub Actions.
- `vercel.json`: configuración de build y rewrites SPA para Vercel.
- `frontend/vercel.json`: fallback SPA si Vercel usa `frontend` como root directory.
- `backend/package.json`: scripts de build, start y migraciones del backend.
- `frontend/package.json`: scripts de build del frontend.

## Responsabilidades

GitHub Actions no despliega directamente. Su función es detectar errores antes o durante el push:

- Instala dependencias del backend.
- Ejecuta `npm run build` en backend.
- Instala dependencias del frontend.
- Ejecuta `npm run build` en frontend.

Vercel y Railway siguen siendo los responsables del despliegue.
