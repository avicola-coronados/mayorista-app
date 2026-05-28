# Deploy del frontend en Vercel (GitHub Actions)

El workflow `.github/workflows/deploy-frontend-vercel.yml` despliega el frontend a producción cuando hay push a `main` con cambios en `frontend/`.

## Secrets obligatorios en GitHub

El workflow lee **`secrets.VERCEL_*`** (Secrets, con candado). No sirven si los guardaste solo como **Variables** (`vars.VERCEL_*`).

Puedes crearlos en el **repositorio** o en la **organización**. Si usas secrets de organización, GitHub **no los pasa al workflow** hasta que des acceso a este repo.

| Secret | Descripción |
|--------|-------------|
| `VERCEL_TOKEN` | Token de acceso de Vercel |
| `VERCEL_ORG_ID` | ID del equipo (o usuario) en Vercel |
| `VERCEL_PROJECT_ID` | ID del proyecto del frontend |

### Repositorio

**Settings → Secrets and variables → Actions → New repository secret**.

### Organización (tu caso)

1. **Organization → Settings → Secrets and variables → Actions → New organization secret**.
2. Crea los tres con los nombres exactos de la tabla.
3. En cada secret, en **Repository access**, elige **Selected repositories** e incluye `mayorista-app`, o **All repositories** si aplica a todo el org.
4. En el repo: **Settings → Secrets and variables → Actions → Organization secrets** y confirma que aparecen los tres.

Si el secret existe en la org pero el job dice que falta, casi siempre es que el repositorio **no está en la lista de acceso** del secret.

Sin estos tres secrets, el paso **Deploy to Vercel** falla con:

`Error: Input required and not supplied: vercel-token`

### 1. Crear `VERCEL_TOKEN`

1. Entra en [vercel.com/account/tokens](https://vercel.com/account/tokens).
2. **Create** → nombre descriptivo (ej. `github-actions-mayorista`).
3. Copia el token y guárdalo como secret `VERCEL_TOKEN` en GitHub (solo se muestra una vez).

### 2. Obtener `VERCEL_ORG_ID` y `VERCEL_PROJECT_ID`

En Vercel **no verás un campo llamado "ORG_ID"**. En GitHub el secret `VERCEL_ORG_ID` debe ser uno de estos valores según tu cuenta:

| Tipo de cuenta en Vercel | Qué copiar | Dónde está en el dashboard |
|--------------------------|------------|----------------------------|
| **Cuenta personal** (Hobby, sin equipo) | **User ID** | [vercel.com/account](https://vercel.com/account) → pestaña que lleve a ajustes de cuenta → **General** → al final, **User ID** (suele empezar con `team_` en cuentas antiguas o ser un id alfanumérico) |
| **Team / empresa** | **Team ID** | Selector de equipo (arriba) → elige tu team → **Settings** → **General** → al final, **Team ID** |

URL directa del team (cambia `TU_EQUIPO` por el slug del equipo):

`https://vercel.com/teams/TU_EQUIPO/settings`

También puedes ir a: menú del avatar → **Team Settings** → **General** → **Team ID**.

**`VERCEL_PROJECT_ID`**

1. En el dashboard, selecciona el **mismo team** (o tu cuenta personal) donde está el proyecto del frontend.
2. Abre el proyecto → **Settings** → **General**.
3. Al final verás **Project ID** (empieza con `prj_`). Ese valor es `VERCEL_PROJECT_ID`.

**Opción más fácil — CLI (recomendado)**

Si ya tienes el proyecto en Vercel, enlázalo una vez en local:

```bash
cd frontend
npx vercel login
npx vercel link
```

Elige el scope correcto (tu usuario o tu team) y el proyecto existente. Luego:

```bash
cat .vercel/project.json
```

Ejemplo de salida:

```json
{
  "orgId": "team_xxxxxxxxxxxxxxxx",
  "projectId": "prj_xxxxxxxxxxxxxxxx"
}
```

- `orgId` → secret **`VERCEL_ORG_ID`**
- `projectId` → secret **`VERCEL_PROJECT_ID`**

> No subas `.vercel/` al repositorio. Los IDs van solo en GitHub Secrets.

**Si el proyecto está en un Team y usas la cuenta personal por error**, `vercel link` puede enlazar mal el scope; vuelve a ejecutar `vercel link` y elige el **team** en el primer paso.

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
