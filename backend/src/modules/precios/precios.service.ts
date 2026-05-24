import { Prisma } from "@prisma/client";
import { getDefaultProductoId } from "../../bootstrap/default-producto";
import {
  DEFAULT_PRECIO_KG,
  resolverPrecioVigente,
  toDateKey,
  type PrecioRecord,
} from "../../domain/precios/resolverPrecioVigente";
import { AppError } from "../../errors/AppError";
import { prisma } from "../../lib/prisma";
import { getCurrentDateInTimezone } from "../../utils/date";
import { CreatePrecioInput, HistorialPreciosQuery, PrecioVigenteQuery } from "./precios.schemas";

function parseFecha(fecha: string) {
  const date = new Date(`${fecha}T12:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    throw new AppError("Fecha inválida", 400);
  }

  return date;
}

function mapPrecioRecord(precio: {
  id: string;
  producto_id: number;
  precio: Prisma.Decimal;
  fecha_desde: Date;
  fecha_hasta: Date | null;
  vigente: boolean;
}): PrecioRecord {
  return {
    id: precio.id,
    producto_id: precio.producto_id,
    precio: Number(precio.precio),
    fecha_desde: toDateKey(precio.fecha_desde),
    fecha_hasta: precio.fecha_hasta ? toDateKey(precio.fecha_hasta) : null,
    vigente: precio.vigente,
  };
}

export type PrecioVigenteResult = {
  precio: number;
  precio_kg: number;
  precio_id: string | null;
  fecha_desde: string;
  producto_id: number;
  origen: "rango" | "ultimo_disponible" | "default";
};

export async function obtenerPrecioVigente(
  productoId: number,
  fechaInput?: string,
): Promise<PrecioVigenteResult> {
  const fecha = fechaInput ?? getCurrentDateInTimezone();
  const precios = await prisma.precio.findMany({
    where: { producto_id: productoId },
    orderBy: [{ fecha_desde: "desc" }, { creado_en: "desc" }],
  });

  const resuelto = resolverPrecioVigente(
    precios.map(mapPrecioRecord),
    productoId,
    fecha,
    DEFAULT_PRECIO_KG,
  );

  return {
    precio: resuelto.precio,
    precio_kg: resuelto.precio,
    precio_id: resuelto.precio_id,
    fecha_desde: resuelto.fecha_desde,
    producto_id: resuelto.producto_id,
    origen: resuelto.origen,
  };
}

export async function createPrecio(data: CreatePrecioInput, creadoPor: number) {
  const productoId = data.producto_id ?? (await getDefaultProductoId());
  const fechaDesde = parseFecha(data.fecha_desde);
  const fechaCierre = parseFecha(getCurrentDateInTimezone());

  const producto = await prisma.producto.findFirst({
    where: { id: productoId, activo: true },
  });

  if (!producto) {
    throw new AppError("Producto no encontrado", 404);
  }

  return prisma.$transaction(async (tx) => {
    await tx.precio.updateMany({
      where: {
        producto_id: productoId,
        vigente: true,
      },
      data: {
        vigente: false,
        fecha_hasta: fechaCierre,
      },
    });

    return tx.precio.create({
      data: {
        producto_id: productoId,
        precio: new Prisma.Decimal(data.precio),
        fecha_desde: fechaDesde,
        fecha_hasta: null,
        vigente: true,
        creado_por: creadoPor,
      },
      include: {
        producto: true,
        creador: { select: { id: true, nombre: true, username: true } },
      },
    });
  }).then((precio) => ({
    id: precio.id,
    producto_id: precio.producto_id,
    precio: Number(precio.precio),
    fecha_desde: toDateKey(precio.fecha_desde),
    fecha_hasta: precio.fecha_hasta ? toDateKey(precio.fecha_hasta) : null,
    vigente: precio.vigente,
    creado_por: precio.creado_por,
    creado_en: precio.creado_en.toISOString(),
  }));
}

export async function listHistorialPrecios(query: HistorialPreciosQuery) {
  const productoId = query.producto_id ?? (await getDefaultProductoId());

  const precios = await prisma.precio.findMany({
    where: { producto_id: productoId },
    orderBy: [{ fecha_desde: "desc" }, { creado_en: "desc" }],
    include: {
      creador: { select: { id: true, nombre: true, username: true } },
    },
  });

  return precios.map((precio) => ({
    id: precio.id,
    precio: Number(precio.precio),
    fecha_desde: toDateKey(precio.fecha_desde),
    fecha_hasta: precio.fecha_hasta ? toDateKey(precio.fecha_hasta) : null,
    vigente: precio.vigente,
    producto_id: precio.producto_id,
    creado_por: {
      id: precio.creador.id,
      nombre: precio.creador.nombre,
      username: precio.creador.username,
    },
    creado_en: precio.creado_en.toISOString(),
  }));
}

export async function getPrecioVigenteResponse(query: PrecioVigenteQuery) {
  const productoId = query.producto_id ?? (await getDefaultProductoId());
  const fecha = query.fecha ?? getCurrentDateInTimezone();
  const vigente = await obtenerPrecioVigente(productoId, fecha);

  return {
    precio: vigente.precio,
    precio_kg: vigente.precio_kg,
    fecha_desde: vigente.fecha_desde,
    producto_id: vigente.producto_id,
    precio_id: vigente.precio_id,
    origen: vigente.origen,
  };
}
