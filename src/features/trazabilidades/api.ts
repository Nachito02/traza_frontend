import { apiClient } from "../../lib/api";

export type Trazabilidad = {
  trazabilidad_id: string;
  bodega_id: string;
  finca_id: string | null;
  cuartel_id: string | null;
  campania_id: string;
  protocolo_id: string;
  estado: string;
  nombre_producto?: string | null;
  imagen_producto?: string | null;
  trazabilidad_origen?: Array<{
    finca_id: string;
    cuartel_id: string;
    estado?: string | null;
  }>;
};

export type CreateTrazabilidadPayload = {
  protocoloId: string;
  bodegaId: string;
  fincaId?: string | null;
  cuartelId?: string | null;
  campaniaId: string;
  nombre_producto?: string | null;
  imagen_producto?: string | null;
};

export type CreateTrazabilidadOrigenPayload = {
  fincaId: string;
  cuartelId: string;
  estado?: string;
};

export async function fetchTrazabilidad(trazabilidadId: string) {
  const response = await apiClient.get<Trazabilidad>(
    `/trazabilidades/${trazabilidadId}`
  );
  return response.data;
}

export async function fetchTrazabilidades(bodegaId?: string | number) {
  const query = bodegaId ? `?bodegaId=${encodeURIComponent(bodegaId)}` : "";
  const response = await apiClient.get<Trazabilidad[]>(
    `/trazabilidades${query}`
  );
  return response.data;
}

export async function createTrazabilidad(payload: CreateTrazabilidadPayload) {
  const response = await apiClient.post<Trazabilidad>("/trazabilidades", payload);
  return response.data;
}

export async function createTrazabilidadOrigen(
  trazabilidadId: string,
  payload: CreateTrazabilidadOrigenPayload,
) {
  const response = await apiClient.post(
    `/trazabilidades/${encodeURIComponent(trazabilidadId)}/origenes`,
    {
      fincaId: payload.fincaId,
      cuartelId: payload.cuartelId,
      finca_id: payload.fincaId,
      cuartel_id: payload.cuartelId,
      estado: payload.estado ?? "habilitada",
    },
  );
  return response.data;
}
