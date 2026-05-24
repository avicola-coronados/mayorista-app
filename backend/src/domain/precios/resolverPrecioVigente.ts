export type PrecioRecord = {
  id: string;
  producto_id: number;
  precio: number;
  fecha_desde: string;
  fecha_hasta: string | null;
  vigente: boolean;
};

export type PrecioVigenteOrigen = "rango" | "ultimo_disponible" | "default";

export type PrecioVigenteResuelto = {
  precio: number;
  precio_id: string | null;
  fecha_desde: string;
  producto_id: number;
  origen: PrecioVigenteOrigen;
};

export const DEFAULT_PRECIO_KG = 5;

export function toDateKey(value: Date | string) {
  if (typeof value === "string") {
    return value.slice(0, 10);
  }

  return value.toISOString().slice(0, 10);
}

export function isPrecioActivoEnFecha(precio: PrecioRecord, fecha: string) {
  const desde = precio.fecha_desde;
  const hasta = precio.fecha_hasta;

  if (desde > fecha) {
    return false;
  }

  if (hasta && hasta < fecha) {
    return false;
  }

  return true;
}

export function resolverPrecioVigente(
  precios: PrecioRecord[],
  productoId: number,
  fecha: string,
  defaultPrecio = DEFAULT_PRECIO_KG,
): PrecioVigenteResuelto {
  const delProducto = precios
    .filter((item) => item.producto_id === productoId)
    .sort((a, b) => {
      if (a.fecha_desde === b.fecha_desde) {
        return b.vigente === a.vigente ? 0 : b.vigente ? 1 : -1;
      }

      return a.fecha_desde < b.fecha_desde ? 1 : -1;
    });

  const enRango = delProducto.find((item) => isPrecioActivoEnFecha(item, fecha));

  if (enRango) {
    return {
      precio: enRango.precio,
      precio_id: enRango.id,
      fecha_desde: enRango.fecha_desde,
      producto_id: productoId,
      origen: "rango",
    };
  }

  const ultimo = delProducto.find((item) => item.fecha_desde <= fecha);

  if (ultimo) {
    return {
      precio: ultimo.precio,
      precio_id: ultimo.id,
      fecha_desde: ultimo.fecha_desde,
      producto_id: productoId,
      origen: "ultimo_disponible",
    };
  }

  return {
    precio: defaultPrecio,
    precio_id: null,
    fecha_desde: fecha,
    producto_id: productoId,
    origen: "default",
  };
}

export function cerrarPrecioVigente(precio: PrecioRecord, fechaCierre: string): PrecioRecord {
  return {
    ...precio,
    vigente: false,
    fecha_hasta: fechaCierre,
  };
}
