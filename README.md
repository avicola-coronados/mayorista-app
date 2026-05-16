# Coronados Avícola MVP

Aplicación web para control diario de ventas por mayor de Coronados Avícola. El monorepo está dividido en `frontend/` y `backend/`, sin Docker, con PostgreSQL nativo.

## Stack

- Frontend: React 18, Vite, TailwindCSS, React Query, Zustand
- Backend: Node.js 20, Express, TypeScript
- Base de datos: PostgreSQL 16, Prisma ORM
- Deploy esperado: Vercel para frontend, Railway para backend y base de datos

## Estructura

```text
mayorista-app/
├── frontend/
├── backend/
├── .gitignore
└── README.md
```

## Requisitos Previos

- Node.js 20.x
- npm 10+
- PostgreSQL 16 ejecutándose localmente

## Instalar PostgreSQL Nativo

### macOS

Usa Postgres.app:

1. Descarga Postgres.app desde `https://postgresapp.com/`
2. Arrastra la app a `Applications`
3. Abre Postgres.app y verifica que el servidor esté iniciado
4. Crea la base de datos:

```bash
createdb coronados_db
```

### Windows

Usa el instalador oficial de PostgreSQL:

1. Descarga el instalador desde `https://www.postgresql.org/download/windows/`
2. Instala PostgreSQL 16 con pgAdmin y herramientas de línea de comando
3. Crea la base de datos desde pgAdmin o con:

```bash
createdb -U postgres coronados_db
```

### Linux (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo -u postgres createdb coronados_db
```

## Variables De Entorno

### Backend: `backend/.env`

Usa `backend/.env.example` como base:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/coronados_db?schema=public"
JWT_SECRET="super-secret-change-me"
PORT=3000
FRONTEND_URL="http://localhost:5173"
APP_TIMEZONE="America/Lima"
```

### Frontend: `frontend/.env`

Usa `frontend/.env.example` como base:

```env
VITE_API_URL="http://localhost:3000"
```

## Setup Paso A Paso

### 1. Instalar dependencias

```bash
cd backend
npm install

cd ../frontend
npm install
```

### 2. Preparar la base de datos con Prisma

Desde `backend/`:

```bash
npm run prisma:generate
npx prisma migrate dev --name init
npm run db:seed
```

Si prefieres usar el script definido:

```bash
npm run prisma:migrate -- --name init
```

## Seed Inicial Incluido

El seed carga:

- Granjas: `Redondos 1`, `Redondos 2`, `San Fernando`
- Clientes: `PIZARRO`, `MILAGROS`, `PERCY`, `MARINO`, `NAVARRO`
- Usuarios:
  - `operario / coronados2024`
  - `admin / coronados2024`
- Jornada de hoy en estado `abierta`
- Una `entrada_granja` de ejemplo con `Redondos 1`, `100 jabas`, `2000 kg bruto`

Nota: además de las 7 tablas operativas del negocio, el backend agrega la tabla `usuario` para soportar el login del MVP.

## Levantar El Proyecto En Desarrollo

### Backend

```bash
cd backend
npm run dev
```

Servidor esperado: `http://localhost:3000`

### Frontend

```bash
cd frontend
npm run dev
```

Aplicación esperada: `http://localhost:5173`

## Flujo MVP Cubierto

1. Login con JWT
2. Dashboard del operario con métricas del día
3. Registro de pesada con tara por jaba editable
4. Lista de clientes del día agrupada por cliente
5. Cierre de jornada con cálculo automático de merma

## Endpoints Principales

- `POST /api/auth/login`
- `GET /api/jornadas/activa`
- `GET /api/jornadas/:id/metricas`
- `POST /api/jornadas/:id/cerrar`
- `GET /api/granjas`
- `GET /api/clientes`
- `GET /api/lineas-venta?jornada_id=X`
- `POST /api/lineas-venta`

## Reglas De Negocio Implementadas

- Tara por defecto: `jabas × 5.8`
- `tara_por_jaba` es editable en el frontend y se persiste en `linea_venta`
- `tara = jabas × tara_por_jaba`
- `peso_neto = peso_bruto - tara`
- La jornada del día se crea automáticamente si no existe
- La merma se calcula dinámicamente; no se almacena como columna fija.

## Cálculo De Merma

La merma representa el piso disponible físico al final de la jornada después de descontar ventas, desperdicio y muertero. Las devoluciones se suman porque retornan al piso operativo.

```text
ENTRADA_TOTAL = entradas de granjas + sobrantes de jornadas anteriores
PISO_DISPONIBLE = ENTRADA_TOTAL - VENDIDO + DEVOLUCIONES - DESPERDICIO - MUERTERO
MERMA_% = (PISO_DISPONIBLE / ENTRADA_TOTAL) x 100
```

Interpretación:

- `< 1%`: óptimo
- `1-2%`: aceptable
- `> 2%`: alto, revisar la jornada

## Comandos Útiles

### Backend

```bash
npm run dev
npm run build
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run db:seed
```

### Frontend

```bash
npm run dev
npm run build
npm run preview
```

## Despliegue Sugerido

- Frontend en Vercel con `VITE_API_URL` apuntando al backend público
- Backend en Railway con `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL` y `APP_TIMEZONE`

## Observaciones Del MVP

- No incluye PWA instalable.
- No incluye CRUD de clientes/granjas.
- No incluye registro UI de devoluciones, sobrantes o entradas de granja.
- No incluye recuperación de contraseña ni historial de jornadas.
