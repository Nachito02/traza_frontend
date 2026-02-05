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
  const response = await apiClient.get<Finca[]>(
    `/bodegas/${bodegaId}/fincas`
  );
  return response.data;
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
