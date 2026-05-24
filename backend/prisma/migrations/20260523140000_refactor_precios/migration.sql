-- Refactor precio_diario → precios (histórico con vigencia por rango de fechas)

CREATE TABLE "precios" (
    "id" TEXT NOT NULL,
    "producto_id" INTEGER NOT NULL,
    "precio" DECIMAL(10,4) NOT NULL,
    "fecha_desde" DATE NOT NULL,
    "fecha_hasta" DATE,
    "vigente" BOOLEAN NOT NULL DEFAULT false,
    "creado_por" INTEGER NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "precios_pkey" PRIMARY KEY ("id")
);

-- Migrar registros existentes de precio_diario
INSERT INTO "precios" ("id", "producto_id", "precio", "fecha_desde", "fecha_hasta", "vigente", "creado_por", "creado_en")
SELECT
    gen_random_uuid()::text,
    pd."producto_id",
    pd."precio_kg",
    pd."fecha",
    NULL,
    false,
    pd."creado_por",
    pd."created_at"
FROM "precio_diario" pd;

-- Marcar como vigente el precio más reciente por producto
UPDATE "precios" p
SET "vigente" = true
FROM (
    SELECT DISTINCT ON ("producto_id") "id"
    FROM "precios"
    ORDER BY "producto_id", "fecha_desde" DESC, "creado_en" DESC
) latest
WHERE p."id" = latest."id";

-- Actualizar referencias en linea_guia
ALTER TABLE "linea_guia" ADD COLUMN "precio_id" TEXT;

UPDATE "linea_guia" lg
SET "precio_id" = p."id"
FROM "precio_diario" pd
JOIN "precios" p ON p."producto_id" = pd."producto_id" AND p."fecha_desde" = pd."fecha"
WHERE lg."precio_diario_id" = pd."id";

ALTER TABLE "linea_guia" DROP CONSTRAINT IF EXISTS "linea_guia_precio_diario_id_fkey";
ALTER TABLE "linea_guia" DROP COLUMN "precio_diario_id";

ALTER TABLE "precio_diario" DROP CONSTRAINT IF EXISTS "precio_diario_producto_id_fkey";
ALTER TABLE "precio_diario" DROP CONSTRAINT IF EXISTS "precio_diario_creado_por_fkey";
DROP TABLE "precio_diario";

CREATE INDEX "precios_producto_id_fecha_desde_idx" ON "precios"("producto_id", "fecha_desde");
CREATE INDEX "precios_producto_id_vigente_idx" ON "precios"("producto_id", "vigente");
CREATE UNIQUE INDEX "precios_one_vigente_per_producto_idx" ON "precios"("producto_id") WHERE "vigente" = true;

ALTER TABLE "precios" ADD CONSTRAINT "precios_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "precios" ADD CONSTRAINT "precios_creado_por_fkey" FOREIGN KEY ("creado_por") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "linea_guia" ADD CONSTRAINT "linea_guia_precio_id_fkey" FOREIGN KEY ("precio_id") REFERENCES "precios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
