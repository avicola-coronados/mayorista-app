import {
  calcularMerma,
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
  merma_kg: number;
  merma_porcentaje: number;
  estado: "abierta" | "cerrada";
};

export async function calculateJornadaMetrics(jornadaId: number) {
  const [entradaAggregate, ventaAggregate, devolucionAggregate, sobranteAggregate, counts] =
    await Promise.all([
      prisma.entradaGranja.aggregate({
        where: { jornada_id: jornadaId },
        _sum: { peso_neto: true },
      }),
      prisma.lineaVenta.aggregate({
        where: { jornada_id: jornadaId },
        _sum: { peso_neto: true },
      }),
      prisma.devolucion.aggregate({
        where: { jornada_id: jornadaId },
        _sum: { peso_neto: true },
      }),
      prisma.sobrante.aggregate({
        where: { jornada_id: jornadaId },
        _sum: { peso_neto: true },
      }),
      prisma.lineaVenta.groupBy({
        by: ["cliente_id"],
        where: { jornada_id: jornadaId },
        _count: { _all: true },
      }),
    ]);

  const entradaTotal = entradaAggregate._sum.peso_neto?.toNumber() ?? 0;
  const vendidoTotal = ventaAggregate._sum.peso_neto?.toNumber() ?? 0;
  const devolucionesTotal = devolucionAggregate._sum.peso_neto?.toNumber() ?? 0;
  const sobranteTotal = sobranteAggregate._sum.peso_neto?.toNumber() ?? 0;
  const clientesAtendidos = counts.length;
  const pesadasRealizadas = counts.reduce((accumulator, item) => accumulator + item._count._all, 0);
  const promedioPorCliente =
    clientesAtendidos > 0 ? Number((vendidoTotal / clientesAtendidos).toFixed(2)) : 0;

  return {
    entrada_total_kg: entradaTotal,
    vendido_total_kg: vendidoTotal,
    piso_disponible_kg: sobranteTotal,
    devoluciones_total_kg: devolucionesTotal,
    sobrante_total_kg: sobranteTotal,
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

  return buildJornadaSummary(jornada);
}

export async function exportJornadaPdf(jornadaId: number) {
  const jornada = await getJornadaDetalle(jornadaId);
  const lines = [
    "Coronados Avicola",
    `Jornada ${jornada.codigo}`,
    `Fecha: ${jornada.fecha.toISOString().slice(0, 10)}`,
    `Estado: ${jornada.estado}`,
    `Entrada: ${jornada.entrada_total_kg} kg`,
    `Vendido: ${jornada.vendido_total_kg} kg`,
    `Devoluciones: ${jornada.devoluciones_total_kg} kg`,
    `Desperdicio: ${jornada.desperdicio_kg} kg`,
    `Muertero: ${jornada.muertero_kg} kg`,
    `Merma: ${jornada.merma_kg} kg (${jornada.merma_porcentaje}%)`,
  ];

  return {
    filename: `jornada_${jornada.codigo}.pdf`,
    content: buildSimplePdf(lines),
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
      merma: jornada.merma_kg,
      mermaPorcentaje: jornada.merma_porcentaje,
      estado: jornada.estado,
    });
  });

  worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  worksheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2E8B3A" },
  };
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
    sobranteKg: metrics.sobrante_total_kg,
    desperdicioKg: data.desperdicio_kg,
    muerteroKg: data.muertero_kg,
  });
  const mermaPorcentaje = calcularPorcentajeMerma(merma, metrics.entrada_total_kg);

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
    merma_kg: merma,
    merma_porcentaje: mermaPorcentaje,
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
  const [entradaAggregate, ventaAggregate, devolucionAggregate] = await Promise.all([
    prisma.entradaGranja.aggregate({
      where: { jornada_id: jornada.id },
      _sum: { peso_neto: true },
    }),
    prisma.lineaVenta.aggregate({
      where: { jornada_id: jornada.id },
      _sum: { peso_neto: true },
    }),
    prisma.devolucion.aggregate({
      where: { jornada_id: jornada.id },
      _sum: { peso_neto: true },
    }),
  ]);

  const entradaTotal = entradaAggregate._sum.peso_neto?.toNumber() ?? 0;
  const vendidoTotal = ventaAggregate._sum.peso_neto?.toNumber() ?? 0;
  const devolucionesTotal = devolucionAggregate._sum.peso_neto?.toNumber() ?? 0;
  const desperdicio = jornada.desperdicio_kg?.toNumber() ?? 0;
  const muertero = jornada.muertero_kg?.toNumber() ?? 0;
  const merma = Number(
    (entradaTotal - vendidoTotal - devolucionesTotal - desperdicio - muertero).toFixed(2),
  );
  const mermaPorcentaje = entradaTotal > 0 ? Number(((merma / entradaTotal) * 100).toFixed(2)) : 0;

  return {
    id: jornada.id,
    codigo: jornada.codigo,
    fecha: jornada.fecha,
    entrada_total_kg: entradaTotal,
    vendido_total_kg: vendidoTotal,
    devoluciones_total_kg: devolucionesTotal,
    desperdicio_kg: desperdicio,
    muertero_kg: muertero,
    merma_kg: merma,
    merma_porcentaje: mermaPorcentaje,
    estado: jornada.estado,
  };
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
