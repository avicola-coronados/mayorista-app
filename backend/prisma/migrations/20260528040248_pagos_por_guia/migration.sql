-- DropForeignKey
ALTER TABLE "linea_venta" DROP CONSTRAINT "linea_venta_cliente_id_fkey";

-- DropForeignKey
ALTER TABLE "pago" DROP CONSTRAINT "pago_factura_id_fkey";

-- DropIndex
DROP INDEX "cliente_documento_idx";

-- AlterTable
ALTER TABLE "egreso" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "factura" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "pago" ADD COLUMN     "guia_id" INTEGER,
ALTER COLUMN "factura_id" DROP NOT NULL,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "usuario" ALTER COLUMN "updated_at" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "pago_guia_id_idx" ON "pago"("guia_id");

-- AddForeignKey
ALTER TABLE "linea_venta" ADD CONSTRAINT "linea_venta_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pago" ADD CONSTRAINT "pago_factura_id_fkey" FOREIGN KEY ("factura_id") REFERENCES "factura"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pago" ADD CONSTRAINT "pago_guia_id_fkey" FOREIGN KEY ("guia_id") REFERENCES "guia_entrega"("id") ON DELETE SET NULL ON UPDATE CASCADE;
