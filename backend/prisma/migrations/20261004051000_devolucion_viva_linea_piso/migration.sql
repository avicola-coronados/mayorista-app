-- Vincula cada devolución viva con la pesada que reincorpora su mercadería a piso.
ALTER TABLE "linea_venta" ADD COLUMN "devolucion_origen_id" INTEGER;

CREATE UNIQUE INDEX "linea_venta_devolucion_origen_id_key"
ON "linea_venta"("devolucion_origen_id");

ALTER TABLE "linea_venta"
ADD CONSTRAINT "linea_venta_devolucion_origen_id_fkey"
FOREIGN KEY ("devolucion_origen_id") REFERENCES "devolucion"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- Convierte devoluciones vivas históricas en pesadas de piso sin duplicarlas.
INSERT INTO "linea_venta" (
  "jornada_id",
  "cliente_id",
  "granja_id",
  "origen",
  "jabas",
  "peso_bruto",
  "tara",
  "tara_por_jaba",
  "peso_neto",
  "nota",
  "devolucion_origen_id",
  "created_at"
)
SELECT
  d."jornada_id",
  NULL,
  g."id",
  'piso'::"OrigenLineaVenta",
  COALESCE(d."jabas", 0),
  d."peso_bruto",
  d."tara",
  CASE
    WHEN COALESCE(d."jabas", 0) > 0 THEN ROUND(d."tara" / d."jabas", 2)
    ELSE 5.8
  END,
  d."peso_neto",
  'Devolución viva reincorporada a piso',
  d."id",
  d."created_at"
FROM "devolucion" d
CROSS JOIN LATERAL (
  SELECT "id"
  FROM "granja"
  WHERE LOWER("nombre") = 'piso'
  ORDER BY "id"
  LIMIT 1
) g
WHERE d."tipo" = 'vivo'
  AND NOT EXISTS (
    SELECT 1 FROM "linea_venta" lv WHERE lv."devolucion_origen_id" = d."id"
  );
