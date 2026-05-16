import { calculateJornadaMetrics } from "../jornadas/jornadas.service";

export async function getSobranteByJornadaId(jornadaId: number) {
  const metrics = await calculateJornadaMetrics(jornadaId);
  const pesoNeto = Math.max(0, metrics.piso_disponible_kg);
  const jabasEstimadas = Math.round(pesoNeto / 50);

  if (pesoNeto <= 0 && jabasEstimadas <= 0) {
    return [];
  }

  return [
    {
      id: 0,
      jabas: jabasEstimadas,
      peso_neto: pesoNeto,
    },
  ];
}
