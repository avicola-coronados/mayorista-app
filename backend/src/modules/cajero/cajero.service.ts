import { GuiaEstado, Prisma } from "@prisma/client";
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

function calcularResumenCobroGuia(params: {
  totalGeneral: number;
  estadoGuia: GuiaEstado;
  pagosConfirmados: number;
}) {
  if (params.estadoGuia === GuiaEstado.anulada) {
    return {
      estado: "anulado" as const,
      monto_pagado: 0,
      saldo_pendiente: 0,
    };
  }

  const montoPagado = Number(params.pagosConfirmados.toFixed(2));
  const saldoPendiente = Number(Math.max(0, params.totalGeneral - montoPagado).toFixed(2));
  const estado = saldoPendiente === 0 ? "pagado" : montoPagado > 0 ? "pago_parcial" : "pendiente";

  return {
    estado,
    monto_pagado: montoPagado,
    saldo_pendiente: saldoPendiente,
  };
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
        guias: {
          select: {
            total_general: true,
            estado: true,
            pagos: {
              where: { estado: "confirmado" },
              select: { monto: true },
            },
          },
          where: {
            estado: { not: GuiaEstado.anulada },
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
    const resumenGuias = cliente.guias.map((guia) => {
      const totalGeneral = toNumber(guia.total_general);
      const pagosConfirmados = guia.pagos.reduce((sum, pago) => sum + toNumber(pago.monto), 0);
      return calcularResumenCobroGuia({
        totalGeneral,
        estadoGuia: guia.estado,
        pagosConfirmados,
      });
    });
    const saldoPendiente = resumenGuias.reduce((sum, guia) => sum + guia.saldo_pendiente, 0);
    const montoTotalGuias = cliente.guias.reduce((sum, guia) => sum + toNumber(guia.total_general), 0);
    const montoTotalPagado = resumenGuias.reduce((sum, guia) => sum + guia.monto_pagado, 0);
    const numGuiasPendientes = resumenGuias.filter((guia) => guia.estado !== "pagado").length;

    return {
      id: cliente.id,
      nombre: cliente.nombre,
      tipo: cliente.tipo,
      documento_tipo: cliente.documento_tipo,
      documento_num: cliente.documento_num,
      contacto: cliente.contacto,
      telefono: cliente.telefono,
      saldo_pendiente: Number(saldoPendiente.toFixed(2)),
      monto_total_guias: Number(montoTotalGuias.toFixed(2)),
      monto_total_pagado: Number(montoTotalPagado.toFixed(2)),
      ultimo_pago: cliente.pagos[0]?.created_at ?? null,
      num_guias_pendientes: numGuiasPendientes,
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
      guias: {
        where: {
          estado: { not: GuiaEstado.anulada },
        },
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

  const totalGuias = cliente.guias.reduce((sum, guia) => sum + toNumber(guia.total_general), 0);
  const resumenGuias = cliente.guias.map((guia) => {
    const totalGeneral = toNumber(guia.total_general);
    const pagosConfirmados = guia.pagos
      .filter((pago) => pago.estado === "confirmado")
      .reduce((sum, pago) => sum + toNumber(pago.monto), 0);

    return calcularResumenCobroGuia({
      totalGeneral,
      estadoGuia: guia.estado,
      pagosConfirmados,
    });
  });
  const totalPagado = resumenGuias.reduce(
    (sum, guia) => sum + guia.monto_pagado,
    0,
  );
  const saldoPendiente = resumenGuias.reduce((sum, guia) => sum + guia.saldo_pendiente, 0);

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
      total_guias: Number(totalGuias.toFixed(2)),
      total_pagado: Number(totalPagado.toFixed(2)),
      saldo_pendiente: Number(saldoPendiente.toFixed(2)),
    },
    guias: cliente.guias.map((guia) => {
      const totalGeneral = toNumber(guia.total_general);
      const pagosConfirmados = guia.pagos
        .filter((pago) => pago.estado === "confirmado")
        .reduce((sum, pago) => sum + toNumber(pago.monto), 0);
      const resumenCobro = calcularResumenCobroGuia({
        totalGeneral,
        estadoGuia: guia.estado,
        pagosConfirmados,
      });

      return {
        id: guia.id,
        numero: guia.numero,
        jornada_id: guia.jornada_id,
        jornada_codigo: guia.jornada.codigo,
        jornada_fecha: guia.jornada.fecha,
        fecha_emision: guia.fecha_emision,
        estado_guia: guia.estado === GuiaEstado.borrador ? "abierta" : "cerrada",
        monto_total: totalGeneral,
        monto_pagado: resumenCobro.monto_pagado,
        saldo_pendiente: resumenCobro.saldo_pendiente,
        estado_cobro: resumenCobro.estado,
        pagos: guia.pagos.map((pago) => ({
        id: pago.id,
        monto: toNumber(pago.monto),
        tipo: pago.tipo,
        metodo: pago.metodo,
        fecha: pago.created_at,
        estado: pago.estado,
      })),
      };
    }),
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
    const guia = await transaction.guiaEntrega.findUnique({
      where: { id: input.guia_id },
      include: {
        pagos: {
          where: {
            estado: "confirmado",
          },
          select: {
            monto: true,
          },
        },
      },
    });

    if (!guia) {
      throw new AppError("Guía no encontrada", 404);
    }

    if (guia.cliente_id !== input.cliente_id) {
      throw new AppError("La guía no pertenece al cliente seleccionado", 400);
    }

    if (guia.estado === GuiaEstado.anulada) {
      throw new AppError("No se puede registrar pagos en una guía anulada", 400);
    }

    const pagosConfirmados = guia.pagos.reduce((sum, pago) => sum + toNumber(pago.monto), 0);
    const resumenCobro = calcularResumenCobroGuia({
      totalGeneral: toNumber(guia.total_general),
      estadoGuia: guia.estado,
      pagosConfirmados,
    });
    const saldoPendiente = resumenCobro.saldo_pendiente;
    const monto = Number(input.monto.toFixed(2));

    if (saldoPendiente <= 0) {
      throw new AppError("La guía no tiene saldo pendiente", 400);
    }

    if (monto > saldoPendiente) {
      throw new AppError("El monto del pago no puede exceder el saldo pendiente", 400);
    }

    const estado = input.tipo === "efectivo" ? "confirmado" : "pendiente";
    const pago = await transaction.pago.create({
      data: {
        guia_id: input.guia_id,
        factura_id: null,
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
