import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../services/api";

export function useDashboard() {
  const jornada = useQuery({
    queryKey: ["jornada-activa"],
    queryFn: apiClient.getJornadaActiva,
  });

  const metricas = useQuery({
    queryKey: ["metricas", jornada.data?.id],
    queryFn: () => apiClient.getMetricas(jornada.data!.id),
    enabled: Boolean(jornada.data?.id),
  });

  const sobrante = useQuery({
    queryKey: ["sobrante", jornada.data?.id],
    queryFn: () => apiClient.getSobrante(jornada.data!.id),
    enabled: Boolean(jornada.data?.id),
  });

  return { jornada, metricas, sobrante };
}
