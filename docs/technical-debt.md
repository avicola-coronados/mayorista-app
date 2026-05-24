# Deuda técnica y mejoras pendientes

Este documento registra hallazgos de revisión de código para priorizar correcciones sin perder contexto.

Estados sugeridos:

- `Pendiente`: identificado, no iniciado.
- `En progreso`: se está corrigiendo.
- `Corregido`: implementado y validado.
- `Descartado`: se decidió no hacerlo por ahora.

## Hallazgos

| ID | Prioridad | Estado | Área | Hallazgo | Acción recomendada |
| --- | --- | --- | --- | --- | --- |
| TD-001 | Alta | Pendiente | Backend / Seguridad | `JWT_SECRET` tiene fallback `"change-me"` si la variable no existe. | Hacer que el backend falle al arrancar si falta `JWT_SECRET`, especialmente en producción. |
| TD-002 | Alta | En progreso | Frontend / Auth | Las rutas sensibles dependían del JWT decodificado en cliente. | `AuthRoleGuard` y `authRouting` redirigen por rol; validar que producción use bundle actualizado. Completar con endpoint `/auth/me` si hace falta. |
| TD-003 | Media | Pendiente | Frontend / Estructura | `frontend/src/pages/admin/AdminJornadas.tsx` concentra listado, detalle, modales y exportación en un archivo muy grande. | Separar en componentes: listado, detalle, modales, badges, filtros y tabla. |
| TD-004 | Media | Pendiente | Frontend / API | `frontend/src/services/api.ts` mezcla tipos, cliente Axios y endpoints de todos los dominios. | Dividir por dominio: `jornadas.api.ts`, `clientes.api.ts`, `guias.api.ts`, `precios.api.ts`, `cajero.api.ts`, etc. |
| TD-005 | Media | Pendiente | Backend / Reglas de negocio | La lógica de métricas/merma está repartida entre `jornadas.service.ts` y `admin.controller.ts`. | Centralizar cálculos y estado de merma en un servicio único de métricas. |
| TD-006 | Media | Pendiente | Backend / Soft delete | Las queries de `linea_venta` deben recordar manualmente `deleted_at: null`. | Crear helpers/repositorio para líneas activas y evitar omisiones futuras. |
| TD-007 | Media | Pendiente | Backend / Performance | `getAdminTopClientes` hace consultas adicionales por cada cliente. | Reescribir con query agregada o batching por IDs para reducir N+1 queries. |
| TD-008 | Baja | En progreso | Frontend / UX | Algunos flujos críticos usaban `window.confirm`. | `ConfirmDialog` ya existe en flujos de guías (operario). Extender a admin y otros módulos. |
| TD-009 | Baja | Pendiente | Tooling / CI | El CI ejecuta build/tests, pero no lint/format. | Agregar ESLint/Prettier o equivalente y correrlo en CI. |
| TD-010 | Media | Pendiente | Producto | Coexisten dos flujos de pesada: `linea_venta` (legacy) y `guia_entrega` + `linea_guia` (nuevo). | Definir migración o unificación; evitar doble registro operativo. |
| TD-011 | Media | Pendiente | Frontend / Oficina | API de precios lista (`POST/GET /api/precios*`) sin pantalla para rol `oficina`. | Implementar UI de configuración de precio diario e histórico. |
| TD-012 | Baja | Pendiente | Frontend / Cajero | Exportar PDF de guía usa `window.print()`; no hay generación PDF server-side. | Evaluar librería PDF o endpoint de impresión cuando la guía esté cerrada. |

## Plan sugerido

1. Corregir primero seguridad: `TD-001` y cerrar `TD-002`.
2. Reducir riesgo de negocio: `TD-005`, `TD-006`, `TD-010`.
3. Completar rol oficina: `TD-011`.
4. Mejorar mantenibilidad frontend: `TD-003` y `TD-004`.
5. Optimizar y pulir: `TD-007`, `TD-008`, `TD-009`, `TD-012`.

## Notas de actualización

### 2026-05-23 — Guías, cajero, precios y operario

Implementado en código (documentación actualizada en README y `docs/ci-cd/database.md`):

- Flujo operario: ingreso de pesadas en guías (`/pesada/nueva`, `/operario/guias`).
- Flujo cajero: facturas y guías, detalle de guía solo lectura.
- API precios con tabla `precios`, histórico y bootstrap S/ 5.00/kg.
- Migración `20260523140000_refactor_precios`.

Pendiente validar en producción:

- `npx prisma migrate deploy` en Railway.
- Redeploy frontend (Vercel) y backend con rutas de cajero/operario.

Cuando se corrija un punto de la tabla:

1. Cambiar `Estado` a `Corregido`.
2. Agregar en esta sección una nota con fecha, commit y validación ejecutada.
3. Si aparecen subtareas, agregarlas como nuevos IDs.
