# Estructura Actual De Base De Datos

La base de datos usa PostgreSQL y está modelada con Prisma en:

```text
backend/prisma/schema.prisma
```

## Enums

### `JornadaEstado`

Estados posibles de una jornada:

- `abierta`
- `cerrada`

### `OrigenLineaVenta`

Origen de una línea de venta:

- `partida`: venta desde una entrada/granja.
- `piso`: venta desde piso disponible.

### `TipoDevolucion`

Tipo de devolución registrada:

- `pelado`
- `muerto`
- `vivo`

### `UserRole`

Roles de usuario:

- `operario`
- `admin`
- `cajero`
- `oficina`

## Tablas

## `usuario`

Usuarios que pueden iniciar sesión en la aplicación.

| Campo | Tipo | Reglas |
| --- | --- | --- |
| `id` | `Int` | PK autoincremental |
| `username` | `String` | único |
| `password_hash` | `String` | hash de contraseña |
| `nombre` | `String?` | nombre real del usuario |
| `email` | `String?` | correo opcional |
| `role` | `UserRole` | `operario`, `admin`, `cajero` u `oficina` |
| `activo` | `Boolean` | default `true` |
| `created_by` | `Int?` | FK nullable a `usuario.id` |
| `updated_by` | `Int?` | FK nullable a `usuario.id` |
| `created_at` | `DateTime` | default `now()` |
| `updated_at` | `DateTime` | `@updatedAt` |

Relaciones:

- `creator`: usuario que creó el registro.
- `updater`: último usuario que modificó el registro.
- `created_users`: usuarios creados por este usuario.
- `updated_users`: usuarios modificados por este usuario.

No tiene relaciones directas con las tablas operativas. Controla autenticación, autorización y auditoría básica de gestión de usuarios.

## `jornada`

Representa el día operativo de venta.

| Campo | Tipo | Reglas |
| --- | --- | --- |
| `id` | `Int` | PK autoincremental |
| `fecha` | `DateTime` | default `now()` |
| `codigo` | `String` | único, formato esperado `DDMMAAAA` |
| `estado` | `JornadaEstado` | default `abierta` |
| `desperdicio_kg` | `Decimal(10,2)` | nullable |
| `muertero_kg` | `Decimal(10,2)` | nullable |
| `created_at` | `DateTime` | default `now()` |

Relaciones:

- Una jornada tiene muchas `entrada_granja`.
- Una jornada tiene muchas `linea_venta`.
- Una jornada tiene muchas `devolucion`.
- Una jornada puede recibir muchos `sobrante`.
- Una jornada puede ser origen de muchos `sobrante`.

Campos como `entrada_total_kg`, `vendido_total_kg`, `piso_disponible_kg`, `merma_kg` y `merma_porcentaje` no están almacenados. Se calculan dinámicamente desde las tablas operativas.

## `granja`

Catálogo de granjas proveedoras.

| Campo | Tipo | Reglas |
| --- | --- | --- |
| `id` | `Int` | PK autoincremental |
| `nombre` | `String` | único |
| `activo` | `Boolean` | default `true` |
| `created_at` | `DateTime` | default `now()` |

Relaciones:

- Una granja puede tener muchas `entrada_granja`.
- Una granja puede estar asociada a muchas `linea_venta`.

El borrado funcional de granjas se maneja con `activo = false`.

## `cliente`

Catálogo de clientes compradores.

| Campo | Tipo | Reglas |
| --- | --- | --- |
| `id` | `Int` | PK autoincremental |
| `nombre` | `String` | único |
| `activo` | `Boolean` | default `true` |
| `created_at` | `DateTime` | default `now()` |

Relaciones:

- Un cliente puede tener muchas `linea_venta`.
- Un cliente puede tener muchas `devolucion`.

El borrado funcional de clientes se maneja con `activo = false`.

## `entrada_granja`

Registra la entrada de pollo desde una granja hacia la jornada.

| Campo | Tipo | Reglas |
| --- | --- | --- |
| `id` | `Int` | PK autoincremental |
| `jornada_id` | `Int` | FK a `jornada.id` |
| `granja_id` | `Int` | FK a `granja.id` |
| `jabas_total` | `Int` | jabas ingresadas |
| `peso_bruto` | `Decimal(10,2)` | peso bruto |
| `tara` | `Decimal(10,2)` | tara total |
| `peso_neto` | `Decimal(10,2)` | peso neto |
| `peso_salida_granja` | `Decimal(10,2)` | nullable |
| `peso_ingreso_local` | `Decimal(10,2)` | nullable |
| `combustible_kg` | `Decimal(10,2)` | default `0` |
| `created_at` | `DateTime` | default `now()` |

Relaciones:

- Pertenece a una `jornada`.
- Pertenece a una `granja`.

Si se elimina una jornada, sus entradas se eliminan por cascada.

## `linea_venta`

Registra una pesada o venta dentro de una jornada.

| Campo | Tipo | Reglas |
| --- | --- | --- |
| `id` | `Int` | PK autoincremental |
| `jornada_id` | `Int` | FK a `jornada.id` |
| `cliente_id` | `Int?` | FK nullable a `cliente.id` |
| `granja_id` | `Int` | FK a `granja.id` |
| `origen` | `OrigenLineaVenta` | `partida` o `piso` |
| `jabas` | `Int` | cantidad de jabas |
| `peso_bruto` | `Decimal(10,2)` | peso bruto |
| `tara` | `Decimal(10,2)` | tara total |
| `tara_por_jaba` | `Decimal(10,2)` | default `5.8` |
| `peso_neto` | `Decimal(10,2)` | peso neto |
| `created_at` | `DateTime` | default `now()` |

Relaciones:

- Pertenece a una `jornada`.
- Puede pertenecer a un `cliente`.
- Pertenece a una `granja`.

`cliente_id` es nullable para soportar registros operativos sin cliente asignado, como piso disponible.

Si se elimina una jornada, sus líneas de venta se eliminan por cascada.

## `devolucion`

Registra devoluciones del día por cliente.

| Campo | Tipo | Reglas |
| --- | --- | --- |
| `id` | `Int` | PK autoincremental |
| `jornada_id` | `Int` | FK a `jornada.id` |
| `cliente_id` | `Int` | FK a `cliente.id` |
| `tipo` | `TipoDevolucion` | `pelado`, `muerto` o `vivo` |
| `jabas` | `Int?` | nullable |
| `peso_bruto` | `Decimal(10,2)` | peso bruto |
| `tara` | `Decimal(10,2)` | tara total |
| `peso_neto` | `Decimal(10,2)` | peso neto devuelto |
| `created_at` | `DateTime` | default `now()` |

Relaciones:

- Pertenece a una `jornada`.
- Pertenece a un `cliente`.

Si se elimina una jornada, sus devoluciones se eliminan por cascada.

## `sobrante`

Registra sobrantes trasladados de una jornada origen a otra jornada.

| Campo | Tipo | Reglas |
| --- | --- | --- |
| `id` | `Int` | PK autoincremental |
| `jornada_id` | `Int` | jornada que recibe el sobrante |
| `jornada_origen_id` | `Int` | jornada desde donde viene el sobrante |
| `jabas` | `Int` | cantidad de jabas |
| `peso_bruto` | `Decimal(10,2)` | peso bruto |
| `tara` | `Decimal(10,2)` | tara total |
| `peso_neto` | `Decimal(10,2)` | peso neto sobrante |
| `created_at` | `DateTime` | default `now()` |

Relaciones:

- `jornada_id` apunta a la jornada actual que recibe el sobrante.
- `jornada_origen_id` apunta a la jornada anterior/origen.

Si se elimina la jornada actual, sus sobrantes asociados se eliminan por cascada.

## Relaciones Principales

```text
jornada 1 ── n entrada_granja
jornada 1 ── n linea_venta
jornada 1 ── n devolucion
jornada 1 ── n sobrante como jornada receptora
jornada 1 ── n sobrante como jornada origen

granja 1 ── n entrada_granja
granja 1 ── n linea_venta

cliente 1 ── n linea_venta
cliente 1 ── n devolucion
```

## Cálculos Dinámicos

### Entrada Total

```text
entrada_total_kg = SUM(entrada_granja.peso_neto) + SUM(sobrante.peso_neto)
```

### Vendido Total

```text
vendido_total_kg = SUM(linea_venta.peso_neto)
```

Solo se consideran ventas con cliente cuando se calcula el total vendido operativo.

### Devoluciones Total

```text
devoluciones_total_kg = SUM(devolucion.peso_neto)
```

### Piso Disponible / Merma

```text
piso_disponible_kg = entrada_total_kg
                   - vendido_total_kg
                   + devoluciones_total_kg
                   - desperdicio_kg
                   - muertero_kg
```

```text
merma_kg = piso_disponible_kg
merma_porcentaje = (merma_kg / entrada_total_kg) x 100
```

Si `entrada_total_kg` es `0`, el porcentaje de merma se reporta como `0`.
