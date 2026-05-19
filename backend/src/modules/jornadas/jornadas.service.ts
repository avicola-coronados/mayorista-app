import {
  calcularMerma,
  calcularPisoDisponible,
  calcularPorcentajeMerma,
} from "../../domain/pesadas/calculos";
import ExcelJS from "exceljs";
import { AppError } from "../../errors/AppError";
import { prisma } from "../../lib/prisma";
import { getCurrentJornadaCode } from "../../utils/date";
import { CierreJornadaInput, JornadasListQuery } from "./jornadas.schemas";

type JornadaSummary = {
  id: number;
  codigo: string;
  fecha: Date;
  entrada_total_kg: number;
  vendido_total_kg: number;
  devoluciones_total_kg: number;
  desperdicio_kg: number;
  muertero_kg: number;
  piso_disponible_kg: number;
  merma_kg: number;
  merma_porcentaje: number;
  estado: "abierta" | "cerrada";
};

type JornadaDetalle = {
  jornada: JornadaSummary & {
    entrada_total_jabas: number;
  };
  entradas_granjas: Array<{
    granja_id: number;
    granja_nombre: string;
    peso_neto_kg: number;
    jabas: number;
  }>;
  consolidado_clientes: Array<{
    cliente_id: number;
    cliente_nombre: string;
    total_pesadas: number;
    total_jabas: number;
    peso_bruto_kg: number;
    tara_kg: number;
    peso_neto_kg: number;
    porcentaje_total: number;
  }>;
  desglose_merma: {
    entrada_total: number;
    menos_vendido: number;
    mas_devoluciones: number;
    menos_desperdicio: number;
    menos_muertero: number;
    resultado_piso: number;
  };
};

export async function calculateJornadaMetrics(jornadaId: number) {
  const [
    jornada,
    entradaAggregate,
    sobranteAggregate,
    ventaAggregate,
    devolucionAggregate,
    counts,
    pesadasRealizadas,
  ] =
    await Promise.all([
      prisma.jornada.findUnique({ where: { id: jornadaId } }),
      prisma.entradaGranja.aggregate({
        where: { jornada_id: jornadaId },
        _sum: { peso_neto: true },
      }),
      prisma.sobrante.aggregate({
        where: { jornada_id: jornadaId },
        _sum: { peso_neto: true },
      }),
      prisma.lineaVenta.aggregate({
        where: { jornada_id: jornadaId, cliente_id: { not: null } },
        _sum: { peso_neto: true },
      }),
      prisma.devolucion.aggregate({
        where: { jornada_id: jornadaId },
        _sum: { peso_neto: true },
      }),
      prisma.lineaVenta.groupBy({
        by: ["cliente_id"],
        where: { jornada_id: jornadaId, cliente_id: { not: null } },
        _count: { _all: true },
      }),
      prisma.lineaVenta.count({
        where: { jornada_id: jornadaId },
      }),
    ]);

  if (!jornada) {
    throw new AppError("Jornada no encontrada", 404);
  }

  const entradaGranjaTotal = entradaAggregate._sum.peso_neto?.toNumber() ?? 0;
  const sobranteTotal = sobranteAggregate._sum.peso_neto?.toNumber() ?? 0;
  const entradaTotal = Number((entradaGranjaTotal + sobranteTotal).toFixed(2));
  const vendidoTotal = ventaAggregate._sum.peso_neto?.toNumber() ?? 0;
  const devolucionesTotal = devolucionAggregate._sum.peso_neto?.toNumber() ?? 0;
  const desperdicio = jornada.desperdicio_kg?.toNumber() ?? 0;
  const muertero = jornada.muertero_kg?.toNumber() ?? 0;
  const pisoDisponible = calcularPisoDisponible({
    entradaKg: entradaTotal,
    vendidoKg: vendidoTotal,
    devolucionesKg: devolucionesTotal,
    desperdicioKg: desperdicio,
    muerteroKg: muertero,
  });
  const clientesAtendidos = counts.length;
  const promedioPorCliente =
    clientesAtendidos > 0 ? Number((vendidoTotal / clientesAtendidos).toFixed(2)) : 0;

  return {
    entrada_total_kg: entradaTotal,
    vendido_total_kg: vendidoTotal,
    piso_disponible_kg: pisoDisponible,
    devoluciones_total_kg: devolucionesTotal,
    sobrante_total_kg: sobranteTotal,
    desperdicio_kg: desperdicio,
    muertero_kg: muertero,
    clientes_atendidos: clientesAtendidos,
    pesadas_realizadas: pesadasRealizadas,
    promedio_por_cliente: promedioPorCliente,
  };
}

export async function getOrCreateActiveJornada() {
  const codigo = getCurrentJornadaCode();

  return prisma.jornada.upsert({
    where: { codigo },
    update: {},
    create: {
      codigo,
      fecha: new Date(),
      estado: "abierta",
    },
  });
}

export async function getActiveJornadaWithMetrics() {
  const jornada = await getOrCreateActiveJornada();
  return buildJornadaSummary(jornada);
}

export async function getJornadaMetricasById(jornadaId: number) {
  const jornada = await prisma.jornada.findUnique({ where: { id: jornadaId } });

  if (!jornada) {
    throw new AppError("Jornada no encontrada", 404);
  }

  return calculateJornadaMetrics(jornadaId);
}

export async function listJornadas(query: JornadasListQuery) {
  const page = query.page;
  const limit = query.limit;
  const where = buildJornadasWhere(query);

  const [total, jornadas] = await Promise.all([
    prisma.jornada.count({ where }),
    prisma.jornada.findMany({
      where,
      orderBy: { fecha: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  const summaries = await Promise.all(jornadas.map((jornada) => buildJornadaSummary(jornada)));

  return {
    jornadas: summaries,
    total,
    page,
    limit,
    total_pages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function getJornadaDetalle(jornadaId: number) {
  const jornada = await prisma.jornada.findUnique({ where: { id: jornadaId } });

  if (!jornada) {
    throw new AppError("Jornada no encontrada", 404);
  }

  return buildJornadaDetalle(jornada);
}

export async function exportJornadaPdf(jornadaId: number) {
  const detalle = await getJornadaDetalle(jornadaId);
  const { jornada } = detalle;
  const lines = [
    "Coronados Avicola",
    `Jornada ${jornada.codigo}`,
    `Fecha: ${jornada.fecha.toISOString().slice(0, 10)}`,
    `Estado: ${jornada.estado}`,
    "",
    "Metricas principales",
    `Entrada: ${jornada.entrada_total_kg} kg / ${jornada.entrada_total_jabas} jabas`,
    `Vendido: ${jornada.vendido_total_kg} kg`,
    `Devoluciones: ${jornada.devoluciones_total_kg} kg`,
    `Desperdicio: ${jornada.desperdicio_kg} kg`,
    `Muertero: ${jornada.muertero_kg} kg`,
    `Piso disponible: ${jornada.piso_disponible_kg} kg`,
    `Merma: ${jornada.merma_kg} kg (${jornada.merma_porcentaje}%)`,
    "",
    "Entradas por granja",
    ...detalle.entradas_granjas.map(
      (entrada) => `${entrada.granja_nombre}: ${entrada.peso_neto_kg} kg / ${entrada.jabas} jabas`,
    ),
    "",
    "Consolidado clientes",
    ...detalle.consolidado_clientes.map(
      (cliente) =>
        `${cliente.cliente_nombre}: ${cliente.peso_neto_kg} kg / ${cliente.total_jabas} jabas / ${cliente.porcentaje_total}%`,
    ),
    "",
    `Generado: ${new Date().toISOString()}`,
  ];

  return {
    filename: `jornada_${jornada.codigo}.pdf`,
    content: buildSimplePdf(lines),
  };
}

export async function exportClientesJornadaXlsx(jornadaId: number) {
  const detalle = await getJornadaDetalle(jornadaId);
  const workbook = new ExcelJS.Workbook();
  const consolidadoSheet = workbook.addWorksheet("Consolidado");
  const detalleSheet = workbook.addWorksheet("Detalle pesadas");

  consolidadoSheet.columns = [
    { header: "Cliente", key: "cliente", width: 28 },
    { header: "Pesadas", key: "pesadas", width: 12 },
    { header: "Jabas", key: "jabas", width: 12 },
    { header: "Peso bruto kg", key: "bruto", width: 16 },
    { header: "Tara kg", key: "tara", width: 12 },
    { header: "Peso neto kg", key: "neto", width: 16 },
    { header: "% del total", key: "porcentaje", width: 14 },
  ];

  detalle.consolidado_clientes.forEach((cliente) => {
    consolidadoSheet.addRow({
      cliente: cliente.cliente_nombre,
      pesadas: cliente.total_pesadas,
      jabas: cliente.total_jabas,
      bruto: cliente.peso_bruto_kg,
      tara: cliente.tara_kg,
      neto: cliente.peso_neto_kg,
      porcentaje: cliente.porcentaje_total,
    });
  });

  detalleSheet.columns = [
    { header: "Cliente", key: "cliente", width: 28 },
    { header: "Granja", key: "granja", width: 24 },
    { header: "Origen", key: "origen", width: 12 },
    { header: "Jabas", key: "jabas", width: 10 },
    { header: "Peso bruto kg", key: "bruto", width: 16 },
    { header: "Tara kg", key: "tara", width: 12 },
    { header: "Peso neto kg", key: "neto", width: 16 },
    { header: "Fecha", key: "fecha", width: 22 },
  ];

  const lineas = await prisma.lineaVenta.findMany({
    where: { jornada_id: jornadaId },
    orderBy: { created_at: "asc" },
    include: {
      cliente: { select: { nombre: true } },
      granja: { select: { nombre: true } },
    },
  });

  lineas.forEach((linea) => {
    detalleSheet.addRow({
      cliente: linea.cliente?.nombre ?? "Piso / Pesadas sin cliente",
      granja: linea.granja.nombre,
      origen: linea.origen,
      jabas: linea.jabas,
      bruto: linea.peso_bruto.toNumber(),
      tara: linea.tara.toNumber(),
      neto: linea.peso_neto.toNumber(),
      fecha: linea.created_at.toISOString(),
    });
  });

  styleWorksheetHeader(consolidadoSheet);
  styleWorksheetHeader(detalleSheet);

  const buffer = await workbook.xlsx.writeBuffer();

  return {
    filename: `clientes_jornada_${detalle.jornada.codigo}.xlsx`,
    content: Buffer.from(buffer),
  };
}

export async function exportJornadasXlsx(query: JornadasListQuery) {
  const where = buildJornadasWhere({ ...query, page: 1, limit: 50 });
  const jornadas = await prisma.jornada.findMany({
    where,
    orderBy: { fecha: "desc" },
  });
  const summaries = await Promise.all(jornadas.map((jornada) => buildJornadaSummary(jornada)));
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Jornadas");

  worksheet.columns = [
    { header: "Jornada", key: "codigo", width: 14 },
    { header: "Fecha", key: "fecha", width: 14 },
    { header: "Entrada kg", key: "entrada", width: 14 },
    { header: "Vendido kg", key: "vendido", width: 14 },
    { header: "Devoluciones kg", key: "devoluciones", width: 18 },
    { header: "Desperdicio kg", key: "desperdicio", width: 16 },
    { header: "Muertero kg", key: "muertero", width: 14 },
    { header: "Piso disponible kg", key: "pisoDisponible", width: 20 },
    { header: "Merma kg", key: "merma", width: 12 },
    { header: "Merma %", key: "mermaPorcentaje", width: 12 },
    { header: "Estado", key: "estado", width: 12 },
  ];

  summaries.forEach((jornada) => {
    worksheet.addRow({
      codigo: jornada.codigo,
      fecha: jornada.fecha.toISOString().slice(0, 10),
      entrada: jornada.entrada_total_kg,
      vendido: jornada.vendido_total_kg,
      devoluciones: jornada.devoluciones_total_kg,
      desperdicio: jornada.desperdicio_kg,
      muertero: jornada.muertero_kg,
      pisoDisponible: jornada.piso_disponible_kg,
      merma: jornada.merma_kg,
      mermaPorcentaje: jornada.merma_porcentaje,
      estado: jornada.estado,
    });
  });

  worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  styleWorksheetHeader(worksheet);
  worksheet.views = [{ state: "frozen", ySplit: 1 }];

  const start = query.fecha_inicio ?? "todo";
  const end = query.fecha_fin ?? new Date().toISOString().slice(0, 10);
  const buffer = await workbook.xlsx.writeBuffer();

  return {
    filename: `jornadas_${start}_${end}.xlsx`,
    content: Buffer.from(buffer),
  };
}

export async function closeJornadaById(jornadaId: number, data: CierreJornadaInput) {
  const jornada = await prisma.jornada.findUnique({ where: { id: jornadaId } });

  if (!jornada) {
    throw new AppError("Jornada no encontrada", 404);
  }

  if (jornada.estado === "cerrada") {
    throw new AppError("La jornada ya está cerrada", 400);
  }

  const metrics = await calculateJornadaMetrics(jornadaId);
  const merma = calcularMerma({
    entradaKg: metrics.entrada_total_kg,
    vendidoKg: metrics.vendido_total_kg,
    devolucionesKg: metrics.devoluciones_total_kg,
    desperdicioKg: data.desperdicio_kg,
    muerteroKg: data.muertero_kg,
  });
  const mermaPorcentaje = calcularPorcentajeMerma(merma, metrics.entrada_total_kg);

  if (data.desperdicio_kg + data.muertero_kg > metrics.entrada_total_kg) {
    throw new AppError("Desperdicio y muertero no pueden exceder la entrada total", 400);
  }

  await prisma.jornada.update({
    where: { id: jornadaId },
    data: {
      estado: "cerrada",
      desperdicio_kg: data.desperdicio_kg,
      muertero_kg: data.muertero_kg,
    },
  });

  return {
    success: true,
    piso_disponible_kg: merma,
    merma_kg: merma,
    merma_porcentaje: mermaPorcentaje,
  };
}

export async function reopenJornadaById(jornadaId: number) {
  const jornada = await prisma.jornada.findUnique({ where: { id: jornadaId } });

  if (!jornada) {
    throw new AppError("Jornada no encontrada", 404);
  }

  if (jornada.estado === "abierta") {
    throw new AppError("La jornada ya está abierta", 400, "JORNADA_ALREADY_OPEN");
  }

  const currentJornadaCode = getCurrentJornadaCode();

  if (jornada.codigo !== currentJornadaCode) {
    throw new AppError(
      "Solo se puede reabrir la jornada actual del día",
      400,
      "ONLY_CURRENT_JORNADA_CAN_REOPEN",
    );
  }

  const activeJornada = await prisma.jornada.findFirst({
    where: {
      estado: "abierta",
      codigo: currentJornadaCode,
      id: { not: jornadaId },
    },
    select: {
      id: true,
      codigo: true,
    },
  });

  if (activeJornada) {
    throw new AppError(
      `No se puede reabrir la jornada porque ya existe otra jornada actual abierta (${activeJornada.codigo})`,
      409,
      "ACTIVE_JORNADA_EXISTS",
    );
  }

  const reopened = await prisma.jornada.update({
    where: { id: jornadaId },
    data: { estado: "abierta" },
  });

  return {
    success: true,
    jornada: reopened,
  };
}

function buildJornadasWhere(query: JornadasListQuery) {
  const where: {
    codigo?: { contains: string; mode: "insensitive" };
    estado?: "abierta" | "cerrada";
    fecha?: { gte?: Date; lte?: Date };
  } = {};

  if (query.search) {
    where.codigo = { contains: query.search, mode: "insensitive" };
  }

  if (query.estado) {
    where.estado = query.estado;
  }

  const fechaInicio = query.fecha_inicio ? startOfDay(new Date(query.fecha_inicio)) : undefined;
  const fechaFin = query.fecha_fin ? endOfDay(new Date(query.fecha_fin)) : undefined;

  if (fechaInicio || fechaFin) {
    where.fecha = {
      ...(fechaInicio ? { gte: fechaInicio } : {}),
      ...(fechaFin ? { lte: fechaFin } : {}),
    };
  }

  return where;
}

async function buildJornadaSummary(jornada: {
  id: number;
  codigo: string;
  fecha: Date;
  estado: "abierta" | "cerrada";
  desperdicio_kg: { toNumber(): number } | null;
  muertero_kg: { toNumber(): number } | null;
}): Promise<JornadaSummary> {
  const metrics = await calculateJornadaMetrics(jornada.id);
  const desperdicio = jornada.desperdicio_kg?.toNumber() ?? 0;
  const muertero = jornada.muertero_kg?.toNumber() ?? 0;
  const merma = calcularMerma({
    entradaKg: metrics.entrada_total_kg,
    vendidoKg: metrics.vendido_total_kg,
    devolucionesKg: metrics.devoluciones_total_kg,
    desperdicioKg: desperdicio,
    muerteroKg: muertero,
  });
  const mermaPorcentaje = calcularPorcentajeMerma(merma, metrics.entrada_total_kg);

  return {
    id: jornada.id,
    codigo: jornada.codigo,
    fecha: jornada.fecha,
    entrada_total_kg: metrics.entrada_total_kg,
    vendido_total_kg: metrics.vendido_total_kg,
    devoluciones_total_kg: metrics.devoluciones_total_kg,
    desperdicio_kg: desperdicio,
    muertero_kg: muertero,
    piso_disponible_kg: merma,
    merma_kg: merma,
    merma_porcentaje: mermaPorcentaje,
    estado: jornada.estado,
  };
}

async function buildJornadaDetalle(jornada: {
  id: number;
  codigo: string;
  fecha: Date;
  estado: "abierta" | "cerrada";
  desperdicio_kg: { toNumber(): number } | null;
  muertero_kg: { toNumber(): number } | null;
}): Promise<JornadaDetalle> {
  const [
    summary,
    entradaJabasAggregate,
    entradasGrouped,
    ventasGrouped,
  ] = await Promise.all([
    buildJornadaSummary(jornada),
    prisma.entradaGranja.aggregate({
      where: { jornada_id: jornada.id },
      _sum: { jabas_total: true },
    }),
    prisma.entradaGranja.groupBy({
      by: ["granja_id"],
      where: { jornada_id: jornada.id },
      _sum: {
        peso_neto: true,
        jabas_total: true,
      },
      orderBy: { granja_id: "asc" },
    }),
    prisma.lineaVenta.groupBy({
      by: ["cliente_id"],
      where: { jornada_id: jornada.id, cliente_id: { not: null } },
      _count: { _all: true },
      _sum: {
        jabas: true,
        peso_bruto: true,
        tara: true,
        peso_neto: true,
      },
      orderBy: {
        _sum: {
          peso_neto: "desc",
        },
      },
    }),
  ]);
  const entradasByGranja = new Map<number, { peso_neto_kg: number; jabas: number }>();

  entradasGrouped.forEach((entrada) => {
    entradasByGranja.set(entrada.granja_id, {
      peso_neto_kg: entrada._sum.peso_neto?.toNumber() ?? 0,
      jabas: entrada._sum.jabas_total ?? 0,
    });
  });

  const [granjas, clientes] = await Promise.all([
    prisma.granja.findMany({
      where: { id: { in: Array.from(entradasByGranja.keys()) } },
      select: { id: true, nombre: true },
    }),
    prisma.cliente.findMany({
      where: { id: { in: ventasGrouped.flatMap((venta) => venta.cliente_id ?? []) } },
      select: { id: true, nombre: true },
    }),
  ]);

  const granjaNames = new Map(granjas.map((granja) => [granja.id, granja.nombre]));
  const clienteNames = new Map(clientes.map((cliente) => [cliente.id, cliente.nombre]));

  return {
    jornada: {
      ...summary,
      entrada_total_jabas: entradaJabasAggregate._sum.jabas_total ?? 0,
    },
    entradas_granjas: Array.from(entradasByGranja.entries()).map(([granjaId, entrada]) => ({
      granja_id: granjaId,
      granja_nombre: granjaNames.get(granjaId) ?? "Granja sin nombre",
      peso_neto_kg: entrada.peso_neto_kg,
      jabas: entrada.jabas,
    })),
    consolidado_clientes: ventasGrouped.map((venta) => {
      const pesoNeto = venta._sum.peso_neto?.toNumber() ?? 0;

      return {
        cliente_id: venta.cliente_id ?? 0,
        cliente_nombre: venta.cliente_id
          ? clienteNames.get(venta.cliente_id) ?? "Cliente sin nombre"
          : "Piso / Pesadas sin cliente",
        total_pesadas: venta._count._all,
        total_jabas: venta._sum.jabas ?? 0,
        peso_bruto_kg: venta._sum.peso_bruto?.toNumber() ?? 0,
        tara_kg: venta._sum.tara?.toNumber() ?? 0,
        peso_neto_kg: pesoNeto,
        porcentaje_total:
          summary.vendido_total_kg > 0
            ? Number(((pesoNeto / summary.vendido_total_kg) * 100).toFixed(2))
            : 0,
      };
    }),
    desglose_merma: {
      entrada_total: summary.entrada_total_kg,
      menos_vendido: -summary.vendido_total_kg,
      mas_devoluciones: summary.devoluciones_total_kg,
      menos_desperdicio: -summary.desperdicio_kg,
      menos_muertero: -summary.muertero_kg,
      resultado_piso: summary.piso_disponible_kg,
    },
  };
}

function styleWorksheetHeader(worksheet: ExcelJS.Worksheet) {
  worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  worksheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2E8B3A" },
  };
  worksheet.views = [{ state: "frozen", ySplit: 1 }];
}

function startOfDay(date: Date) {
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfDay(date: Date) {
  date.setHours(23, 59, 59, 999);
  return date;
}

function buildSimplePdf(lines: string[]) {
  const content = [
    "BT",
    "/F1 14 Tf",
    "50 760 Td",
    ...lines.flatMap((line, index) => [
      index === 0 ? "" : "0 -24 Td",
      `(${escapePdfText(line)}) Tj`,
    ]),
    "ET",
  ]
    .filter(Boolean)
    .join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, "utf8");
}

function escapePdfText(text: string) {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}
