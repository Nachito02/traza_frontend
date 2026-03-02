import { apiClient } from "../../lib/api";

export type Finca = {
  finca_id?: string;
  id?: string;
  nombre?: string;
  nombre_finca?: string;
  name?: string;
  ubicacion?: string | null;
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

export async function createFinca(payload: CreateFincaPayload) {
  const response = await apiClient.post<Finca>("/fincas", payload);
  return response.data;
}
