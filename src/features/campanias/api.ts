import { apiClient } from "../../lib/api";

export type Campania = {
  campania_id?: string;
  id?: string;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: "abierta" | "cerrada" | string;
};

export type CreateCampaniaPayload = {
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: "abierta" | "cerrada";
};

export async function createCampania(payload: CreateCampaniaPayload) {
  const response = await apiClient.post<Campania>("/campanias", payload);
  return response.data;
}

export async function fetchCampanias() {
  const response = await apiClient.get<Campania[]>("/campanias");
  return response.data;
}
