import { apiClient } from "../../lib/api";

export type Operario = {
  user_id: string;
  nombre: string;
  email: string | null;
  whatsapp_e164?: string | null;
  is_active: boolean;
  user_bodega?: Array<{
    user_bodega_rol?: Array<{ rol: string }>;
  }>;
};

export async function fetchOperariosByBodega(bodegaId: string | number) {
  const response = await apiClient.get<Operario[]>(
    `/operarios/bodega/${encodeURIComponent(String(bodegaId))}`,
  );
  return response.data ?? [];
}

export async function createOperario(
  bodegaId: string | number,
  payload: { nombre: string; whatsapp_e164?: string },
) {
  const response = await apiClient.post<Operario>(
    `/operarios/bodega/${encodeURIComponent(String(bodegaId))}`,
    payload,
  );
  return response.data;
}

export async function deleteOperario(userId: string) {
  await apiClient.delete(`/operarios/${encodeURIComponent(userId)}`);
}
