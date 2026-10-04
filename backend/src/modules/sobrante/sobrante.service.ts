import { calculateJornadaMetrics } from "../jornadas/jornadas.service";

export async function getSobranteByJornadaId(jornadaId: number) {
  const metrics = await calculateJornadaMetrics(jornadaId);
  const pesoNeto = Math.max(0, metrics.piso_disponible_kg);

  if (pesoNeto <= 0) {
    return [];
  }

  return [
    {
      id: 0,
      jabas: 0,
      peso_neto: pesoNeto,
    },
  ];
}
