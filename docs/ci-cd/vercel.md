# Deploy del frontend en Vercel (GitHub Actions)

El workflow `.github/workflows/deploy-frontend-vercel.yml` despliega el frontend a producción cuando hay push a `main` con cambios en `frontend/`.

## Secrets obligatorios en GitHub

En el repositorio de GitHub: **Settings → Secrets and variables → Actions → New repository secret**.

| Secret | Descripción |
|--------|-------------|
| `VERCEL_TOKEN` | Token de acceso de Vercel |
| `VERCEL_ORG_ID` | ID del equipo (o usuario) en Vercel |
| `VERCEL_PROJECT_ID` | ID del proyecto del frontend |

Sin estos tres secrets, el paso **Deploy to Vercel** falla con:

`Error: Input required and not supplied: vercel-token`

### 1. Crear `VERCEL_TOKEN`

1. Entra en [vercel.com/account/tokens](https://vercel.com/account/tokens).
2. **Create** → nombre descriptivo (ej. `github-actions-mayorista`).
3. Copia el token y guárdalo como secret `VERCEL_TOKEN` en GitHub (solo se muestra una vez).

### 2. Obtener `VERCEL_ORG_ID` y `VERCEL_PROJECT_ID`

**Opción A — desde la CLI (recomendado)**

En la máquina local, con el proyecto ya enlazado a Vercel:

```bash
cd frontend
npx vercel link
cat .vercel/project.json
```

En el JSON verás `orgId` y `projectId`. Cópialos a los secrets `VERCEL_ORG_ID` y `VERCEL_PROJECT_ID`.

**Opción B — desde el dashboard**

1. Abre el proyecto en [vercel.com](https://vercel.com).
2. **Settings → General**: el **Project ID** es `VERCEL_PROJECT_ID`.
3. Para el **Team / Org ID**: en la URL del equipo o en **Team Settings → General** (también aparece en `.vercel/project.json` tras `vercel link`).

> No subas `.vercel/` al repositorio; está en `.gitignore`. Los IDs van solo en GitHub Secrets.

## Variable de entorno del build

En **Settings → Secrets and variables → Actions → Variables** (no secrets):

| Variable | Ejemplo | Uso |
|----------|---------|-----|
| `VITE_API_URL` | `https://tu-api.railway.app` | URL del backend en el build de producción |

## Comprobar el deploy

1. Configura los tres secrets y `VITE_API_URL`.
2. Haz push a `main` con un cambio en `frontend/` (o re-ejecuta el workflow desde **Actions**).
3. El job **Production deploy** debe completar el paso **Deploy to Vercel** sin errores.

## Relación con la integración Git de Vercel

Si el repo también está conectado en el dashboard de Vercel, pueden coexistir dos despliegues en el mismo push. Este workflow permite fijar `VITE_API_URL` desde GitHub y hacer build + deploy en un solo job. Si prefieres solo la integración nativa de Vercel, puedes desactivar o eliminar el workflow; en ese caso define `VITE_API_URL` en **Vercel → Project → Settings → Environment Variables**.
