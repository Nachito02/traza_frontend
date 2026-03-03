import axios from "axios";
import { apiClient } from "../../lib/api";

export type Finca = {
  finca_id?: string;
  id?: string;
  nombre?: string;
  nombre_finca?: string;
  name?: string;
  ubicacion?: string | null;
  ubicacion_texto?: string | null;
  rut?: string | null;
  renspa?: string | null;
  catastro?: string | null;
  created_at?: string;
};

export async function fetchFincas(bodegaId: string | number) {
  const normalizedBodegaId = encodeURIComponent(String(bodegaId));
  try {
    const response = await apiClient.get<Finca[]>(
      `/bodegas/${normalizedBodegaId}/fincas`,
    );
    return response.data ?? [];
  } catch {
    // Compatibilidad con backends que exponen fincas por query.
    const response = await apiClient.get<Finca[] | { items?: Finca[] }>(
      `/fincas?bodegaId=${normalizedBodegaId}`,
    );
    if (Array.isArray(response.data)) {
      return response.data;
    }
    return response.data?.items ?? [];
  }
}

export type CreateFincaPayload = {
  bodegaId: string | number;
  nombre_finca: string;
  rut?: string | null;
  renspa?: string | null;
  catastro?: string | null;
  ubicacion_texto?: string | null;
};

export type UpdateFincaPayload = {
  nombre_finca: string;
  rut?: string | null;
  renspa?: string | null;
  catastro?: string | null;
  ubicacion_texto?: string | null;
};

export async function createFinca(payload: CreateFincaPayload) {
  const response = await apiClient.post<Finca>("/fincas", payload);
  return response.data;
}

export async function fetchFincaById(fincaId: string | number) {
  const encodedId = encodeURIComponent(String(fincaId));
  const response = await apiClient.get<Finca>(`/fincas/${encodedId}`);
  return response.data;
}

export async function patchFinca(
  fincaId: string | number,
  payload: UpdateFincaPayload,
) {
  const encodedId = encodeURIComponent(String(fincaId));

  try {
    const response = await apiClient.patch<Finca>(`/fincas/${encodedId}`, payload);
    return response.data;
  } catch (error) {
    if (!axios.isAxiosError(error)) throw error;
    const status = error.response?.status;
    if (status !== 404 && status !== 405) throw error;
  }

  try {
    const response = await apiClient.put<Finca>(`/fincas/${encodedId}`, payload);
    return response.data;
  } catch (error) {
    if (!axios.isAxiosError(error)) throw error;
    const status = error.response?.status;
    if (status !== 404 && status !== 405) throw error;
  }

  const response = await apiClient.put<Finca>(
    `/fincas/${encodedId}`,
    payload,
  );
  return response.data;
}

export async function deleteFinca(fincaId: string | number) {
  await apiClient.delete(`/fincas/${encodeURIComponent(String(fincaId))}`);
}
