import { apiClient } from "../../lib/api";

export type MilestoneEventoLink = {
  milestone_evento_id: string;
  evento_tabla: string;
  evento_id: string;
  created_at: string;
};

export type DeleteEventoResponse = {
  deleted: boolean;
};

export async function createEvento(
  tipo: string,
  payload: Record<string, unknown>
) {
  const response = await apiClient.post(`/eventos/${tipo}`, payload);
  return response.data;
}

export async function fetchEventosByMilestone(milestoneId: string, tipo?: string) {
  const query = tipo ? `?tipo=${encodeURIComponent(tipo)}` : "";
  const response = await apiClient.get<MilestoneEventoLink[]>(
    `/eventos/milestone/${encodeURIComponent(milestoneId)}${query}`,
  );
  return response.data ?? [];
}

export async function fetchEventoByMilestone(
  milestoneId: string,
  tipo: string,
  eventoId: string,
) {
  const response = await apiClient.get<Record<string, unknown>>(
    `/eventos/milestone/${encodeURIComponent(milestoneId)}/${encodeURIComponent(tipo)}/${encodeURIComponent(eventoId)}`,
  );
  return response.data;
}

export async function deleteEventoByMilestone(
  milestoneId: string,
  tipo: string,
  eventoId: string,
) {
  const response = await apiClient.delete<DeleteEventoResponse>(
    `/eventos/milestone/${encodeURIComponent(milestoneId)}/${encodeURIComponent(tipo)}/${encodeURIComponent(eventoId)}`,
  );
  return response.data;
}
