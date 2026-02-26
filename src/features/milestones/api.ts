import { apiClient } from "../../lib/api";

export type ProtocoloProceso = {
  proceso_id: string;
  nombre: string;
  evento_tipo: string;
  obligatorio: boolean;
  orden: number;
  protocolo_etapa: {
    etapa_id: string;
    nombre: string;
    orden: number;
  };
};

export type Evidencia = {
  evidencia_id: string;
  milestone_id: string;
  tipo: string;
  url: string;
  created_at: string;
};

export type Milestone = {
  milestone_id: string;
  trazabilidad_id: string;
  proceso_id: string;
  estado: "pendiente" | "completado" | "validado" | "rechazado" | string;
  event_date?: string | null;
  created_by: string;
  protocolo_proceso: ProtocoloProceso;
  evidencia: Evidencia[];
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

export async function uploadEvidence(milestoneId: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);
  // Default tipo 'imagen' for now, can be extended
  formData.append("tipo", "imagen");

  const response = await apiClient.post<Evidencia>(
    `/milestones/${milestoneId}/evidence`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
  return response.data;
}
