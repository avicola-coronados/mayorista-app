import { getPisoDisponible } from "../lineas-venta/piso-disponible.service";

export async function getSobranteByJornadaId(jornadaId: number) {
  const pisoDisponible = await getPisoDisponible(jornadaId);

  if (pisoDisponible.peso_neto <= 0 && pisoDisponible.jabas <= 0) {
    return [];
  }

  return [
    {
      id: 0,
      jabas: Math.max(0, pisoDisponible.jabas),
      peso_neto: Math.max(0, pisoDisponible.peso_neto),
    },
  ];
}
