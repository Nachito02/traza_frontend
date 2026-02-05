import { apiClient } from "../../lib/api";

export type Trazabilidad = {
  trazabilidad_id: string;
  bodega_id: string;
  finca_id: string;
  cuartel_id: string;
  campania_id: string;
  protocolo_id: string;
  estado: string;
};

export type CreateTrazabilidadPayload = {
  protocoloId: string;
  bodegaId: string;
  fincaId: string;
  cuartelId: string;
  campaniaId: string;
  nombre_producto?: string | null;
  imagen_producto?: string | null;
};

export async function fetchTrazabilidad(trazabilidadId: string) {
  const response = await apiClient.get<Trazabilidad>(
    `/trazabilidades/${trazabilidadId}`
  );
  return response.data;
}

export async function createTrazabilidad(payload: CreateTrazabilidadPayload) {
  const response = await apiClient.post<Trazabilidad>("/trazabilidades", payload);
  return response.data;
}
