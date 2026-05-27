import { GuiaEstado, Prisma, type LineaGuia, type LineaVenta } from "@prisma/client";
import { getDefaultProductoId } from "../../bootstrap/default-producto";
import { calcularLineaGuia } from "../../domain/guia/calculos";
import { AppError } from "../../errors/AppError";
import { prisma } from "../../lib/prisma";
import { getCurrentDateInTimezone, getCurrentJornadaCode } from "../../utils/date";
import { obtenerPrecioVigente } from "../precios/precios.service";
import { cerrarGuia, recalcularTotalesGuia } from "./guias.service";

async function generarNumeroGuia() {
  const fecha = getCurrentJornadaCode();
  const prefix = `G-${fecha}`;

  const count = await prisma.guiaEntrega.count({
    where: { numero: { startsWith: prefix } },
  });

  return `${prefix}-${String(count + 1).padStart(3, "0")}`;
}

async function getSaldoAnteriorCliente(clienteId: number) {
  const facturas = await prisma.factura.findMany({
    where: {
      cliente_id: clienteId,
      estado: { not: "anulado" },
    },
    select: { saldo_pendiente: true },
  });

  return facturas.reduce((sum, factura) => sum + Number(factura.saldo_pendiente), 0);
}

async function findOrCreateGuiaBorrador(params: {
  jornadaId: number;
  clienteId: number;
  creadoPor: number;
}) {
  const existing = await prisma.guiaEntrega.findFirst({
    where: {
      jornada_id: params.jornadaId,
      cliente_id: params.clienteId,
      estado: GuiaEstado.borrador,
    },
    include: { lineas: true },
  });

  if (existing) {
    return existing;
  }

  const [cliente, productoId] = await Promise.all([
    prisma.cliente.findFirst({ where: { id: params.clienteId, activo: true } }),
    getDefaultProductoId(),
  ]);

  if (!cliente) {
    throw new AppError("Cliente no encontrado", 404);
  }

  const producto = await prisma.producto.findFirst({
    where: { id: productoId, activo: true },
  });

  if (!producto) {
    throw new AppError("Producto no encontrado", 404);
  }

  const fechaEmision = new Date(`${getCurrentDateInTimezone()}T12:00:00.000Z`);

  return prisma.guiaEntrega.create({
    data: {
      numero: await generarNumeroGuia(),
      jornada_id: params.jornadaId,
      cliente_id: cliente.id,
      producto_id: producto.id,
      fecha_emision: fechaEmision,
      saldo_anterior: new Prisma.Decimal(await getSaldoAnteriorCliente(cliente.id)),
      creado_por: params.creadoPor,
    },
    include: { lineas: true },
  });
}

async function buildLineaGuiaDataFromLineaVenta(
  lineaVenta: LineaVenta,
  guiaId: number,
  orden: number,
  productoId: number,
  existing: LineaGuia | null,
  overrides?: { devolucionKg?: number; peladuria?: number },
) {
  const devolucionKg =
    overrides?.devolucionKg !== undefined
      ? overrides.devolucionKg
      : existing
        ? Number(existing.devolucion_kg)
        : 0;
  const peladuria =
    overrides?.peladuria !== undefined
      ? overrides.peladuria
      : existing
        ? Number(existing.peladuria)
        : 0;

  const input = {
    jabas: lineaVenta.jabas,
    peso_bruto: Number(lineaVenta.peso_bruto),
    tara: Number(lineaVenta.tara),
    tara_por_jaba: Number(lineaVenta.tara_por_jaba),
    devolucion_kg: devolucionKg,
    peladuria,
  };

  let precioKg: number;
  let precioId: string | null;

  if (existing) {
    precioKg = Number(existing.precio_kg);
    precioId = existing.precio_id;
  } else {
    const precioVigente = await obtenerPrecioVigente(productoId);
    precioKg = precioVigente.precio_kg;
    precioId = precioVigente.precio_id;
  }

  const calculado = calcularLineaGuia(input, precioKg);

  return {
    guia_id: guiaId,
    orden,
    jabas: lineaVenta.jabas,
    peso_bruto: new Prisma.Decimal(input.peso_bruto),
    tara_por_jaba: new Prisma.Decimal(calculado.tara_por_jaba),
    tara: new Prisma.Decimal(calculado.tara),
    devolucion_kg: new Prisma.Decimal(devolucionKg),
    peso_neto: new Prisma.Decimal(calculado.peso_neto),
    neto_total: new Prisma.Decimal(calculado.neto_total),
    precio_kg: new Prisma.Decimal(precioKg),
    precio_id: precioId,
    importe_guia: new Prisma.Decimal(calculado.importe_guia),
    peladuria: new Prisma.Decimal(peladuria),
    importe_total: new Prisma.Decimal(calculado.importe_total),
    linea_venta_id: lineaVenta.id,
    nota: lineaVenta.nota,
  };
}

export async function syncGuiaFromLineaVenta(lineaVentaId: number, actorUserId: number) {
  const lineaVenta = await prisma.lineaVenta.findUnique({
    where: { id: lineaVentaId },
  });

  if (!lineaVenta || lineaVenta.deleted_at) {
    await unsyncGuiaFromLineaVenta(lineaVentaId);
    return;
  }

  if (!lineaVenta.cliente_id) {
    await unsyncGuiaFromLineaVenta(lineaVentaId);
    return;
  }

  const jornada = await prisma.jornada.findUnique({
    where: { id: lineaVenta.jornada_id },
    select: { estado: true },
  });

  if (!jornada || jornada.estado === "cerrada") {
    return;
  }

  const guia = await findOrCreateGuiaBorrador({
    jornadaId: lineaVenta.jornada_id,
    clienteId: lineaVenta.cliente_id,
    creadoPor: actorUserId,
  });

  if (guia.estado !== GuiaEstado.borrador) {
    return;
  }

  const existingLinea = await prisma.lineaGuia.findUnique({
    where: { linea_venta_id: lineaVenta.id },
  });

  const lineaData = await buildLineaGuiaDataFromLineaVenta(
    lineaVenta,
    guia.id,
    existingLinea?.orden ?? (guia.lineas.length > 0 ? Math.max(...guia.lineas.map((l) => l.orden)) + 1 : 1),
    guia.producto_id,
    existingLinea,
  );

  if (existingLinea) {
    await prisma.lineaGuia.update({
      where: { id: existingLinea.id },
      data: lineaData,
    });
  } else {
    await prisma.lineaGuia.create({ data: lineaData });
  }

  await recalcularTotalesGuia(guia.id);
}

export async function unsyncGuiaFromLineaVenta(lineaVentaId: number) {
  const lineaGuia = await prisma.lineaGuia.findUnique({
    where: { linea_venta_id: lineaVentaId },
    include: { guia: true },
  });

  if (!lineaGuia) {
    return;
  }

  if (lineaGuia.guia.estado !== GuiaEstado.borrador) {
    return;
  }

  const guiaId = lineaGuia.guia_id;

  await prisma.lineaGuia.delete({ where: { id: lineaGuia.id } });
  await recalcularTotalesGuia(guiaId);
}

export async function cerrarGuiasPorJornada(jornadaId: number, usuarioId: number) {
  const guias = await prisma.guiaEntrega.findMany({
    where: {
      jornada_id: jornadaId,
      estado: GuiaEstado.borrador,
    },
    include: { _count: { select: { lineas: true } } },
  });

  for (const guia of guias) {
    if (guia._count.lineas === 0) {
      continue;
    }

    await cerrarGuia(guia.id, usuarioId);
  }
}

export async function syncDevolucionKgForLineaVenta(lineaVentaId: number) {
  const lineaVenta = await prisma.lineaVenta.findFirst({
    where: { id: lineaVentaId, deleted_at: null },
  });

  if (!lineaVenta?.cliente_id) {
    return;
  }

  const lineaGuia = await prisma.lineaGuia.findUnique({
    where: { linea_venta_id: lineaVentaId },
    include: { guia: true },
  });

  if (!lineaGuia || lineaGuia.guia.estado !== GuiaEstado.borrador) {
    return;
  }

  const devolucionesSum = await prisma.devolucion.aggregate({
    where: { linea_venta_id: lineaVentaId },
    _sum: { peso_neto: true },
  });

  const devolucionKg = Math.min(
    Number(devolucionesSum._sum.peso_neto ?? 0),
    Number(lineaVenta.peso_neto),
  );

  const lineaData = await buildLineaGuiaDataFromLineaVenta(
    lineaVenta,
    lineaGuia.guia_id,
    lineaGuia.orden,
    lineaGuia.guia.producto_id,
    lineaGuia,
    { devolucionKg },
  );

  await prisma.lineaGuia.update({
    where: { id: lineaGuia.id },
    data: lineaData,
  });

  await recalcularTotalesGuia(lineaGuia.guia_id);
}

export async function updatePeladuriaLineaGuia(
  guiaId: number,
  lineaId: number,
  peladuria: number,
) {
  const guia = await prisma.guiaEntrega.findUnique({
    where: { id: guiaId },
    include: { lineas: true },
  });

  if (!guia) {
    throw new AppError("Guía no encontrada", 404);
  }

  if (guia.estado !== GuiaEstado.borrador) {
    throw new AppError("Solo se puede editar peladuría en guías abiertas", 400);
  }

  const linea = guia.lineas.find((item) => item.id === lineaId);

  if (!linea) {
    throw new AppError("Línea de guía no encontrada", 404);
  }

  const input = {
    jabas: linea.jabas,
    peso_bruto: Number(linea.peso_bruto),
    tara: Number(linea.tara),
    tara_por_jaba: Number(linea.tara_por_jaba),
    devolucion_kg: Number(linea.devolucion_kg),
    peladuria,
  };

  const calculado = calcularLineaGuia(input, Number(linea.precio_kg));

  await prisma.lineaGuia.update({
    where: { id: lineaId },
    data: {
      peladuria: new Prisma.Decimal(peladuria),
      importe_total: new Prisma.Decimal(calculado.importe_total),
      neto_total: new Prisma.Decimal(calculado.neto_total),
      importe_guia: new Prisma.Decimal(calculado.importe_guia),
      peso_neto: new Prisma.Decimal(calculado.peso_neto),
      tara: new Prisma.Decimal(calculado.tara),
      tara_por_jaba: new Prisma.Decimal(calculado.tara_por_jaba),
    },
  });

  await recalcularTotalesGuia(guiaId);

  return prisma.guiaEntrega.findUnique({
    where: { id: guiaId },
    include: {
      cliente: true,
      lineas: { orderBy: { orden: "asc" } },
    },
  });
}
