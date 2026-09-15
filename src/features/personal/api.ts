import { apiClient } from "../../lib/api";

export type TipoPersonal = "interno" | "externo";
export type ModalidadPago = "mensual" | "por_hora" | "al_tanto" | "otro";
export type RolManoObra = "operario" | "tractorista" | "aplicador" | "tecnico" | "encargado" | "contratista";

/** Etiquetas de rol y modalidad, compartidas por el ABM de personal y la carga de actividades. */
export const ROL_LABELS: Record<RolManoObra, string> = {
  operario: "Operario",
  tractorista: "Tractorista",
  aplicador: "Aplicador",
  tecnico: "Técnico",
  encargado: "Encargado",
  contratista: "Contratista",
};

export const MODALIDAD_LABELS: Record<ModalidadPago, string> = {
  por_hora: "Por hora",
  mensual: "Mensualizado",
  al_tanto: "Al tanto",
  otro: "Otro",
};

export type Personal = {
  personal_bodega_id: string;
  bodega_id: string;
  nombre: string;
  legajo: string | null;
  fecha_ingreso: string | null;
  user_id: string | null;
  tipo: TipoPersonal;
  modalidad: ModalidadPago;
  rol: RolManoObra | null;
  sueldo_mensual: string | null;
  costo_hora: string | null;
  costo_unitario: string | null;
  dias_mes: number;
  activo: boolean;
  costo_hora_efectivo: number;
  antiguedad_anios: number | null;
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
  legajo?: string | null;
  fecha_ingreso?: string | null;
  targetUserId?: string;
  tipo: TipoPersonal;
  modalidad: ModalidadPago;
  rol?: RolManoObra | null;
  sueldo_mensual?: number | null;
  costo_hora?: number | null;
  costo_unitario?: number | null;
  dias_mes?: number;
}) {
  const { data } = await apiClient.post<Personal>("/personal", payload);
  return data;
}

export async function patchPersonal(
  id: string,
  payload: Partial<{
    nombre: string;
    legajo: string | null;
    fecha_ingreso: string | null;
    tipo: TipoPersonal;
    modalidad: ModalidadPago;
    rol: RolManoObra | null;
    sueldo_mensual: number | null;
    costo_hora: number | null;
    costo_unitario: number | null;
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
