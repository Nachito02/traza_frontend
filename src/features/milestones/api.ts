import { apiClient } from "../../lib/api";

export type ProtocoloProceso = {
  proceso_id: string;
  nombre: string;
  evento_tipo: string;
  obligatorio: boolean;
  orden: number;
};

export type Milestone = {
  milestone_id: string;
  trazabilidad_id: string;
  proceso_id: string;
  estado: "pendiente" | "completado" | string;
  event_date?: string | null;
  created_by: string;
  protocolo_proceso: ProtocoloProceso;
};

export async function fetchMilestones(trazabilidadId: string) {
  const response = await apiClient.get<Milestone[]>(
    `/trazabilidades/${trazabilidadId}/milestones`
  );
  return response.data;
}

export async function completeMilestone(milestoneId: string) {
  const response = await apiClient.patch<Partial<Milestone>>(
    `/milestones/${milestoneId}`,
    {}
  );
  return response.data;
}
