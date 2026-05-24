-- CreateEnum
CREATE TYPE "GuiaEstado" AS ENUM ('borrador', 'cerrada', 'anulada');

-- CreateTable
CREATE TABLE "producto" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "producto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "precio_diario" (
    "id" SERIAL NOT NULL,
    "fecha" DATE NOT NULL,
    "producto_id" INTEGER NOT NULL,
    "precio_kg" DECIMAL(10,4) NOT NULL,
    "creado_por" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "precio_diario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guia_entrega" (
    "id" SERIAL NOT NULL,
    "numero" TEXT NOT NULL,
    "jornada_id" INTEGER NOT NULL,
    "cliente_id" INTEGER NOT NULL,
    "producto_id" INTEGER NOT NULL,
    "fecha_emision" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" "GuiaEstado" NOT NULL DEFAULT 'borrador',
    "saldo_anterior" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_peso_neto" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total_devolucion" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total_neto" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total_importe" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_peladuria" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_general" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "precio_kg_aplicado" DECIMAL(10,4),
    "observaciones" TEXT,
    "creado_por" INTEGER NOT NULL,
    "cerrada_por" INTEGER,
    "cerrada_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guia_entrega_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "linea_guia" (
    "id" SERIAL NOT NULL,
    "guia_id" INTEGER NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 1,
    "jabas" INTEGER NOT NULL,
    "peso_bruto" DECIMAL(10,2) NOT NULL,
    "tara_por_jaba" DECIMAL(10,2) NOT NULL DEFAULT 5.8,
    "tara" DECIMAL(10,2) NOT NULL,
    "devolucion_kg" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "peso_neto" DECIMAL(10,2) NOT NULL,
    "neto_total" DECIMAL(10,2) NOT NULL,
    "precio_kg" DECIMAL(10,4) NOT NULL,
    "precio_diario_id" INTEGER,
    "importe_guia" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "peladuria" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "importe_total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "linea_venta_id" INTEGER,
    "nota" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "linea_guia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "producto_codigo_key" ON "producto"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "precio_diario_fecha_producto_id_key" ON "precio_diario"("fecha", "producto_id");

-- CreateIndex
CREATE INDEX "precio_diario_fecha_idx" ON "precio_diario"("fecha");

-- CreateIndex
CREATE INDEX "precio_diario_producto_id_fecha_idx" ON "precio_diario"("producto_id", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "guia_entrega_numero_key" ON "guia_entrega"("numero");

-- CreateIndex
CREATE INDEX "guia_entrega_jornada_id_cliente_id_idx" ON "guia_entrega"("jornada_id", "cliente_id");

-- CreateIndex
CREATE INDEX "guia_entrega_cliente_id_fecha_emision_idx" ON "guia_entrega"("cliente_id", "fecha_emision");

-- CreateIndex
CREATE INDEX "guia_entrega_estado_idx" ON "guia_entrega"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "linea_guia_linea_venta_id_key" ON "linea_guia"("linea_venta_id");

-- CreateIndex
CREATE INDEX "linea_guia_guia_id_orden_idx" ON "linea_guia"("guia_id", "orden");

-- AddForeignKey
ALTER TABLE "precio_diario" ADD CONSTRAINT "precio_diario_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "precio_diario" ADD CONSTRAINT "precio_diario_creado_por_fkey" FOREIGN KEY ("creado_por") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guia_entrega" ADD CONSTRAINT "guia_entrega_jornada_id_fkey" FOREIGN KEY ("jornada_id") REFERENCES "jornada"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guia_entrega" ADD CONSTRAINT "guia_entrega_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guia_entrega" ADD CONSTRAINT "guia_entrega_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guia_entrega" ADD CONSTRAINT "guia_entrega_creado_por_fkey" FOREIGN KEY ("creado_por") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guia_entrega" ADD CONSTRAINT "guia_entrega_cerrada_por_fkey" FOREIGN KEY ("cerrada_por") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "linea_guia" ADD CONSTRAINT "linea_guia_guia_id_fkey" FOREIGN KEY ("guia_id") REFERENCES "guia_entrega"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "linea_guia" ADD CONSTRAINT "linea_guia_precio_diario_id_fkey" FOREIGN KEY ("precio_diario_id") REFERENCES "precio_diario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "linea_guia" ADD CONSTRAINT "linea_guia_linea_venta_id_fkey" FOREIGN KEY ("linea_venta_id") REFERENCES "linea_venta"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed default product
INSERT INTO "producto" ("codigo", "nombre", "activo", "updated_at")
VALUES ('POLLO_VIVO', 'Pollo vivo', true, CURRENT_TIMESTAMP)
ON CONFLICT ("codigo") DO NOTHING;
