import { apiClient } from "../../lib/api";

export type EventoRiegoPayload = {
  milestoneId: string;
  fecha: string;
  cuartelId: string;
  campaniaId: string;
  volumen: number;
  unidad: string;
  sistema_riego: string;
  responsable_persona_id?: string | null;
};

export type EventoCosechaPayload = {
  milestoneId: string;
  fecha_cosecha: string;
  cuartelId: string;
  campaniaId: string;
  cantidad: number;
  unidad: string;
  destino: string;
  responsable_persona_id?: string | null;
};

export async function createEventoRiego(payload: EventoRiegoPayload) {
  const response = await apiClient.post("/eventos/riego", payload);
  return response.data;
}

export async function createEventoCosecha(payload: EventoCosechaPayload) {
  const response = await apiClient.post("/eventos/cosecha", payload);
  return response.data;
}

export async function createEvento(
  tipo: string,
  payload: Record<string, unknown>
) {
  const response = await apiClient.post(`/eventos/${tipo}`, payload);
  return response.data;
}
