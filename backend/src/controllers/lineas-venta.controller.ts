import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { serializePrisma } from "../utils/serializers";
import { z } from "zod";

const DEFAULT_TARA_POR_JABA = 5.8;

const createLineaVentaSchema = z.object({
  jornada_id: z.coerce.number().int().positive(),
  cliente_id: z.coerce.number().int().positive(),
  granja_id: z.coerce.number().int().positive(),
  origen: z.enum(["partida", "piso"]),
  jabas: z.coerce.number().int().positive("Las jabas deben ser mayores a cero"),
  peso_bruto: z.coerce.number().positive("El peso bruto debe ser mayor a cero"),
  tara_por_jaba: z.coerce.number().positive("La tara por jaba debe ser mayor a cero"),
});

export async function createLineaVenta(request: Request, response: Response) {
  const parsed = createLineaVentaSchema.safeParse(request.body);

  if (!parsed.success) {
    return response.status(400).json({
      message: parsed.error.issues[0]?.message ?? "Datos inválidos",
    });
  }

  const data = parsed.data;
  const jornada = await prisma.jornada.findUnique({
    where: { id: data.jornada_id },
  });

  if (!jornada) {
    return response.status(404).json({ message: "Jornada no encontrada" });
  }

  if (jornada.estado === "cerrada") {
    return response.status(400).json({ message: "La jornada ya está cerrada" });
  }

  const [cliente, granja] = await Promise.all([
    prisma.cliente.findFirst({
      where: { id: data.cliente_id, activo: true },
    }),
    prisma.granja.findFirst({
      where: { id: data.granja_id, activo: true },
    }),
  ]);

  if (!cliente) {
    return response.status(404).json({ message: "Cliente no encontrado" });
  }

  if (!granja) {
    return response.status(404).json({ message: "Granja no encontrada" });
  }

  const tara = Number((data.jabas * data.tara_por_jaba).toFixed(2));
  const pesoNeto = Number((data.peso_bruto - tara).toFixed(2));

  if (pesoNeto <= 0) {
    return response.status(400).json({
      message: "El peso neto debe ser mayor a cero. Revisa jabas, tara o peso bruto.",
    });
  }

  const lineaVenta = await prisma.lineaVenta.create({
    data: {
      jornada_id: data.jornada_id,
      cliente_id: data.cliente_id,
      granja_id: data.granja_id,
      origen: data.origen,
      jabas: data.jabas,
      peso_bruto: data.peso_bruto,
      tara,
      tara_por_jaba: data.tara_por_jaba,
      peso_neto: pesoNeto,
    },
    include: {
      cliente: true,
      granja: true,
    },
  });

  return response.status(201).json(serializePrisma(lineaVenta));
}

export async function getLineasVentaGrouped(request: Request, response: Response) {
  const jornadaId = Number(request.query.jornada_id);

  if (Number.isNaN(jornadaId)) {
    return response.status(400).json({ message: "Debes enviar jornada_id" });
  }

  const lineas = await prisma.lineaVenta.findMany({
    where: { jornada_id: jornadaId },
    include: {
      cliente: true,
      granja: true,
    },
    orderBy: [{ cliente: { nombre: "asc" } }, { created_at: "desc" }],
  });

  const grouped = lineas.reduce<Record<number, any>>((accumulator, linea) => {
    const existing = accumulator[linea.cliente_id];

    const detail = {
      id: linea.id,
      origen: linea.origen,
      jabas: linea.jabas,
      peso_bruto: linea.peso_bruto.toNumber(),
      tara: linea.tara.toNumber(),
      tara_por_jaba: linea.tara_por_jaba.toNumber(),
      peso_neto: linea.peso_neto.toNumber(),
      created_at: linea.created_at.toISOString(),
      granja: {
        id: linea.granja.id,
        nombre: linea.granja.nombre,
      },
      usa_tara_personalizada:
        Math.abs(linea.tara_por_jaba.toNumber() - DEFAULT_TARA_POR_JABA) > 0.001,
    };

    if (!existing) {
      accumulator[linea.cliente_id] = {
        cliente: {
          id: linea.cliente.id,
          nombre: linea.cliente.nombre,
        },
        total_kg: linea.peso_neto.toNumber(),
        pesadas: 1,
        lineas: [detail],
      };
      return accumulator;
    }

    existing.total_kg = Number((existing.total_kg + linea.peso_neto.toNumber()).toFixed(2));
    existing.pesadas += 1;
    existing.lineas.push(detail);
    return accumulator;
  }, {});

  return response.json(Object.values(grouped));
}
