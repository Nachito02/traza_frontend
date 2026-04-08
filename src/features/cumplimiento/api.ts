import { apiClient } from "../../lib/api";

export type HallazgoCumplimiento = {
  hallazgo_id: string;
  trazabilidad_id?: string | null;
  milestone_id?: string | null;
  regla_codigo?: string | null;
  severidad: "bloqueo" | "alerta" | "info" | string;
  estado: "abierto" | "en_proceso" | "resuelto" | "aceptado" | "anulado" | string;
  titulo?: string | null;
  mensaje?: string | null;
  created_at?: string;
};

export type CumplimientoIndicadores = {
  agua?: {
    total_riegos?: number;
    total_volumen_m3?: number;
    m3_por_ha?: number | null;
  };
  fitosanitarios?: {
    aplicaciones_total?: number;
    aplicaciones_con_monitoreo_previo?: number;
    aplicaciones_sin_monitoreo_previo?: number;
  };
  cosecha?: {
    cosechas_total?: number;
    lotes_generados?: number;
    cosechas_con_carencia_vencida?: number;
  };
  cumplimiento?: {
    hallazgos_abiertos_total?: number;
    hallazgos_por_severidad?: {
      bloqueo?: number;
      alerta?: number;
      info?: number;
    };
  };
};

export async function fetchHallazgosByTrazabilidad(trazabilidadId: string) {
  const response = await apiClient.get<HallazgoCumplimiento[]>(
    `/cumplimiento/hallazgos?trazabilidadId=${encodeURIComponent(trazabilidadId)}`,
  );
  return response.data ?? [];
}

export async function fetchIndicadoresByTrazabilidad(trazabilidadId: string) {
  const response = await apiClient.get<CumplimientoIndicadores>(
    `/cumplimiento/indicadores?trazabilidadId=${encodeURIComponent(trazabilidadId)}`,
  );
  return response.data;
}
