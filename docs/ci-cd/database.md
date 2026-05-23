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

### `TipoCliente`

- `mayorista`
- `minorista`

### `EstadoFactura`

- `pendiente`
- `pago_parcial`
- `pagado`
- `anulado`

### `TipoPago`

- `efectivo`
- `deposito`

### `EstadoPago`

- `pendiente`
- `confirmado`
- `rechazado`

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
- `facturas_creadas`: facturas creadas por este usuario.
- `pagos_registrados`: pagos registrados por este usuario con rol cajero.
- `pagos_validados`: pagos validados por este usuario con rol admin.
- `egresos_registrados`: egresos registrados por este usuario con rol cajero.

Controla autenticación, autorización y auditoría básica de gestión de usuarios, caja y cobranza.

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
| `codigo` | `String?` | único, opcional |
| `tipo` | `TipoCliente` | default `minorista` |
| `documento_tipo` | `String?` | ejemplo `RUC` o `DNI` |
| `documento_num` | `String?` | número de documento |
| `contacto` | `String?` | contacto comercial |
| `telefono` | `String?` | opcional |
| `email` | `String?` | opcional |
| `direccion` | `String?` | opcional |
| `activo` | `Boolean` | default `true` |
| `created_at` | `DateTime` | default `now()` |

Relaciones:

- Un cliente puede tener muchas `linea_venta`.
- Un cliente puede tener muchas `devolucion`.
- Un cliente puede tener muchas `factura`.
- Un cliente puede tener muchos `pago`.

El borrado funcional de clientes se maneja con `activo = false`.

El rol `operario` puede crear clientes activos desde el registro de pesada cuando el cliente todavía no existe. La edición, desactivación y gestión completa del catálogo queda reservada al rol `admin`.

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
| `nota` | `String?` | observación opcional del operario |
| `deleted_at` | `DateTime?` | soft delete de la pesada |
| `deleted_by` | `Int?` | FK nullable a `usuario.id` del admin que eliminó |
| `delete_reason` | `String?` | motivo de eliminación administrativa |
| `created_at` | `DateTime` | default `now()` |

Relaciones:

- Pertenece a una `jornada`.
- Puede pertenecer a un `cliente`.
- Pertenece a una `granja`.
- Puede tener un usuario eliminador (`deleted_by`) cuando se corrige por admin.

`cliente_id` es nullable solo para soportar registros de origen `piso` sin cliente asignado. Las pesadas de origen `partida` deben apuntar a un cliente activo existente.

El campo `nota` permite que el operario deje observaciones por pesada. Es nullable para no afectar pesadas existentes. El admin puede revisar estas observaciones antes del cierre de jornada y decidir si corresponde una corrección.

Las pesadas no se eliminan físicamente cuando el admin corrige un error: se marcan con `deleted_at`, `deleted_by` y `delete_reason`. Todos los listados, consolidados, exportaciones y cálculos operativos deben considerar solo líneas con `deleted_at IS NULL`.

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

## `factura`

Registra el documento de cobranza por cliente y jornada.

| Campo | Tipo | Reglas |
| --- | --- | --- |
| `id` | `Int` | PK autoincremental |
| `codigo` | `String` | único, ejemplo `F001-00245` |
| `jornada_id` | `Int` | FK a `jornada.id` |
| `cliente_id` | `Int` | FK a `cliente.id` |
| `fecha_emision` | `DateTime` | default `now()` |
| `monto_total` | `Decimal(10,2)` | total facturado |
| `monto_pagado` | `Decimal(10,2)` | default `0` |
| `saldo_pendiente` | `Decimal(10,2)` | saldo operativo |
| `estado` | `EstadoFactura` | default `pendiente` |
| `created_by` | `Int?` | FK nullable a `usuario.id` |
| `created_at` | `DateTime` | default `now()` |
| `updated_at` | `DateTime` | `@updatedAt` |

Relaciones:

- Pertenece a una `jornada`.
- Pertenece a un `cliente`.
- Puede tener muchos `pago`.
- Puede tener un usuario creador (`created_by`).

## `pago`

Registra pagos de clientes, tanto efectivo como depósitos.

| Campo | Tipo | Reglas |
| --- | --- | --- |
| `id` | `Int` | PK autoincremental |
| `factura_id` | `Int` | FK a `factura.id` |
| `cliente_id` | `Int` | FK a `cliente.id` |
| `monto` | `Decimal(10,2)` | monto pagado |
| `tipo` | `TipoPago` | `efectivo` o `deposito` |
| `metodo` | `String` | ejemplo `efectivo`, `yape`, `plin`, `transferencia` |
| `banco` | `String?` | para depósitos |
| `nro_operacion` | `String?` | para depósitos |
| `fecha_deposito` | `DateTime? @db.Date` | fecha bancaria |
| `hora_deposito` | `DateTime? @db.Time(0)` | hora bancaria |
| `estado` | `EstadoPago` | default `confirmado` |
| `validado_por` | `Int?` | FK nullable a `usuario.id` |
| `fecha_validacion` | `DateTime?` | fecha de validación |
| `observaciones` | `String?` | observaciones de caja |
| `registrado_por` | `Int` | FK a `usuario.id` del cajero |
| `created_at` | `DateTime` | default `now()` |
| `updated_at` | `DateTime` | `@updatedAt` |

Relaciones:

- Pertenece a una `factura`.
- Pertenece a un `cliente`.
- `registrado_por` apunta al cajero que registró el pago.
- `validado_por` apunta al admin que validó un depósito.

## `egreso`

Registra salidas de dinero de caja.

| Campo | Tipo | Reglas |
| --- | --- | --- |
| `id` | `Int` | PK autoincremental |
| `concepto` | `String` | concepto corto |
| `descripcion` | `String` | detalle completo |
| `monto` | `Decimal(10,2)` | monto egresado |
| `metodo_pago` | `String` | ejemplo `efectivo`, `transferencia`, `cheque`, `tarjeta` |
| `beneficiario` | `String` | receptor del pago |
| `comprobante` | `String?` | número de boleta/factura |
| `fecha` | `DateTime` | default `now()` |
| `registrado_por` | `Int` | FK a `usuario.id` del cajero |
| `created_at` | `DateTime` | default `now()` |
| `updated_at` | `DateTime` | `@updatedAt` |

Relaciones:

- `registrado_por` apunta al cajero que registró el egreso.

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
cliente 1 ── n factura
cliente 1 ── n pago

factura 1 ── n pago
usuario 1 ── n pago como cajero registrador
usuario 1 ── n pago como admin validador
usuario 1 ── n egreso como cajero registrador
```

## Cálculos Dinámicos

### Entrada Total

```text
entrada_total_kg = SUM(entrada_granja.peso_neto)
                 + SUM(sobrante.peso_neto)
                 + SUM(linea_venta.peso_neto WHERE origen = 'piso' AND deleted_at IS NULL)
```

Las líneas de `linea_venta` con `origen = 'piso'` representan ingreso operativo a piso. Por negocio, ese piso cuenta como entrada incluso cuando ya viene asignado a un cliente.

Cuando una entrada de piso se asigna a un cliente en la misma operación, esa misma línea también se considera venta porque tiene `cliente_id IS NOT NULL`. En ese caso suma a entrada y vendido a la vez, dejando el piso disponible en cero si no hay diferencia.

### Vendido Total

```text
vendido_total_kg = SUM(linea_venta.peso_neto WHERE cliente_id IS NOT NULL AND deleted_at IS NULL)
```

Solo se consideran ventas con cliente cuando se calcula el total vendido operativo. Las líneas de origen `piso` sin cliente no se tratan como venta final.

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
