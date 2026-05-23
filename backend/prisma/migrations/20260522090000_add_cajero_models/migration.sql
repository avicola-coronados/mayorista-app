DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TipoCliente') THEN
    CREATE TYPE "TipoCliente" AS ENUM ('mayorista', 'minorista');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EstadoFactura') THEN
    CREATE TYPE "EstadoFactura" AS ENUM ('pendiente', 'pago_parcial', 'pagado', 'anulado');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TipoPago') THEN
    CREATE TYPE "TipoPago" AS ENUM ('efectivo', 'deposito');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EstadoPago') THEN
    CREATE TYPE "EstadoPago" AS ENUM ('pendiente', 'confirmado', 'rechazado');
  END IF;
END $$;

ALTER TABLE "cliente"
  ADD COLUMN IF NOT EXISTS "tipo" "TipoCliente" NOT NULL DEFAULT 'minorista',
  ADD COLUMN IF NOT EXISTS "documento_tipo" TEXT,
  ADD COLUMN IF NOT EXISTS "documento_num" TEXT,
  ADD COLUMN IF NOT EXISTS "contacto" TEXT,
  ADD COLUMN IF NOT EXISTS "email" TEXT;

CREATE INDEX IF NOT EXISTS "cliente_tipo_activo_idx" ON "cliente"("tipo", "activo");
CREATE INDEX IF NOT EXISTS "cliente_documento_idx" ON "cliente"("documento_tipo", "documento_num");

CREATE TABLE IF NOT EXISTS "factura" (
  "id" SERIAL NOT NULL,
  "codigo" TEXT NOT NULL,
  "jornada_id" INTEGER NOT NULL,
  "cliente_id" INTEGER NOT NULL,
  "fecha_emision" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "monto_total" DECIMAL(10,2) NOT NULL,
  "monto_pagado" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "saldo_pendiente" DECIMAL(10,2) NOT NULL,
  "estado" "EstadoFactura" NOT NULL DEFAULT 'pendiente',
  "created_by" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "factura_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "factura_codigo_key" ON "factura"("codigo");
CREATE INDEX IF NOT EXISTS "factura_jornada_id_idx" ON "factura"("jornada_id");
CREATE INDEX IF NOT EXISTS "factura_cliente_id_idx" ON "factura"("cliente_id");
CREATE INDEX IF NOT EXISTS "factura_estado_idx" ON "factura"("estado");

CREATE TABLE IF NOT EXISTS "pago" (
  "id" SERIAL NOT NULL,
  "factura_id" INTEGER NOT NULL,
  "cliente_id" INTEGER NOT NULL,
  "monto" DECIMAL(10,2) NOT NULL,
  "tipo" "TipoPago" NOT NULL,
  "metodo" TEXT NOT NULL,
  "banco" TEXT,
  "nro_operacion" TEXT,
  "fecha_deposito" DATE,
  "hora_deposito" TIME(0),
  "estado" "EstadoPago" NOT NULL DEFAULT 'confirmado',
  "validado_por" INTEGER,
  "fecha_validacion" TIMESTAMP(3),
  "observaciones" TEXT,
  "registrado_por" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "pago_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "pago_factura_id_idx" ON "pago"("factura_id");
CREATE INDEX IF NOT EXISTS "pago_cliente_id_idx" ON "pago"("cliente_id");
CREATE INDEX IF NOT EXISTS "pago_estado_idx" ON "pago"("estado");
CREATE INDEX IF NOT EXISTS "pago_registrado_por_idx" ON "pago"("registrado_por");

CREATE TABLE IF NOT EXISTS "egreso" (
  "id" SERIAL NOT NULL,
  "concepto" TEXT NOT NULL,
  "descripcion" TEXT NOT NULL,
  "monto" DECIMAL(10,2) NOT NULL,
  "metodo_pago" TEXT NOT NULL,
  "beneficiario" TEXT NOT NULL,
  "comprobante" TEXT,
  "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "registrado_por" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "egreso_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "egreso_fecha_idx" ON "egreso"("fecha");
CREATE INDEX IF NOT EXISTS "egreso_registrado_por_idx" ON "egreso"("registrado_por");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'factura_jornada_id_fkey') THEN
    ALTER TABLE "factura"
      ADD CONSTRAINT "factura_jornada_id_fkey"
      FOREIGN KEY ("jornada_id") REFERENCES "jornada"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'factura_cliente_id_fkey') THEN
    ALTER TABLE "factura"
      ADD CONSTRAINT "factura_cliente_id_fkey"
      FOREIGN KEY ("cliente_id") REFERENCES "cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'factura_created_by_fkey') THEN
    ALTER TABLE "factura"
      ADD CONSTRAINT "factura_created_by_fkey"
      FOREIGN KEY ("created_by") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pago_factura_id_fkey') THEN
    ALTER TABLE "pago"
      ADD CONSTRAINT "pago_factura_id_fkey"
      FOREIGN KEY ("factura_id") REFERENCES "factura"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pago_cliente_id_fkey') THEN
    ALTER TABLE "pago"
      ADD CONSTRAINT "pago_cliente_id_fkey"
      FOREIGN KEY ("cliente_id") REFERENCES "cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pago_registrado_por_fkey') THEN
    ALTER TABLE "pago"
      ADD CONSTRAINT "pago_registrado_por_fkey"
      FOREIGN KEY ("registrado_por") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pago_validado_por_fkey') THEN
    ALTER TABLE "pago"
      ADD CONSTRAINT "pago_validado_por_fkey"
      FOREIGN KEY ("validado_por") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'egreso_registrado_por_fkey') THEN
    ALTER TABLE "egreso"
      ADD CONSTRAINT "egreso_registrado_por_fkey"
      FOREIGN KEY ("registrado_por") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
