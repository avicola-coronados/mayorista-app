-- Permite precios diarios específicos por cliente conservando el precio general.
ALTER TABLE "precios" ADD COLUMN "cliente_id" INTEGER;

ALTER TABLE "precios"
ADD CONSTRAINT "precios_cliente_id_fkey"
FOREIGN KEY ("cliente_id") REFERENCES "cliente"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "precios_producto_id_cliente_id_fecha_desde_idx"
ON "precios"("producto_id", "cliente_id", "fecha_desde");

CREATE INDEX "precios_producto_id_cliente_id_vigente_idx"
ON "precios"("producto_id", "cliente_id", "vigente");
