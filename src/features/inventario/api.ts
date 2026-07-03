import { apiClient } from "../../lib/api";

export type Insumo = {
  insumo_id: string;
  bodega_id: string | null;
  tipo: string;
  nombre_comercial: string;
  principio_activo: string | null;
  unidad_base: string;
  costo_unitario: string | null;
  moneda: string;
  stock_minimo: string | null;
  activo: boolean;
};

const q = (bodegaId?: string | number) =>
  bodegaId !== undefined && bodegaId !== null && String(bodegaId).trim()
    ? `?bodegaId=${encodeURIComponent(String(bodegaId))}`
    : "";

export async function fetchInsumos(bodegaId?: string | number, incluirInactivos = false) {
  const sep = q(bodegaId) ? "&" : "?";
  const extra = incluirInactivos ? `${sep}incluirInactivos=true` : "";
  const { data } = await apiClient.get<Insumo[]>(`/inventario/insumos${q(bodegaId)}${extra}`);
  return data;
}

export async function createInsumo(payload: {
  bodegaId: string | number;
  tipo: string;
  nombre_comercial: string;
  principio_activo?: string | null;
  unidad_base: string;
  costo_unitario?: number | null;
  stock_minimo?: number | null;
}) {
  const { data } = await apiClient.post<Insumo>("/inventario/insumos", payload);
  return data;
}

export async function patchInsumo(
  id: string,
  payload: Partial<{
    tipo: string;
    nombre_comercial: string;
    principio_activo: string | null;
    unidad_base: string;
    costo_unitario: number | null;
    stock_minimo: number | null;
    activo: boolean;
  }>,
) {
  const { data } = await apiClient.patch<Insumo>(`/inventario/insumos/${id}`, payload);
  return data;
}

export async function deleteInsumo(id: string) {
  const { data } = await apiClient.delete<{ deleted: boolean; desactivado: boolean }>(
    `/inventario/insumos/${id}`,
  );
  return data;
}

// ── Stock ──

export type Existencia = {
  insumo_id: string;
  nombre_comercial: string;
  tipo: string;
  unidad_base: string;
  costo_unitario: string | null;
  stock: number;
  stock_minimo: string | null;
  valorizacion: number;
  bajo_minimo: boolean;
};

export type MovimientoStock = {
  movimiento_stock_id: string;
  tipo: "ingreso" | "egreso" | "ajuste";
  cantidad: string;
  unidad: string;
  costo_unitario: string | null;
  motivo: string | null;
  fecha: string;
};

export type Alertas = {
  bajoMinimo: Existencia[];
  lotesPorVencer: {
    insumo_lote_id: string;
    nro_lote: string;
    fecha_vencimiento: string;
    insumo_catalogo: { nombre_comercial: string };
  }[];
};

export async function fetchExistencias(bodegaId: string | number) {
  const { data } = await apiClient.get<Existencia[]>(`/inventario/existencias${q(bodegaId)}`);
  return data;
}

export async function registrarIngreso(payload: {
  bodegaId: string | number;
  insumoId: string;
  cantidad: number;
  costo_unitario?: number | null;
  motivo?: string;
}) {
  const { data } = await apiClient.post("/inventario/movimientos/ingreso", payload);
  return data;
}

export async function registrarAjuste(payload: {
  bodegaId: string | number;
  insumoId: string;
  cantidad: number; // delta con signo
  motivo?: string;
}) {
  const { data } = await apiClient.post("/inventario/movimientos/ajuste", payload);
  return data;
}

export async function fetchMovimientos(insumoId: string, bodegaId: string | number) {
  const { data } = await apiClient.get<MovimientoStock[]>(
    `/inventario/movimientos/${insumoId}${q(bodegaId)}`,
  );
  return data;
}

export async function fetchAlertas(bodegaId: string | number) {
  const { data } = await apiClient.get<Alertas>(`/inventario/alertas${q(bodegaId)}`);
  return data;
}
