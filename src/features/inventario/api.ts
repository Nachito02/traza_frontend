import { apiClient } from "../../lib/api";

export type AmbitoInsumo = "finca" | "bodega";

export type Insumo = {
  insumo_id: string;
  bodega_id: string | null;
  ambito: AmbitoInsumo;
  tipo: string;
  familia: string | null;
  nombre_comercial: string;
  principio_activo: string | null;
  unidad_base: string;
  dosis_min: string | null;
  dosis_max: string | null;
  unidad_dosis: string | null;
  proveedor: string | null;
  costo_unitario: string | null;
  moneda: string;
  vigencia: string | null;
  stock_minimo: string | null;
  marca: string | null;
  fabricante: string | null;
  presentacion: string | null;
  activo: boolean;
};

// Fila del catálogo maestro global (referencia para autocompletar).
export type InsumoMaestro = {
  insumo_maestro_id: string;
  ambito: AmbitoInsumo;
  categoria: string;
  familia: string | null;
  principio_activo: string | null;
  nombre_comercial: string;
  unidad: string | null;
  dosis_min: string | null;
  dosis_max: string | null;
  unidad_dosis: string | null;
};

export type InsumoInput = {
  ambito: AmbitoInsumo;
  tipo: string;
  familia?: string | null;
  nombre_comercial: string;
  principio_activo?: string | null;
  unidad_base: string;
  dosis_min?: number | null;
  dosis_max?: number | null;
  unidad_dosis?: string | null;
  proveedor?: string | null;
  costo_unitario?: number | null;
  vigencia?: string | null;
  stock_minimo?: number | null;
  marca?: string | null;
  fabricante?: string | null;
  presentacion?: string | null;
};

const q = (bodegaId?: string | number) =>
  bodegaId !== undefined && bodegaId !== null && String(bodegaId).trim()
    ? `?bodegaId=${encodeURIComponent(String(bodegaId))}`
    : "";

export async function fetchInsumos(bodegaId?: string | number, ambito?: AmbitoInsumo, incluirInactivos = false) {
  const params = new URLSearchParams();
  if (bodegaId !== undefined && bodegaId !== null && String(bodegaId).trim()) {
    params.set("bodegaId", String(bodegaId));
  }
  if (ambito) params.set("ambito", ambito);
  if (incluirInactivos) params.set("incluirInactivos", "true");
  const qs = params.toString();
  const { data } = await apiClient.get<Insumo[]>(`/inventario/insumos${qs ? `?${qs}` : ""}`);
  return data;
}

export async function fetchCategoriasMaestro(ambito: AmbitoInsumo) {
  const { data } = await apiClient.get<string[]>(`/inventario/maestro/categorias?ambito=${ambito}`);
  return data;
}

export async function fetchMaestro(ambito: AmbitoInsumo, categoria: string) {
  const { data } = await apiClient.get<InsumoMaestro[]>(
    `/inventario/maestro?ambito=${ambito}&categoria=${encodeURIComponent(categoria)}`,
  );
  return data;
}

export async function createInsumo(payload: InsumoInput & { bodegaId: string | number }) {
  const { data } = await apiClient.post<Insumo>("/inventario/insumos", payload);
  return data;
}

export async function patchInsumo(id: string, payload: Partial<InsumoInput & { activo: boolean }>) {
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
