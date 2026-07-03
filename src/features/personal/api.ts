import { apiClient } from "../../lib/api";

export type TipoPersonal = "interno" | "externo";
export type ModalidadPago = "mensual" | "por_hora";
export type RolManoObra = "operario" | "tractorista" | "aplicador" | "tecnico" | "encargado" | "contratista";

export type Personal = {
  personal_bodega_id: string;
  bodega_id: string;
  nombre: string;
  user_id: string | null;
  tipo: TipoPersonal;
  modalidad: ModalidadPago;
  rol: RolManoObra | null;
  sueldo_mensual: string | null;
  costo_hora: string | null;
  dias_mes: number;
  activo: boolean;
  costo_hora_efectivo: number;
};

const q = (bodegaId?: string | number) =>
  bodegaId !== undefined && bodegaId !== null && String(bodegaId).trim()
    ? `?bodegaId=${encodeURIComponent(String(bodegaId))}`
    : "";

export async function fetchPersonal(bodegaId: string | number) {
  const { data } = await apiClient.get<Personal[]>(`/personal${q(bodegaId)}`);
  return data;
}

export async function createPersonal(payload: {
  bodegaId: string | number;
  nombre: string;
  targetUserId?: string;
  tipo: TipoPersonal;
  modalidad: ModalidadPago;
  rol?: RolManoObra | null;
  sueldo_mensual?: number | null;
  costo_hora?: number | null;
  dias_mes?: number;
}) {
  const { data } = await apiClient.post<Personal>("/personal", payload);
  return data;
}

export async function patchPersonal(
  id: string,
  payload: Partial<{
    nombre: string;
    tipo: TipoPersonal;
    modalidad: ModalidadPago;
    rol: RolManoObra | null;
    sueldo_mensual: number | null;
    costo_hora: number | null;
    dias_mes: number;
    activo: boolean;
  }>,
) {
  const { data } = await apiClient.patch<Personal>(`/personal/${id}`, payload);
  return data;
}

export async function deletePersonal(id: string) {
  const { data } = await apiClient.delete<{ deleted: boolean }>(`/personal/${id}`);
  return data;
}
