import { prisma } from "../../lib/prisma";

export function getGranjasActivas() {
  return prisma.granja.findMany({
    where: { activo: true },
    orderBy: { nombre: "asc" },
  });
}
