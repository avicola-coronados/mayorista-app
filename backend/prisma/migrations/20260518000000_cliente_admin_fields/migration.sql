ALTER TABLE "cliente"
ADD COLUMN IF NOT EXISTS "codigo" TEXT,
ADD COLUMN IF NOT EXISTS "telefono" TEXT,
ADD COLUMN IF NOT EXISTS "direccion" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "cliente_codigo_key" ON "cliente"("codigo");
CREATE INDEX IF NOT EXISTS "cliente_activo_idx" ON "cliente"("activo");
