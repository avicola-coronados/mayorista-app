import { Prisma } from "@prisma/client";
import { AppError } from "../../errors/AppError";
import { prisma } from "../../lib/prisma";
import {
  CajeroClientesQuery,
  CajeroEgresosQuery,
  RegistrarEgresoInput,
  RegistrarPagoInput,
} from "./cajero.schemas";

function toNumber(value: Prisma.Decimal | number | null | undefined) {
  if (value instanceof Prisma.Decimal) {
    return value.toNumber();
  }

  return Number(value ?? 0);
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfToday() {
  const date = new Date();
  date.setHours(23, 59, 59, 999);
  return date;
}

function getDayRange(fecha?: string) {
  const baseDate = fecha ? new Date(`${fecha}T00:00:00`) : new Date();
  const start = new Date(baseDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(baseDate);
  end.setHours(23, 59, 59, 999);

  return { end, start };
}

function getMonthRange(mes?: string) {
  const baseDate = mes ? new Date(`${mes}-01T00:00:00`) : new Date();
  const start = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
  const end = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0, 23, 59, 59, 999);

  return { end, start };
}

export async function getClientesCajero(query: CajeroClientesQuery) {
  const where: Prisma.ClienteWhereInput = {
    activo: true,
    ...(query.tipo ? { tipo: query.tipo } : {}),
    ...(query.buscar
      ? {
          OR: [
            { nombre: { contains: query.buscar, mode: "insensitive" } },
            { codigo: { contains: query.buscar, mode: "insensitive" } },
            { documento_num: { contains: query.buscar, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [clientes, pagosHoy] = await Promise.all([
    prisma.cliente.findMany({
      where,
      include: {
        facturas: {
          select: {
            monto_total: true,
            monto_pagado: true,
            saldo_pendiente: true,
            estado: true,
          },
          where: {
            estado: { not: "anulado" },
          },
        },
        pagos: {
          orderBy: { created_at: "desc" },
          take: 1,
          select: {
            created_at: true,
          },
        },
      },
      orderBy: { nombre: "asc" },
    }),
    prisma.pago.aggregate({
      where: {
        created_at: {
          gte: startOfToday(),
          lte: endOfToday(),
        },
        estado: "confirmado",
      },
      _sum: { monto: true },
      _count: { _all: true },
    }),
  ]);

  const clientesConSaldos = clientes.map((cliente) => {
    const saldoPendiente = cliente.facturas.reduce(
      (sum, factura) => sum + toNumber(factura.saldo_pendiente),
      0,
    );
    const montoTotalFacturado = cliente.facturas.reduce(
      (sum, factura) => sum + toNumber(factura.monto_total),
      0,
    );
    const montoTotalPagado = cliente.facturas.reduce(
      (sum, factura) => sum + toNumber(factura.monto_pagado),
      0,
    );
    const numFacturasPendientes = cliente.facturas.filter(
      (factura) => factura.estado !== "pagado",
    ).length;

    return {
      id: cliente.id,
      nombre: cliente.nombre,
      tipo: cliente.tipo,
      documento_tipo: cliente.documento_tipo,
      documento_num: cliente.documento_num,
      contacto: cliente.contacto,
      telefono: cliente.telefono,
      saldo_pendiente: Number(saldoPendiente.toFixed(2)),
      monto_total_facturado: Number(montoTotalFacturado.toFixed(2)),
      monto_total_pagado: Number(montoTotalPagado.toFixed(2)),
      ultimo_pago: cliente.pagos[0]?.created_at ?? null,
      num_facturas_pendientes: numFacturasPendientes,
    };
  });

  const filteredClientes = query.con_deuda
    ? clientesConSaldos.filter((cliente) => cliente.saldo_pendiente > 0)
    : clientesConSaldos;

  return {
    stats: {
      total_clientes: filteredClientes.length,
      total_mayoristas: filteredClientes.filter((cliente) => cliente.tipo === "mayorista").length,
      total_minoristas: filteredClientes.filter((cliente) => cliente.tipo === "minorista").length,
      total_por_cobrar: Number(
        filteredClientes.reduce((sum, cliente) => sum + cliente.saldo_pendiente, 0).toFixed(2),
      ),
      clientes_con_deuda: filteredClientes.filter((cliente) => cliente.saldo_pendiente > 0).length,
      cobrado_hoy: toNumber(pagosHoy._sum.monto),
      pagos_hoy: pagosHoy._count._all,
    },
    clientes: filteredClientes,
  };
}

export async function getDetalleClienteCajero(id: number) {
  const cliente = await prisma.cliente.findFirst({
    where: {
      id,
      activo: true,
    },
    include: {
      facturas: {
        include: {
          jornada: {
            select: {
              id: true,
              codigo: true,
              fecha: true,
            },
          },
          pagos: {
            orderBy: { created_at: "desc" },
            select: {
              id: true,
              monto: true,
              tipo: true,
              metodo: true,
              created_at: true,
              estado: true,
            },
          },
        },
        orderBy: {
          fecha_emision: "desc",
        },
      },
    },
  });

  if (!cliente) {
    return null;
  }

  const totalFacturado = cliente.facturas.reduce(
    (sum, factura) => sum + toNumber(factura.monto_total),
    0,
  );
  const totalPagado = cliente.facturas.reduce(
    (sum, factura) => sum + toNumber(factura.monto_pagado),
    0,
  );
  const saldoPendiente = cliente.facturas.reduce(
    (sum, factura) => sum + toNumber(factura.saldo_pendiente),
    0,
  );

  return {
    cliente: {
      id: cliente.id,
      nombre: cliente.nombre,
      tipo: cliente.tipo,
      documento_tipo: cliente.documento_tipo,
      documento_num: cliente.documento_num,
      contacto: cliente.contacto,
      telefono: cliente.telefono,
      email: cliente.email,
    },
    resumen: {
      total_facturado: Number(totalFacturado.toFixed(2)),
      total_pagado: Number(totalPagado.toFixed(2)),
      saldo_pendiente: Number(saldoPendiente.toFixed(2)),
    },
    facturas: cliente.facturas.map((factura) => ({
      id: factura.id,
      codigo: factura.codigo,
      jornada_id: factura.jornada_id,
      jornada_codigo: factura.jornada.codigo,
      jornada_fecha: factura.jornada.fecha,
      fecha_emision: factura.fecha_emision,
      monto_total: toNumber(factura.monto_total),
      monto_pagado: toNumber(factura.monto_pagado),
      saldo_pendiente: toNumber(factura.saldo_pendiente),
      estado: factura.estado,
      pagos: factura.pagos.map((pago) => ({
        id: pago.id,
        monto: toNumber(pago.monto),
        tipo: pago.tipo,
        metodo: pago.metodo,
        fecha: pago.created_at,
        estado: pago.estado,
      })),
    })),
  };
}

export async function registrarPagoCajero(input: RegistrarPagoInput, cajeroId: number) {
  const today = new Date();

  if (input.fecha_deposito) {
    const depositDate = new Date(`${input.fecha_deposito}T00:00:00`);
    const currentDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    if (depositDate > currentDate) {
      throw new AppError("La fecha del depósito no puede ser futura", 400);
    }
  }

  return prisma.$transaction(async (transaction) => {
    const factura = await transaction.factura.findUnique({
      where: { id: input.factura_id },
    });

    if (!factura) {
      throw new AppError("Factura no encontrada", 404);
    }

    if (factura.cliente_id !== input.cliente_id) {
      throw new AppError("La factura no pertenece al cliente seleccionado", 400);
    }

    if (factura.estado === "anulado") {
      throw new AppError("No se puede registrar pagos en una factura anulada", 400);
    }

    const saldoPendiente = toNumber(factura.saldo_pendiente);
    const monto = Number(input.monto.toFixed(2));

    if (saldoPendiente <= 0) {
      throw new AppError("La factura no tiene saldo pendiente", 400);
    }

    if (monto > saldoPendiente) {
      throw new AppError("El monto del pago no puede exceder el saldo pendiente", 400);
    }

    const estado = input.tipo === "efectivo" ? "confirmado" : "pendiente";
    const pago = await transaction.pago.create({
      data: {
        factura_id: input.factura_id,
        cliente_id: input.cliente_id,
        monto,
        tipo: input.tipo,
        metodo: input.metodo,
        banco: input.banco || null,
        nro_operacion: input.nro_operacion || null,
        fecha_deposito: input.fecha_deposito ? new Date(`${input.fecha_deposito}T00:00:00`) : null,
        hora_deposito: input.hora_deposito ? new Date(`1970-01-01T${input.hora_deposito}:00.000Z`) : null,
        estado,
        observaciones: input.observaciones || null,
        registrado_por: cajeroId,
      },
    });

    if (estado === "confirmado") {
      const montoPagado = Number((toNumber(factura.monto_pagado) + monto).toFixed(2));
      const nuevoSaldo = Number(Math.max(0, toNumber(factura.monto_total) - montoPagado).toFixed(2));
      const nuevoEstado = nuevoSaldo === 0 ? "pagado" : "pago_parcial";

      await transaction.factura.update({
        where: { id: factura.id },
        data: {
          monto_pagado: montoPagado,
          saldo_pendiente: nuevoSaldo,
          estado: nuevoEstado,
        },
      });
    }

    return {
      mensaje:
        input.tipo === "efectivo"
          ? "Pago registrado correctamente"
          : "Depósito registrado. Pendiente de validación por el administrador",
      pago: {
        id: pago.id,
        monto: toNumber(pago.monto),
        tipo: pago.tipo,
        estado: pago.estado,
        created_at: pago.created_at,
      },
    };
  });
}

export async function getEgresosCajero(query: CajeroEgresosQuery) {
  const dayRange = getDayRange(query.fecha);
  const monthRange = getMonthRange(query.mes);

  const [egresosDia, egresosMes] = await Promise.all([
    prisma.egreso.findMany({
      where: {
        fecha: {
          gte: dayRange.start,
          lte: dayRange.end,
        },
      },
      include: {
        cajero: {
          select: {
            nombre: true,
            username: true,
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
    }),
    prisma.egreso.aggregate({
      where: {
        fecha: {
          gte: monthRange.start,
          lte: monthRange.end,
        },
      },
      _sum: {
        monto: true,
      },
      _count: {
        _all: true,
      },
    }),
  ]);

  const totalDia = egresosDia.reduce((sum, egreso) => sum + toNumber(egreso.monto), 0);

  return {
    stats: {
      total_dia: Number(totalDia.toFixed(2)),
      num_movimientos_dia: egresosDia.length,
      total_mes: Number(toNumber(egresosMes._sum.monto).toFixed(2)),
      num_movimientos_mes: egresosMes._count._all,
      mes_nombre: monthRange.start.toLocaleDateString("es-PE", {
        month: "long",
        year: "numeric",
      }),
    },
    egresos: egresosDia.map((egreso) => ({
      id: egreso.id,
      concepto: egreso.concepto,
      descripcion: egreso.descripcion,
      monto: toNumber(egreso.monto),
      metodo_pago: egreso.metodo_pago,
      beneficiario: egreso.beneficiario,
      comprobante: egreso.comprobante,
      fecha: egreso.fecha,
      hora: egreso.created_at.toLocaleTimeString("es-PE", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }),
      registrado_por: egreso.cajero.nombre || egreso.cajero.username,
    })),
  };
}

export async function registrarEgresoCajero(input: RegistrarEgresoInput, cajeroId: number) {
  const monto = Number(input.monto.toFixed(2));

  const egreso = await prisma.egreso.create({
    data: {
      concepto: input.concepto,
      descripcion: input.descripcion,
      monto,
      metodo_pago: input.metodo_pago,
      beneficiario: input.beneficiario,
      comprobante: input.comprobante || null,
      fecha: new Date(),
      registrado_por: cajeroId,
    },
    include: {
      cajero: {
        select: {
          nombre: true,
          username: true,
        },
      },
    },
  });

  return {
    mensaje: "Egreso registrado correctamente",
    egreso: {
      id: egreso.id,
      concepto: egreso.concepto,
      monto: toNumber(egreso.monto),
      beneficiario: egreso.beneficiario,
      fecha: egreso.fecha,
      registrado_por: egreso.cajero.nombre || egreso.cajero.username,
    },
  };
}
