-- CreateEnum
CREATE TYPE "JornadaEstado" AS ENUM ('abierta', 'cerrada');

-- CreateEnum
CREATE TYPE "OrigenLineaVenta" AS ENUM ('partida', 'piso');

-- CreateEnum
CREATE TYPE "TipoDevolucion" AS ENUM ('pelado', 'muerto', 'vivo');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('operario', 'admin');

-- CreateTable
CREATE TABLE "usuario" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jornada" (
    "id" SERIAL NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "codigo" TEXT NOT NULL,
    "estado" "JornadaEstado" NOT NULL DEFAULT 'abierta',
    "desperdicio_kg" DECIMAL(10,2),
    "muertero_kg" DECIMAL(10,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jornada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "granja" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "granja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cliente" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entrada_granja" (
    "id" SERIAL NOT NULL,
    "jornada_id" INTEGER NOT NULL,
    "granja_id" INTEGER NOT NULL,
    "jabas_total" INTEGER NOT NULL,
    "peso_bruto" DECIMAL(10,2) NOT NULL,
    "tara" DECIMAL(10,2) NOT NULL,
    "peso_neto" DECIMAL(10,2) NOT NULL,
    "peso_salida_granja" DECIMAL(10,2),
    "peso_ingreso_local" DECIMAL(10,2),
    "combustible_kg" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entrada_granja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "linea_venta" (
    "id" SERIAL NOT NULL,
    "jornada_id" INTEGER NOT NULL,
    "cliente_id" INTEGER NOT NULL,
    "granja_id" INTEGER NOT NULL,
    "origen" "OrigenLineaVenta" NOT NULL,
    "jabas" INTEGER NOT NULL,
    "peso_bruto" DECIMAL(10,2) NOT NULL,
    "tara" DECIMAL(10,2) NOT NULL,
    "tara_por_jaba" DECIMAL(10,2) NOT NULL DEFAULT 5.8,
    "peso_neto" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "linea_venta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devolucion" (
    "id" SERIAL NOT NULL,
    "jornada_id" INTEGER NOT NULL,
    "cliente_id" INTEGER NOT NULL,
    "tipo" "TipoDevolucion" NOT NULL,
    "jabas" INTEGER,
    "peso_bruto" DECIMAL(10,2) NOT NULL,
    "tara" DECIMAL(10,2) NOT NULL,
    "peso_neto" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "devolucion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sobrante" (
    "id" SERIAL NOT NULL,
    "jornada_id" INTEGER NOT NULL,
    "jornada_origen_id" INTEGER NOT NULL,
    "jabas" INTEGER NOT NULL,
    "peso_bruto" DECIMAL(10,2) NOT NULL,
    "tara" DECIMAL(10,2) NOT NULL,
    "peso_neto" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sobrante_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuario_username_key" ON "usuario"("username");

-- CreateIndex
CREATE UNIQUE INDEX "jornada_codigo_key" ON "jornada"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "granja_nombre_key" ON "granja"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "cliente_nombre_key" ON "cliente"("nombre");

-- AddForeignKey
ALTER TABLE "entrada_granja" ADD CONSTRAINT "entrada_granja_jornada_id_fkey" FOREIGN KEY ("jornada_id") REFERENCES "jornada"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entrada_granja" ADD CONSTRAINT "entrada_granja_granja_id_fkey" FOREIGN KEY ("granja_id") REFERENCES "granja"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "linea_venta" ADD CONSTRAINT "linea_venta_jornada_id_fkey" FOREIGN KEY ("jornada_id") REFERENCES "jornada"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "linea_venta" ADD CONSTRAINT "linea_venta_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "linea_venta" ADD CONSTRAINT "linea_venta_granja_id_fkey" FOREIGN KEY ("granja_id") REFERENCES "granja"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devolucion" ADD CONSTRAINT "devolucion_jornada_id_fkey" FOREIGN KEY ("jornada_id") REFERENCES "jornada"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devolucion" ADD CONSTRAINT "devolucion_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sobrante" ADD CONSTRAINT "sobrante_jornada_id_fkey" FOREIGN KEY ("jornada_id") REFERENCES "jornada"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sobrante" ADD CONSTRAINT "sobrante_jornada_origen_id_fkey" FOREIGN KEY ("jornada_origen_id") REFERENCES "jornada"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
