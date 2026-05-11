import { prisma } from "../../lib/prisma";

export function getClientesActivos() {
  return prisma.cliente.findMany({
    where: { activo: true },
    orderBy: { nombre: "asc" },
  });
}
