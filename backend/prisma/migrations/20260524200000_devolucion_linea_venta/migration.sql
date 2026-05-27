-- AlterTable
ALTER TABLE "devolucion" ADD COLUMN "linea_venta_id" INTEGER;

-- CreateIndex
CREATE INDEX "devolucion_linea_venta_id_idx" ON "devolucion"("linea_venta_id");

-- AddForeignKey
ALTER TABLE "devolucion" ADD CONSTRAINT "devolucion_linea_venta_id_fkey" FOREIGN KEY ("linea_venta_id") REFERENCES "linea_venta"("id") ON DELETE SET NULL ON UPDATE CASCADE;
