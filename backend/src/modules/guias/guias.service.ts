import { GuiaEstado, Prisma } from "@prisma/client";
import { getDefaultProductoId } from "../../bootstrap/default-producto";
import { calcularLineaGuia, calcularTotalesGuia } from "../../domain/guia/calculos";
import { AppError } from "../../errors/AppError";
import { prisma } from "../../lib/prisma";
import { getCurrentDateInTimezone, getCurrentJornadaCode } from "../../utils/date";
import { obtenerPrecioVigente } from "../precios/precios.service";
import {
  CreateGuiaInput,
  LineaGuiaBodyInput,
  ListGuiasClienteQuery,
} from "./guias.schemas";

const guiaInclude = {
  cliente: true,
  producto: true,
  jornada: { select: { id: true, codigo: true, estado: true, fecha: true } },
  operador: { select: { id: true, nombre: true, username: true } },
  cerrador: { select: { id: true, nombre: true, username: true } },
  lineas: {
    orderBy: { orden: "asc" as const },
    include: {
      precio: { select: { id: true, fecha_desde: true, precio: true } },
    },
  },
};

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

async function getJornadaActivaOrThrow(jornadaId?: number) {
  if (jornadaId) {
    const jornada = await prisma.jornada.findUnique({ where: { id: jornadaId } });
    if (!jornada) {
      throw new AppError("Jornada no encontrada", 404);
    }
    if (jornada.estado === "cerrada") {
      throw new AppError("La jornada está cerrada", 400);
    }
    return jornada;
  }

  const jornada = await prisma.jornada.findFirst({
    where: { estado: "abierta" },
    orderBy: { fecha: "desc" },
  });

  if (!jornada) {
    throw new AppError("No hay jornada abierta", 400);
  }

  return jornada;
}

async function getGuiaEditable(guiaId: number) {
  const guia = await prisma.guiaEntrega.findUnique({
    where: { id: guiaId },
    include: guiaInclude,
  });

  if (!guia) {
    throw new AppError("Guía no encontrada", 404);
  }

  if (guia.estado !== GuiaEstado.borrador) {
    throw new AppError("La guía está cerrada y no puede modificarse", 400);
  }

  return guia;
}

export async function recalcularTotalesGuia(guiaId: number) {
  const guia = await prisma.guiaEntrega.findUnique({
    where: { id: guiaId },
    include: { lineas: true },
  });

  if (!guia) {
    throw new AppError("Guía no encontrada", 404);
  }

  const totals = calcularTotalesGuia(
    guia.lineas.map((linea) => ({
      peso_neto: Number(linea.peso_neto),
      devolucion_kg: Number(linea.devolucion_kg),
      neto_total: Number(linea.neto_total),
      importe_guia: Number(linea.importe_guia),
      peladuria: Number(linea.peladuria),
      importe_total: Number(linea.importe_total),
    })),
    Number(guia.saldo_anterior),
  );

  await prisma.guiaEntrega.update({
    where: { id: guiaId },
    data: {
      total_peso_neto: new Prisma.Decimal(totals.total_peso_neto),
      total_devolucion: new Prisma.Decimal(totals.total_devolucion),
      total_neto: new Prisma.Decimal(totals.total_neto),
      total_importe: new Prisma.Decimal(totals.total_importe),
      total_peladuria: new Prisma.Decimal(totals.total_peladuria),
      total_general: new Prisma.Decimal(totals.total_general),
    },
  });
}

async function buildLineaData(
  guiaId: number,
  orden: number,
  input: LineaGuiaBodyInput,
  productoId: number,
) {
  try {
    const precioVigente = await obtenerPrecioVigente(productoId);
    const calculado = calcularLineaGuia(input, precioVigente.precio_kg);

    return {
      guia_id: guiaId,
      orden,
      jabas: input.jabas,
      peso_bruto: new Prisma.Decimal(input.peso_bruto),
      tara_por_jaba: new Prisma.Decimal(calculado.tara_por_jaba),
      tara: new Prisma.Decimal(calculado.tara),
      devolucion_kg: new Prisma.Decimal(input.devolucion_kg ?? 0),
      peso_neto: new Prisma.Decimal(calculado.peso_neto),
      neto_total: new Prisma.Decimal(calculado.neto_total),
      precio_kg: new Prisma.Decimal(precioVigente.precio_kg),
      precio_id: precioVigente.precio_id,
      importe_guia: new Prisma.Decimal(calculado.importe_guia),
      peladuria: new Prisma.Decimal(input.peladuria ?? 0),
      importe_total: new Prisma.Decimal(calculado.importe_total),
      linea_venta_id: input.linea_venta_id ?? null,
      nota: input.nota ?? null,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new AppError(error.message, 400);
    }
    throw error;
  }
}

export async function createGuia(data: CreateGuiaInput, operadorId: number) {
  const [jornada, cliente, productoId] = await Promise.all([
    getJornadaActivaOrThrow(data.jornada_id),
    prisma.cliente.findFirst({ where: { id: data.cliente_id, activo: true } }),
    data.producto_id ? Promise.resolve(data.producto_id) : getDefaultProductoId(),
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

  const saldoAnterior =
    data.saldo_anterior !== undefined ? data.saldo_anterior : await getSaldoAnteriorCliente(cliente.id);

  const fechaEmision = new Date(`${getCurrentDateInTimezone()}T12:00:00.000Z`);

  const guia = await prisma.guiaEntrega.create({
    data: {
      numero: await generarNumeroGuia(),
      jornada_id: jornada.id,
      cliente_id: cliente.id,
      producto_id: producto.id,
      fecha_emision: fechaEmision,
      saldo_anterior: new Prisma.Decimal(saldoAnterior),
      observaciones: data.observaciones ?? null,
      creado_por: operadorId,
    },
    include: guiaInclude,
  });

  return mapGuiaOperadorDetalle(guia);
}

export async function addLineaGuia(guiaId: number, input: LineaGuiaBodyInput) {
  const guia = await getGuiaEditable(guiaId);
  const nextOrden = guia.lineas.length > 0 ? Math.max(...guia.lineas.map((l) => l.orden)) + 1 : 1;

  const lineaData = await buildLineaData(guia.id, nextOrden, input, guia.producto_id);

  const linea = await prisma.lineaGuia.create({
    data: lineaData,
    include: {
      precio: { select: { id: true, fecha_desde: true, precio: true } },
    },
  });

  await recalcularTotalesGuia(guia.id);

  const updated = await prisma.guiaEntrega.findUnique({
    where: { id: guia.id },
    include: guiaInclude,
  });

  return mapGuiaOperadorDetalle(updated!);
}

export async function updateLineaGuia(guiaId: number, lineaId: number, input: LineaGuiaBodyInput) {
  const guia = await getGuiaEditable(guiaId);

  const linea = guia.lineas.find((item) => item.id === lineaId);
  if (!linea) {
    throw new AppError("Línea de guía no encontrada", 404);
  }

  const lineaData = await buildLineaData(guia.id, linea.orden, input, guia.producto_id);

  await prisma.lineaGuia.update({
    where: { id: lineaId },
    data: lineaData,
  });

  await recalcularTotalesGuia(guia.id);

  const updated = await prisma.guiaEntrega.findUnique({
    where: { id: guia.id },
    include: guiaInclude,
  });

  return mapGuiaOperadorDetalle(updated!);
}

export async function deleteLineaGuia(guiaId: number, lineaId: number) {
  const guia = await getGuiaEditable(guiaId);

  const linea = guia.lineas.find((item) => item.id === lineaId);
  if (!linea) {
    throw new AppError("Línea de guía no encontrada", 404);
  }

  await prisma.lineaGuia.delete({ where: { id: lineaId } });
  await recalcularTotalesGuia(guia.id);

  const updated = await prisma.guiaEntrega.findUnique({
    where: { id: guia.id },
    include: guiaInclude,
  });

  return mapGuiaOperadorDetalle(updated!);
}

export async function cerrarGuia(guiaId: number, usuarioId: number) {
  const guia = await getGuiaEditable(guiaId);

  if (guia.lineas.length === 0) {
    throw new AppError("No se puede cerrar una guía sin líneas", 400);
  }

  const precioVigente = await obtenerPrecioVigente(guia.producto_id);

  await recalcularTotalesGuia(guia.id);

  const updated = await prisma.guiaEntrega.update({
    where: { id: guia.id },
    data: {
      estado: GuiaEstado.cerrada,
      precio_kg_aplicado: new Prisma.Decimal(precioVigente.precio_kg),
      cerrada_por: usuarioId,
      cerrada_at: new Date(),
    },
    include: guiaInclude,
  });

  return mapGuiaOperadorDetalle(updated);
}

export async function getGuiaById(guiaId: number) {
  const guia = await prisma.guiaEntrega.findUnique({
    where: { id: guiaId },
    include: guiaInclude,
  });

  if (!guia) {
    throw new AppError("Guía no encontrada", 404);
  }

  return guia;
}

type GuiaConLineas = NonNullable<Awaited<ReturnType<typeof getGuiaById>>>;

function mapLineasOperador(guia: GuiaConLineas) {
  let saldoAcumulado = Number(guia.saldo_anterior);

  return guia.lineas.map((linea) => {
    const saldoAnterior = saldoAcumulado;
    const importeTotal = Number(linea.importe_total);

    saldoAcumulado = roundMoney(saldoAcumulado + importeTotal);

    return {
      id: linea.id,
      orden: linea.orden,
      nroJaba: linea.jabas,
      pesoBruto: Number(linea.peso_bruto),
      tara: Number(linea.tara),
      pesoNeto: Number(linea.peso_neto),
      devolucion: Number(linea.devolucion_kg),
      netoTotal: Number(linea.neto_total),
      importeGuia: Number(linea.importe_guia),
      peladuria: Number(linea.peladuria),
      importeTotal,
      saldoAnterior,
    };
  });
}

function mapTotalesOperador(guia: GuiaConLineas) {
  return {
    jabas: guia.lineas.reduce((sum, linea) => sum + linea.jabas, 0),
    pesoBruto: guia.lineas.reduce((sum, linea) => sum + Number(linea.peso_bruto), 0),
    tara: guia.lineas.reduce((sum, linea) => sum + Number(linea.tara), 0),
    pesoNeto: Number(guia.total_peso_neto),
    devolucion: Number(guia.total_devolucion),
    netoTotal: Number(guia.total_neto),
    importeGuia: Number(guia.total_importe),
    peladuria: Number(guia.total_peladuria),
    importeTotal: guia.lineas.reduce((sum, linea) => sum + Number(linea.importe_total), 0),
  };
}

export function mapGuiaOperadorDetalle(guia: GuiaConLineas) {
  return {
    id: guia.id,
    numero: guia.numero,
    fecha: guia.fecha_emision.toISOString(),
    estado: guia.estado,
    editable: guia.estado === GuiaEstado.borrador,
    cliente: {
      id: guia.cliente.id,
      nombre: guia.cliente.nombre,
      tipo: guia.cliente.tipo,
    },
    saldoAnteriorInicial: Number(guia.saldo_anterior),
    totalGeneral: Number(guia.total_general),
    lineas: mapLineasOperador(guia),
    totales: mapTotalesOperador(guia),
  };
}

export async function getGuiaOperadorDetalle(guiaId: number) {
  const guia = await getGuiaById(guiaId);
  return mapGuiaOperadorDetalle(guia);
}

export async function getGuiaBorradorActiva(clienteId: number) {
  const jornada = await getJornadaActivaOrThrow();

  const guia = await prisma.guiaEntrega.findFirst({
    where: {
      cliente_id: clienteId,
      jornada_id: jornada.id,
      estado: GuiaEstado.borrador,
    },
    include: guiaInclude,
    orderBy: { created_at: "desc" },
  });

  if (!guia) {
    return null;
  }

  return mapGuiaOperadorDetalle(guia);
}

export async function listGuiasJornadaActual() {
  const jornada = await getJornadaActivaOrThrow();

  const guias = await prisma.guiaEntrega.findMany({
    where: { jornada_id: jornada.id },
    include: {
      cliente: { select: { id: true, nombre: true, tipo: true } },
      _count: { select: { lineas: true } },
    },
    orderBy: [{ created_at: "desc" }],
  });

  return {
    jornada: {
      id: jornada.id,
      codigo: jornada.codigo,
      fecha: jornada.fecha.toISOString(),
    },
    guias: guias.map((guia) => ({
      id: guia.id,
      numero: guia.numero,
      estado: guia.estado,
      cliente: guia.cliente,
      lineasCount: guia._count.lineas,
      totalGeneral: Number(guia.total_general),
      createdAt: guia.created_at.toISOString(),
    })),
  };
}

export async function getGuiaDetalleCajero(guiaId: number) {
  const guia = await getGuiaById(guiaId);

  let saldoAcumulado = Number(guia.saldo_anterior);

  const lineas = guia.lineas.map((linea) => {
    const saldoAnterior = saldoAcumulado;
    const importeTotal = Number(linea.importe_total);

    saldoAcumulado = roundMoney(saldoAcumulado + importeTotal);

    return {
      id: linea.id,
      nroJaba: linea.jabas,
      pesoBruto: Number(linea.peso_bruto),
      tara: Number(linea.tara),
      pesoNeto: Number(linea.peso_neto),
      devolucion: Number(linea.devolucion_kg),
      netoTotal: Number(linea.neto_total),
      importeGuia: Number(linea.importe_guia),
      peladuria: Number(linea.peladuria),
      importeTotal,
      saldoAnterior,
    };
  });

  const totales = {
    jabas: guia.lineas.reduce((sum, linea) => sum + linea.jabas, 0),
    pesoBruto: guia.lineas.reduce((sum, linea) => sum + Number(linea.peso_bruto), 0),
    tara: guia.lineas.reduce((sum, linea) => sum + Number(linea.tara), 0),
    pesoNeto: Number(guia.total_peso_neto),
    devolucion: Number(guia.total_devolucion),
    netoTotal: Number(guia.total_neto),
    importeGuia: Number(guia.total_importe),
    peladuria: Number(guia.total_peladuria),
    importeTotal: guia.lineas.reduce((sum, linea) => sum + Number(linea.importe_total), 0),
  };

  return {
    id: guia.id,
    numero: guia.numero,
    fecha: guia.fecha_emision.toISOString(),
    cliente: {
      id: guia.cliente.id,
      nombre: guia.cliente.nombre,
      tipo: guia.cliente.tipo,
    },
    estado: mapGuiaEstadoCajero(guia.estado),
    saldoAnteriorInicial: Number(guia.saldo_anterior),
    totalGeneral: Number(guia.total_general),
    lineas,
    totales,
  };
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

async function getClienteTotalesCajero(clienteId: number) {
  const facturas = await prisma.factura.findMany({
    where: {
      cliente_id: clienteId,
      estado: { not: "anulado" },
    },
    select: {
      monto_total: true,
      monto_pagado: true,
      saldo_pendiente: true,
    },
  });

  return {
    facturado: facturas.reduce((sum, item) => sum + Number(item.monto_total), 0),
    pagado: facturas.reduce((sum, item) => sum + Number(item.monto_pagado), 0),
    saldoPendiente: facturas.reduce((sum, item) => sum + Number(item.saldo_pendiente), 0),
  };
}

function mapGuiaEstadoCajero(estado: GuiaEstado): "abierta" | "cerrada" {
  if (estado === GuiaEstado.cerrada || estado === GuiaEstado.anulada) {
    return "cerrada";
  }

  return "abierta";
}

function mapGuiaListItem(
  guia: {
    id: number;
    numero: string;
    fecha_emision: Date;
    estado: GuiaEstado;
    lineas: Array<{
      jabas: number;
      peso_bruto: unknown;
      devolucion_kg: unknown;
      neto_total: unknown;
      importe_guia: unknown;
      peladuria: unknown;
      importe_total: unknown;
    }>;
  },
) {
  const numeroJabas = guia.lineas.reduce((sum, linea) => sum + linea.jabas, 0);
  const pesoBrutoTotal = guia.lineas.reduce((sum, linea) => sum + Number(linea.peso_bruto), 0);
  const devolucion = guia.lineas.reduce((sum, linea) => sum + Number(linea.devolucion_kg), 0);
  const neto = guia.lineas.reduce((sum, linea) => sum + Number(linea.neto_total), 0);
  const importeGuia = guia.lineas.reduce((sum, linea) => sum + Number(linea.importe_guia), 0);
  const peladuria = guia.lineas.reduce((sum, linea) => sum + Number(linea.peladuria), 0);
  const netoTotal = guia.lineas.reduce((sum, linea) => sum + Number(linea.importe_total), 0);

  return {
    id: guia.id,
    numero: guia.numero,
    fecha: guia.fecha_emision.toISOString(),
    numeroJabas,
    pesoBrutoTotal,
    devolucion,
    neto,
    importeGuia,
    peladuria,
    netoTotal,
    estado: mapGuiaEstadoCajero(guia.estado),
  };
}

export async function getClienteGuiasPanel(clienteId: number, query: ListGuiasClienteQuery) {
  const cliente = await prisma.cliente.findUnique({ where: { id: clienteId } });

  if (!cliente) {
    throw new AppError("Cliente no encontrado", 404);
  }

  const where: Prisma.GuiaEntregaWhereInput = {
    cliente_id: clienteId,
    ...(query.estado ? { estado: query.estado } : {}),
  };

  const skip = (query.page - 1) * query.limit;

  const [guiasRaw, total, totales] = await Promise.all([
    prisma.guiaEntrega.findMany({
      where,
      include: {
        lineas: {
          select: {
            jabas: true,
            peso_bruto: true,
            devolucion_kg: true,
            neto_total: true,
            importe_guia: true,
            peladuria: true,
            importe_total: true,
          },
        },
      },
      orderBy: [{ fecha_emision: "desc" }, { created_at: "desc" }],
      skip,
      take: query.limit,
    }),
    prisma.guiaEntrega.count({ where }),
    getClienteTotalesCajero(clienteId),
  ]);

  const guias = guiasRaw.map(mapGuiaListItem);
  const hasMore = skip + guias.length < total;

  return {
    cliente: {
      id: cliente.id,
      nombre: cliente.nombre,
      tipo: cliente.tipo,
    },
    guias,
    totales,
    total,
    page: query.page,
    limit: query.limit,
    hasMore,
  };
}

export async function listGuiasByCliente(clienteId: number, query: ListGuiasClienteQuery) {
  const cliente = await prisma.cliente.findUnique({ where: { id: clienteId } });
  if (!cliente) {
    throw new AppError("Cliente no encontrado", 404);
  }

  const where: Prisma.GuiaEntregaWhereInput = {
    cliente_id: clienteId,
    ...(query.estado ? { estado: query.estado } : {}),
  };

  const skip = (query.page - 1) * query.limit;

  const [guias, total] = await Promise.all([
    prisma.guiaEntrega.findMany({
      where,
      include: {
        producto: true,
        jornada: { select: { id: true, codigo: true, estado: true } },
        _count: { select: { lineas: true } },
      },
      orderBy: [{ fecha_emision: "desc" }, { created_at: "desc" }],
      skip,
      take: query.limit,
    }),
    prisma.guiaEntrega.count({ where }),
  ]);

  return {
    cliente: { id: cliente.id, nombre: cliente.nombre, tipo: cliente.tipo },
    guias: guias.map(({ _count, ...guia }) => ({
      ...guia,
      lineas_count: _count.lineas,
    })),
    total,
    page: query.page,
    limit: query.limit,
  };
}

export async function getClientesConSaldo(buscar?: string) {
  const where: Prisma.ClienteWhereInput = {
    activo: true,
    ...(buscar
      ? {
          OR: [
            { nombre: { contains: buscar, mode: "insensitive" } },
            { codigo: { contains: buscar, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const clientes = await prisma.cliente.findMany({
    where,
    orderBy: { nombre: "asc" },
    include: {
      facturas: {
        where: { estado: { not: "anulado" } },
        select: { saldo_pendiente: true },
      },
      guias: {
        where: { estado: GuiaEstado.borrador },
        select: { id: true },
      },
    },
  });

  return clientes.map((cliente) => ({
    id: cliente.id,
    nombre: cliente.nombre,
    codigo: cliente.codigo,
    tipo: cliente.tipo,
    saldo_pendiente: cliente.facturas.reduce((sum, f) => sum + Number(f.saldo_pendiente), 0),
    guias_abiertas: cliente.guias.length,
  }));
}
