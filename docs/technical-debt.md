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
| TD-002 | Alta | Pendiente | Frontend / Auth | Las rutas admin decodifican el JWT con `atob` y usan el `role` sin verificar firma. | Usar `user.role` del login o crear endpoint `/auth/me`; no confiar en payload decodificado en cliente para decidir UI sensible. |
| TD-003 | Media | Pendiente | Frontend / Estructura | `frontend/src/pages/admin/AdminJornadas.tsx` concentra listado, detalle, modales, edición, eliminación, exportación y helpers en un archivo muy grande. | Separar en componentes: listado, detalle, modales, badges, filtros y tabla. |
| TD-004 | Media | Pendiente | Frontend / API | `frontend/src/services/api.ts` mezcla tipos, cliente Axios, interceptores y endpoints de todos los dominios. | Dividir por dominio: `jornadas.api.ts`, `clientes.api.ts`, `admin.api.ts`, `lineasVenta.api.ts`, etc. |
| TD-005 | Media | Pendiente | Backend / Reglas de negocio | La lógica de métricas/merma está repartida entre `jornadas.service.ts` y `admin.controller.ts`. | Centralizar cálculos y estado de merma en un servicio único de métricas. |
| TD-006 | Media | Pendiente | Backend / Soft delete | Las queries de `linea_venta` deben recordar manualmente `deleted_at: null`. | Crear helpers/repositorio para líneas activas y evitar omisiones futuras. |
| TD-007 | Media | Pendiente | Backend / Performance | `getAdminTopClientes` hace consultas adicionales por cada cliente. | Reescribir con query agregada o batching por IDs para reducir N+1 queries. |
| TD-008 | Baja | Pendiente | Frontend / UX | Algunos flujos críticos usan `window.confirm`. | Reemplazar por un `ConfirmDialog` reutilizable, consistente y testeable. |
| TD-009 | Baja | Pendiente | Tooling / CI | El CI ejecuta build/tests, pero no lint/format. | Agregar ESLint/Prettier o equivalente y correrlo en CI. |

## Plan sugerido

1. Corregir primero seguridad: `TD-001` y `TD-002`.
2. Reducir riesgo de negocio: `TD-005` y `TD-006`.
3. Mejorar mantenibilidad frontend: `TD-003` y `TD-004`.
4. Optimizar y pulir: `TD-007`, `TD-008`, `TD-009`.

## Notas de actualización

Cuando se corrija un punto:

1. Cambiar `Estado` a `Corregido`.
2. Agregar en esta sección una nota con fecha, commit y validación ejecutada.
3. Si aparecen subtareas, agregarlas como nuevos IDs.
