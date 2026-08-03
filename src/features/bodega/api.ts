import { apiClient } from "../../lib/api";

export type Bodega = {
  bodega_id: string;
  nombre: string;
  razon_social?: string | null;
  cuit?: string | null;
  codigo?: string | null;
  nro_inscripto_inv?: string | null;
  activo?: boolean;
};

export async function fetchBodega(bodegaId: string) {
  const response = await apiClient.get<Bodega>(`/bodegas/${encodeURIComponent(bodegaId)}`);
  return response.data;
}

export async function updateBodega(
  bodegaId: string,
  payload: Partial<Pick<Bodega, "nombre" | "razon_social" | "cuit" | "codigo" | "nro_inscripto_inv">>,
) {
  const response = await apiClient.patch<Bodega>(`/bodegas/${encodeURIComponent(bodegaId)}`, payload);
  return response.data;
}
