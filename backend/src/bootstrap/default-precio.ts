import { UserRole } from "@prisma/client";
import { ensureDefaultProducto } from "./default-producto";
import { DEFAULT_PRECIO_KG } from "../domain/precios/resolverPrecioVigente";
import { prisma } from "../lib/prisma";
import { getCurrentDateInTimezone } from "../utils/date";

export async function ensureDefaultPrecio() {
  const producto = await ensureDefaultProducto();

  const existing = await prisma.precio.findFirst({
    where: {
      producto_id: producto.id,
      vigente: true,
    },
  });

  if (existing) {
    return existing;
  }

  const creador =
    (await prisma.usuario.findFirst({
      where: { role: UserRole.oficina, activo: true },
      orderBy: { id: "asc" },
    })) ??
    (await prisma.usuario.findFirst({
      where: { role: UserRole.admin, activo: true },
      orderBy: { id: "asc" },
    }));

  if (!creador) {
    return null;
  }

  const fechaDesde = new Date(`${getCurrentDateInTimezone()}T12:00:00.000Z`);

  return prisma.precio.create({
    data: {
      producto_id: producto.id,
      precio: DEFAULT_PRECIO_KG,
      fecha_desde: fechaDesde,
      vigente: true,
      creado_por: creador.id,
    },
  });
}
