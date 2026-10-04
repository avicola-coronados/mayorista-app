-- Identifica las pesadas generadas al redistribuir devoluciones de pollo pelado.
ALTER TABLE "linea_venta"
ADD COLUMN "es_distribucion_pelado" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "linea_venta_jornada_id_es_distribucion_pelado_deleted_at_idx"
ON "linea_venta"("jornada_id", "es_distribucion_pelado", "deleted_at");
