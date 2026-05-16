# GitHub Actions

El workflow de CI está en:

```text
.github/workflows/ci.yml
```

## Cuándo Se Ejecuta

Se ejecuta en:

- `push` a `main`
- `push` a `dev`
- `pull_request` hacia `main`
- `pull_request` hacia `dev`

## Jobs

### Backend build

Directorio de trabajo:

```text
backend/
```

Pasos:

```bash
npm ci
npm run build
```

El build del backend ejecuta:

```bash
prisma generate && tsc
```

Esto valida:

- Dependencias instalables desde `package-lock.json`.
- Prisma Client generable.
- TypeScript sin errores.

### Frontend build

Directorio de trabajo:

```text
frontend/
```

Pasos:

```bash
npm ci
npm run build
```

El build del frontend ejecuta:

```bash
tsc -b && vite build
```

Esto valida:

- Dependencias instalables desde `package-lock.json`.
- TypeScript sin errores.
- Build de Vite generable.

## Qué No Hace

El workflow no despliega a producción.

Los despliegues siguen delegados a:

- Vercel para frontend.
- Railway para backend.

## Regla Recomendada

Antes de hacer merge a `main`, el PR debe tener el workflow en verde.
