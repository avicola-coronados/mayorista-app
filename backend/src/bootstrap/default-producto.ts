import { prisma } from "../lib/prisma";

const DEFAULT_PRODUCTO_CODIGO = "POLLO_VIVO";

export async function ensureDefaultProducto() {
  const producto = await prisma.producto.upsert({
    where: { codigo: DEFAULT_PRODUCTO_CODIGO },
    update: { activo: true, nombre: "Pollo vivo" },
    create: {
      codigo: DEFAULT_PRODUCTO_CODIGO,
      nombre: "Pollo vivo",
      activo: true,
    },
  });

  return producto;
}

export async function getDefaultProductoId() {
  const producto = await ensureDefaultProducto();
  return producto.id;
}
