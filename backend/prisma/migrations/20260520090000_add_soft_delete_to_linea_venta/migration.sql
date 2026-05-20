ALTER TABLE "linea_venta"
  ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "deleted_by" INTEGER,
  ADD COLUMN IF NOT EXISTS "delete_reason" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'linea_venta_deleted_by_fkey'
  ) THEN
    ALTER TABLE "linea_venta"
      ADD CONSTRAINT "linea_venta_deleted_by_fkey"
      FOREIGN KEY ("deleted_by") REFERENCES "usuario"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "linea_venta_deleted_at_idx" ON "linea_venta"("deleted_at");
