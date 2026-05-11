import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../services/api";

export function useDashboard(enabled = true) {
  const jornada = useQuery({
    queryKey: ["jornada-activa"],
    queryFn: apiClient.getJornadaActiva,
    refetchInterval: 120000,
  });

  const metricas = useQuery({
    queryKey: ["metricas", jornada.data?.id],
    queryFn: () => apiClient.getMetricas(jornada.data!.id),
    enabled: enabled && Boolean(jornada.data?.id),
    refetchInterval: 120000,
  });

  const sobrante = useQuery({
    queryKey: ["sobrante", jornada.data?.id],
    queryFn: () => apiClient.getSobrante(jornada.data!.id),
    enabled: enabled && Boolean(jornada.data?.id),
    refetchInterval: 120000,
  });

  return { jornada, metricas, sobrante };
}
