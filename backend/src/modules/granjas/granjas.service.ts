import { prisma } from "../../lib/prisma";
import { AppError } from "../../errors/AppError";
import { getCurrentJornadaCode } from "../../utils/date";
import { GranjaCreateInput, GranjaUpdateInput } from "./granjas.schemas";

export async function getGranjasList(includeInactive = false) {
  const granjas = await prisma.granja.findMany({
    where: includeInactive ? undefined : { activo: true },
    orderBy: { nombre: "asc" },
    include: {
      _count: {
        select: { entradas: true },
      },
    },
  });

  return granjas.map((granja) => ({
    id: granja.id,
    nombre: granja.nombre,
    activo: granja.activo,
    created_at: granja.created_at,
    total_entregas: granja._count.entradas,
  }));
}

export async function getGranjaById(id: number) {
  const granja = await prisma.granja.findUnique({
    where: { id },
    include: {
      _count: {
        select: { entradas: true },
      },
    },
  });

  if (!granja) {
    throw new AppError("Granja no encontrada", 404);
  }

  return {
    id: granja.id,
    nombre: granja.nombre,
    activo: granja.activo,
    created_at: granja.created_at,
    total_entregas: granja._count.entradas,
  };
}

export async function createGranja(data: GranjaCreateInput) {
  await ensureUniqueGranjaName(data.nombre);

  return prisma.granja.create({
    data: {
      nombre: data.nombre,
      activo: true,
    },
  });
}

export async function updateGranja(id: number, data: GranjaUpdateInput) {
  await ensureGranjaExists(id);
  await ensureUniqueGranjaName(data.nombre, id);

  if (!data.activo) {
    await ensureCanDisableGranja(id);
  }

  return prisma.granja.update({
    where: { id },
    data,
  });
}

export async function disableGranja(id: number) {
  await ensureGranjaExists(id);
  await ensureCanDisableGranja(id);

  return prisma.granja.update({
    where: { id },
    data: { activo: false },
  });
}

async function ensureGranjaExists(id: number) {
  const granja = await prisma.granja.findUnique({ where: { id } });

  if (!granja) {
    throw new AppError("Granja no encontrada", 404);
  }

  return granja;
}

async function ensureUniqueGranjaName(nombre: string, currentId?: number) {
  const existing = await prisma.granja.findFirst({
    where: {
      nombre: {
        equals: nombre,
        mode: "insensitive",
      },
    },
  });

  if (existing && existing.id !== currentId) {
    throw new AppError("Ya existe una granja con ese nombre", 409, "DUPLICATE_NAME");
  }
}

async function ensureCanDisableGranja(id: number) {
  const jornada = await prisma.jornada.findUnique({
    where: { codigo: getCurrentJornadaCode() },
    select: { id: true, estado: true },
  });

  if (!jornada || jornada.estado !== "abierta") {
    return;
  }

  const entregasActivas = await prisma.entradaGranja.count({
    where: {
      jornada_id: jornada.id,
      granja_id: id,
    },
  });

  if (entregasActivas > 0) {
    throw new AppError("No se puede eliminar una granja con entregas en la jornada activa", 400);
  }
}
