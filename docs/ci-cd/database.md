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

### `GuiaEstado`

Estado de una guía de entrega:

- `borrador`: editable por operario (agregar/editar/eliminar líneas)
- `cerrada`: solo lectura para cajero; no admite más pesadas
- `anulada`: guía invalidada

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
- `precios_creados`: precios configurados por oficina/admin.
- `guias_creadas` / `guias_cerradas`: guías del operario.

Controla autenticación, autorización y auditoría básica de gestión de usuarios, caja, cobranza y precios.

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

## `producto`

Catálogo de productos avícolas (hoy solo `POLLO_VIVO`; preparado para múltiples).

| Campo | Tipo | Reglas |
| --- | --- | --- |
| `id` | `Int` | PK autoincremental |
| `codigo` | `String` | único, ej. `POLLO_VIVO` |
| `nombre` | `String` | nombre comercial |
| `activo` | `Boolean` | default `true` |
| `created_at` | `DateTime` | default `now()` |
| `updated_at` | `DateTime` | `@updatedAt` |

Relaciones:

- Un producto tiene muchos `precios`.
- Un producto tiene muchas `guia_entrega`.

Bootstrap al arrancar: `ensureDefaultProducto()` crea `POLLO_VIVO` si no existe.

## `precios`

Histórico de precios por kg (rol oficina). Nunca se eliminan; se cierran con `fecha_hasta`.

| Campo | Tipo | Reglas |
| --- | --- | --- |
| `id` | `String` (UUID) | PK |
| `producto_id` | `Int` | FK a `producto.id` |
| `precio` | `Decimal(10,4)` | precio por kg en soles |
| `fecha_desde` | `Date` | inicio de vigencia |
| `fecha_hasta` | `Date?` | fin de vigencia; `null` = abierto |
| `vigente` | `Boolean` | solo uno `true` por producto |
| `creado_por` | `Int` | FK a `usuario.id` (oficina/admin) |
| `creado_en` | `DateTime` | default `now()` |

Índice único parcial: un solo registro `vigente=true` por `producto_id`.

Lógica al crear precio nuevo:

1. Precios vigentes del producto → `vigente=false`, `fecha_hasta=hoy`
2. Se crea el nuevo con `vigente=true`, `fecha_hasta=null`

Resolución de precio para una fecha (`obtenerPrecioVigente`):

1. Registro cuyo rango `[fecha_desde, fecha_hasta]` cubre la fecha
2. Si no hay → último con `fecha_desde ≤ fecha`
3. Si no hay histórico → default **S/ 5.00/kg**

Bootstrap: `ensureDefaultPrecio()` al arrancar el backend.

## `guia_entrega`

Guía de entrega por cliente y jornada (reemplaza progresivamente el registro suelto en `linea_venta` para cobranza).

| Campo | Tipo | Reglas |
| --- | --- | --- |
| `id` | `Int` | PK autoincremental |
| `numero` | `String` | único, ej. `G-DDMMYYYY-001` |
| `jornada_id` | `Int` | FK a `jornada.id` |
| `cliente_id` | `Int` | FK a `cliente.id` |
| `producto_id` | `Int` | FK a `producto.id` |
| `fecha_emision` | `Date` | fecha de la guía |
| `estado` | `GuiaEstado` | default `borrador` |
| `saldo_anterior` | `Decimal(12,2)` | saldo del cliente al abrir |
| `total_peso_neto` | `Decimal(10,2)` | agregado de líneas |
| `total_devolucion` | `Decimal(10,2)` | agregado |
| `total_neto` | `Decimal(10,2)` | kg neto comercial |
| `total_importe` | `Decimal(12,2)` | Σ importe guía |
| `total_peladuria` | `Decimal(12,2)` | Σ peladuría |
| `total_general` | `Decimal(12,2)` | total con saldo anterior |
| `precio_kg_aplicado` | `Decimal(10,4)?` | precio al cerrar |
| `observaciones` | `String?` | opcional |
| `creado_por` | `Int` | operario |
| `cerrada_por` | `Int?` | usuario que cerró |
| `cerrada_at` | `DateTime?` | timestamp de cierre |

Relaciones:

- Pertenece a `jornada`, `cliente`, `producto`, `operador`.
- Tiene muchas `linea_guia`.

## `linea_guia`

Cada pesada dentro de una guía.

| Campo | Tipo | Reglas |
| --- | --- | --- |
| `id` | `Int` | PK autoincremental |
| `guia_id` | `Int` | FK a `guia_entrega.id` (cascade delete) |
| `orden` | `Int` | orden en la guía |
| `jabas` | `Int` | cantidad de jabas |
| `peso_bruto` | `Decimal(10,2)` | kg |
| `tara_por_jaba` | `Decimal(10,2)` | default `5.8` |
| `tara` | `Decimal(10,2)` | tara total |
| `devolucion_kg` | `Decimal(10,2)` | default `0` |
| `peso_neto` | `Decimal(10,2)` | bruto − tara |
| `neto_total` | `Decimal(10,2)` | neto − devolución |
| `precio_kg` | `Decimal(10,4)` | precio aplicado en la línea |
| `precio_id` | `String?` | FK a `precios.id` |
| `importe_guia` | `Decimal(12,2)` | neto_total × precio_kg |
| `peladuria` | `Decimal(12,2)` | monto en soles |
| `importe_total` | `Decimal(12,2)` | importe_guía + peladuría |
| `linea_venta_id` | `Int?` | FK opcional a `linea_venta` |
| `nota` | `String?` | observación |

Cálculos al guardar línea (dominio `domain/guia/calculos.ts`):

```text
peso_neto = peso_bruto - tara
neto_total = peso_neto - devolucion_kg
importe_guia = neto_total × precio_kg_vigente
importe_total = importe_guia + peladuria
```

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
jornada 1 ── n guia_entrega
jornada 1 ── n sobrante (receptora / origen)

producto 1 ── n precios
producto 1 ── n guia_entrega

guia_entrega 1 ── n linea_guia
precios 1 ── n linea_guia (referencia del precio aplicado)

granja 1 ── n entrada_granja
granja 1 ── n linea_venta

cliente 1 ── n linea_venta
cliente 1 ── n devolucion
cliente 1 ── n factura
cliente 1 ── n pago
cliente 1 ── n guia_entrega

factura 1 ── n pago
usuario 1 ── n pago / egreso / precios / guías (según rol)
```

## Migraciones relevantes

| Migración | Descripción |
| --- | --- |
| `20260523120000_add_guias_precios` | Tablas iniciales `producto`, `precio_diario`, `guia_entrega`, `linea_guia` |
| `20260523140000_refactor_precios` | `precio_diario` → `precios` con vigencia por rango y UUID |

En producción aplicar con `prisma migrate deploy` (automático en Railway al arrancar).

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
