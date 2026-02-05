import { apiClient } from "../../lib/api";

export type Cuartel = {
  cuartel_id?: string;
  id?: string;
  codigo_cuartel: string;
  superficie_ha: number;
  cultivo: string;
  variedad: string;
  sistema_productivo?: string | null;
  sistema_conduccion?: string | null;
};

export type CreateCuartelPayload = {
  fincaId: string | number;
  codigo_cuartel: string;
  superficie_ha: number;
  cultivo: string;
  variedad: string;
  sistema_productivo?: string | null;
  sistema_conduccion?: string | null;
};

export async function createCuartel(payload: CreateCuartelPayload) {
  const response = await apiClient.post<Cuartel>("/cuarteles", payload);
  return response.data;
}

export async function fetchCuartelesByFinca(fincaId: string | number) {
  const response = await apiClient.get<Cuartel[]>(
    `/cuarteles/finca/${fincaId}`
  );
  return response.data;
}
