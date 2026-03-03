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
  bodegaId?: string | number;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: "abierta" | "cerrada";
};

export async function createCampania(payload: CreateCampaniaPayload) {
  const response = await apiClient.post<Campania>("/campanias", payload);
  return response.data;
}

export async function fetchCampanias(bodegaId?: string | number) {
  const query =
    bodegaId !== undefined && bodegaId !== null && String(bodegaId).trim()
      ? `?bodegaId=${encodeURIComponent(String(bodegaId))}`
      : "";
  const response = await apiClient.get<Campania[]>(`/campanias${query}`);
  return response.data;
}

export async function patchCampania(
  campaniaId: string | number,
  payload: Partial<CreateCampaniaPayload>,
) {
  const response = await apiClient.patch<Campania>(
    `/campanias/${encodeURIComponent(String(campaniaId))}`,
    payload,
  );
  return response.data;
}

export async function deleteCampania(campaniaId: string | number) {
  await apiClient.delete(`/campanias/${encodeURIComponent(String(campaniaId))}`);
}
