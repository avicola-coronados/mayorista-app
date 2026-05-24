# Coronados Avícola

Aplicación web para control diario de ventas mayoristas de Coronados Avícola. El monorepo está dividido en `frontend/` y `backend/`, sin Docker, con PostgreSQL nativo.

## Stack

- **Frontend:** React 18, Vite, TailwindCSS, React Query, Zustand, React Router
- **Backend:** Node.js 20, Express, TypeScript, Prisma ORM
- **Base de datos:** PostgreSQL 16
- **Deploy:** Vercel (frontend), Railway (backend + PostgreSQL)

## Colores corporativos

| Token Tailwind | Hex | Uso |
| --- | --- | --- |
| `coronados-orange` | `#E8471A` | Acciones primarias, tabs activos, marca |
| `coronados-green` | `#2E8B3A` | Totales, pagos, confirmaciones |

## Estructura

```text
mayorista-app/
├── frontend/          # React + Vite
├── backend/           # Express + Prisma
├── docs/              # Documentación técnica
│   ├── ci-cd/         # Deploy, CI, base de datos
│   └── technical-debt.md
├── .github/workflows/ # GitHub Actions
└── README.md
```

## Roles y rutas

| Rol | Login redirige a | Funcionalidad principal |
| --- | --- | --- |
| `operario` | `/pesada/nueva` | Ingreso de pesadas en guías, devoluciones, cierre de jornada |
| `cajero` | `/cajero/clientes` | Consulta de clientes, facturas/guías (solo lectura), pagos, egresos |
| `admin` | `/admin` | Jornadas, clientes, granjas, usuarios, correcciones |
| `oficina` | *(sin UI aún)* | API de precios preparada; configuración vía endpoints |

### Rutas frontend

**Operario**

- `/pesada/nueva` — Ingreso de pesadas en guía (cliente → guía borrador → líneas → cerrar)
- `/operario/guias` — Listado de guías de la jornada activa
- `/operario/devolucion` — Registro de devoluciones
- `/clientes` — Listado de clientes del día
- `/cierre` — Historial / cierre de jornada

**Cajero**

- `/cajero/clientes` — Listado de clientes con saldo
- `/cajero/clientes/:id` — Detalle: Estado de cuenta \| Facturas y guías
- `/cajero/clientes/:id/guias/:guiaId` — Detalle de guía (solo lectura)
- `/cajero/egresos` — Registro de egresos de caja

**Admin**

- `/admin` — Dashboard
- `/admin/jornadas`, `/admin/clientes`, `/admin/granjas`, `/admin/usuarios`

## Requisitos previos

- Node.js 20.x
- npm 10+
- PostgreSQL 16 ejecutándose localmente

## Variables de entorno

### Backend: `backend/.env`

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/coronados_db?schema=public"
JWT_SECRET="super-secret-change-me"
PORT=3000
FRONTEND_URL="http://localhost:5173"
APP_TIMEZONE="America/Lima"
```

### Frontend: `frontend/.env`

```env
VITE_API_URL="http://localhost:3000"
```

## Setup paso a paso

### 1. Instalar dependencias

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 2. Preparar la base de datos

Desde `backend/`:

```bash
npm run prisma:generate
npx prisma migrate dev
npm run db:seed
```

Al arrancar el backend también se ejecutan bootstraps de usuarios, producto default y precio vigente inicial.

### 3. Levantar en desarrollo

```bash
# Terminal 1 — backend (http://localhost:3000)
cd backend && npm run dev

# Terminal 2 — frontend (http://localhost:5173)
cd frontend && npm run dev
```

## Usuarios y seed

### Usuarios base (bootstrap al arrancar backend)

| Usuario | Contraseña | Rol |
| --- | --- | --- |
| `admin` | `admin2024` | admin |
| `operario` | `coronados2024` | operario |
| `cajero` | `coronados2024` | cajero |
| `oficina` | `coronados2024` | oficina |

Variables opcionales: `DEFAULT_*_USERNAME` / `DEFAULT_*_PASSWORD` por rol.

### Seed manual (`npm run db:seed`)

- Granjas: Redondos 1, Redondos 2, San Fernando, Piso
- Clientes: PIZARRO, MILAGROS, PERCY, MARINO, NAVARRO
- Jornada de hoy en estado `abierta`
- Entrada de granja de ejemplo
- Producto `POLLO_VIVO` y precio vigente **S/ 5.00/kg** si no existe

## Flujos implementados

### Operario — Ingreso de pesadas (guías)

1. Seleccionar o crear cliente
2. Abrir/crear guía en borrador para la jornada activa
3. Registrar pesadas (jabas, peso bruto, tara, devolución, peladuría)
4. Cálculos automáticos con precio vigente del día (operario no ve el precio)
5. Editar/eliminar líneas mientras la guía está en borrador
6. Cerrar guía → redirige al listado de guías del día

Tara por defecto en guías: **6 kg × n° jabas** (editable).

### Cajero — Facturas y guías

- Tabs: **Estado de cuenta** (pagos) \| **Facturas y guías** (consulta)
- Cards: Total facturado, Total pagado, Saldo pendiente
- Listado de guías con scroll infinito; detalle de guía solo lectura
- Registrar pagos en efectivo o depósito bancario

### Oficina — Precios (API, sin UI)

- Precio por kg con histórico (`precios`), nunca se elimina
- Al crear un precio nuevo, el anterior se cierra (`vigente=false`, `fecha_hasta=hoy`)
- Operario/cajero consultan precio vigente solo para cálculos internos

### Admin / operario legacy

- Registro de pesadas vía `linea_venta` (flujo anterior, coexistencia temporal)
- Devoluciones, métricas de jornada, merma, CRUD admin

## Endpoints principales

### Auth

- `POST /api/auth/login`

### Jornada y operación

- `GET /api/jornadas/activa`
- `GET /api/jornadas/:id/metricas`
- `POST /api/jornadas/:id/cerrar`
- `GET /api/granjas`
- `GET /api/clientes`
- `POST /api/clientes` *(operario: crear cliente)*
- `GET /api/lineas-venta?jornada_id=X`
- `POST /api/lineas-venta`
- `GET/POST /api/devoluciones`

### Guías *(operario escribe, cajero/oficina leen)*

- `GET /api/guias/activa?cliente_id=` — guía borrador del cliente (operario)
- `GET /api/guias/jornada-actual` — listado jornada (operario)
- `POST /api/guias` — crear guía
- `GET /api/guias/:id` — detalle (formato según rol)
- `POST /api/guias/:id/lineas` — agregar pesada
- `PUT /api/guias/:id/lineas/:lineaId` — editar línea
- `DELETE /api/guias/:id/lineas/:lineaId` — eliminar línea
- `PATCH /api/guias/:id/cerrar` — cerrar guía
- `GET /api/clientes/:id/guias` — panel cajero (paginado + totales)

### Precios *(oficina escribe, operario/cajero leen vigente)*

- `POST /api/precios` — `{ producto_id?, precio, fecha_desde }` (oficina)
- `GET /api/precios/vigente?fecha=YYYY-MM-DD` — precio aplicable
- `GET /api/precios/historial` — histórico completo (oficina)

### Cajero

- `GET /api/cajero/clientes`
- `GET /api/cajero/clientes/:id`
- `POST /api/cajero/pagos`
- `GET/POST /api/cajero/egresos`

### Admin

- Prefijo `/api/admin/*` — jornadas, clientes, granjas, usuarios, métricas

## Reglas de negocio — guías

```text
peso_neto   = peso_bruto - tara
neto_total  = peso_neto - devolución_kg
importe_guía = neto_total × precio_kg_vigente
importe_total = importe_guía + peladuría
total_general = Σ importe_total + saldo_anterior
```

- Precio vigente: rango `[fecha_desde, fecha_hasta]` → último disponible → default **S/ 5.00/kg**
- Guía en `borrador`: editable; `cerrada`: solo lectura para cajero

## Cálculo de merma (jornada)

```text
PISO_DISPONIBLE = ENTRADA_TOTAL - VENDIDO + DEVOLUCIONES - DESPERDICIO - MUERTERO
MERMA_% = (PISO_DISPONIBLE / ENTRADA_TOTAL) × 100
```

Interpretación: `< 1%` óptimo · `1–2%` aceptable · `> 2%` revisar.

## Comandos útiles

```bash
# Backend
cd backend
npm run dev
npm test
npm run build:ci
npm run prisma:generate
npx prisma migrate dev
npm run db:seed

# Frontend
cd frontend
npm run dev
npm test
npm run build
```

## Despliegue

- **Frontend:** Vercel con `VITE_API_URL` apuntando al backend público
- **Backend:** Railway con `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URLS`, `APP_TIMEZONE`
- Migraciones: `prisma migrate deploy` al arrancar (`npm start`)

Documentación detallada: [docs/ci-cd/README.md](docs/ci-cd/README.md)

## Documentación adicional

| Archivo | Contenido |
| --- | --- |
| [docs/ci-cd/database.md](docs/ci-cd/database.md) | Modelo de datos Prisma |
| [docs/ci-cd/railway.md](docs/ci-cd/railway.md) | Deploy backend en Railway |
| [docs/ci-cd/github-actions.md](docs/ci-cd/github-actions.md) | CI en GitHub Actions |
| [docs/technical-debt.md](docs/technical-debt.md) | Deuda técnica y mejoras pendientes |

## Pendiente / fuera de alcance actual

- UI del rol **oficina** (precios configurables desde pantalla)
- PWA instalable
- Recuperación de contraseña
- Exportación PDF real de guías (hoy usa impresión del navegador)
- Unificación completa de `linea_venta` con flujo de guías
