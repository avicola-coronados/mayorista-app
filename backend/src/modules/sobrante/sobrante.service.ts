import { calculateJornadaMetrics } from "../jornadas/jornadas.service";
import { getPisoDisponible } from "../lineas-venta/piso-disponible.service";

export async function getSobranteByJornadaId(jornadaId: number) {
  const [metrics, pisoOperativo] = await Promise.all([
    calculateJornadaMetrics(jornadaId),
    getPisoDisponible(jornadaId),
  ]);
  const pesoNeto = Math.max(0, metrics.piso_disponible_kg);
  const jabasDisponibles = pisoOperativo.jabas;

  if (pesoNeto <= 0 && jabasDisponibles <= 0) {
    return [];
  }

  return [
    {
      id: 0,
      jabas: jabasDisponibles,
      peso_neto: pesoNeto,
    },
  ];
}
