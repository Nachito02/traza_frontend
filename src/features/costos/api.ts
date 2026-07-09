import { apiClient } from "../../lib/api";

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type ClaseMaquinaria = "motriz" | "implemento";
export type TipoCombustible = "gasoil" | "nafta" | "electricidad" | "glp" | "otro";
export type ModalidadEjecucion = "propia" | "contratada" | "mixta";
export type CategoriaCosto =
  | "mano_obra"
  | "maquinaria"
  | "combustible"
  | "insumos"
  | "contratista";

export type TarifaMaquinaria = {
  tarifa_maquinaria_id: string;
  bodega_id: string;
  nombre: string;
  clase: ClaseMaquinaria;
  costo_hora: string;
  consumo_lts_hora: string | null;
  moneda: string;
  vigencia_desde: string;
  activo: boolean;
};

export type TarifaCombustible = {
  tarifa_combustible_id: string;
  bodega_id: string;
  tipo: TipoCombustible;
  costo_unitario: string;
  unidad: string;
  moneda: string;
  vigencia_desde: string;
  activo: boolean;
};

export type InsumoCatalogo = {
  insumo_id: string;
  bodega_id: string | null;
  tipo: string;
  nombre_comercial: string;
  principio_activo: string | null;
  unidad_base: string;
  costo_unitario: string | null;
  moneda: string;
};

export type TareaEjecucion = {
  tarea_ejecucion_id: string;
  tarea_id: string;
  modalidad: ModalidadEjecucion;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  superficie_intervenida: string;
  unidad_superficie: string;
  pct_intervenido: string | null;
  cantidad_ejecutada: string | null;
  unidad_ejecutada: string | null;
  cantidad_operarios: number | null;
  jornales_generales: string | null;
  horas_generales: string | null;
  jornales_tractorista: string | null;
  horas_tractorista: string | null;
  horas_tecnico: string | null;
  contratista: string | null;
  monto_contratista: string | null;
  responsable_user_id: string | null;
  responsable?: { user_id: string; nombre: string } | null;
  personal_asignado: PersonalAsignadoInput[];
  observaciones: string | null;
};

/**
 * Persona asignada a la actividad. Puede ser un legajo registrado (`personal_id`)
 * o un operario "transitorio" cargado al vuelo con su costo inline. Modalidad del
 * transitorio: por_hora, mensual (deriva costo/hora) o al_tanto (monto fijo).
 */
export type PersonalAsignadoInput = {
  personal_id?: string | null;
  nombre: string;
  tipo?: "interno" | "externo";
  transitorio?: boolean;
  modalidad?: "por_hora" | "mensual" | "al_tanto";
  horas?: number | null;
  costo_hora?: number | null;
  sueldo_mensual?: number | null;
  dias_mes?: number | null;
  monto?: number | null;
};

export type ActividadSugerencia = {
  actividad_sugerencia_id: string;
  clave: string;
  nombre: string;
  tipo: "manual" | "mecanizada" | null;
  productividad_unidad: string | null;
  productividad_label: string | null;
  equipos_sugeridos: string[];
  insumos_sugeridos: string[];
  aplica_maquinaria: boolean;
  aplica_combustible: boolean;
  aplica_insumos: boolean;
};

export type ActividadMaquina = {
  actividad_maquina_id: string;
  tarea_id: string;
  tarifa_maquinaria_id: string | null;
  nombre: string;
  clase: ClaseMaquinaria;
  propia: boolean;
  cantidad: number | null;
  horas: string;
  consumo_combustible_lts: string | null;
  costo_hora_snapshot: string | null;
  costo_total: string | null;
};

export type ActividadInsumo = {
  actividad_insumo_id: string;
  tarea_id: string;
  insumo_id: string | null;
  descripcion: string | null;
  dosis_ha: string;
  unidad_dosis: string;
  cantidad_total: string;
  unidad_total: string;
  costo_unitario_snapshot: string | null;
  costo_total: string | null;
};

export type ActividadContratista = {
  actividad_contratista_id: string;
  tarea_id: string;
  cuadrilla: string;
  cantidad_operarios: number | null;
  horas: string | null;
  jornales: string | null;
  monto: string;
};

export type ActividadCosto = {
  actividad_costo_id: string;
  tarea_id: string;
  categoria: CategoriaCosto;
  monto: string;
  detalle: Record<string, unknown>;
};

export type CostosTarea = {
  tareaId: string;
  cuartelId: string | null;
  ejecucion: TareaEjecucion | null;
  maquinas: ActividadMaquina[];
  insumos: ActividadInsumo[];
  contratistas: ActividadContratista[];
  costos: ActividadCosto[];
  total: number;
  costoPorHa: number | null;
};

export type ResumenCostos = {
  total: number;
  porCategoria: Partial<Record<CategoriaCosto, number>>;
  costoPorHa: number | null;
  actividades: number;
};

const q = (bodegaId?: string | number) =>
  bodegaId !== undefined && bodegaId !== null && String(bodegaId).trim()
    ? `?bodegaId=${encodeURIComponent(String(bodegaId))}`
    : "";


// ── Tarifas: maquinaria ───────────────────────────────────────────────────────

export async function fetchTarifasMaquinaria(bodegaId: string | number) {
  const { data } = await apiClient.get<TarifaMaquinaria[]>(`/costos/tarifas/maquinaria${q(bodegaId)}`);
  return data;
}
export async function createTarifaMaquinaria(payload: {
  bodegaId: string | number;
  nombre: string;
  clase: ClaseMaquinaria;
  costo_hora: number;
  consumo_lts_hora?: number | null;
  vigencia_desde?: string;
}) {
  const { data } = await apiClient.post<TarifaMaquinaria>("/costos/tarifas/maquinaria", payload);
  return data;
}
export async function patchTarifaMaquinaria(
  id: string,
  payload: Partial<{ nombre: string; costo_hora: number; consumo_lts_hora: number | null; vigencia_desde: string; activo: boolean }>,
) {
  const { data } = await apiClient.patch<TarifaMaquinaria>(`/costos/tarifas/maquinaria/${id}`, payload);
  return data;
}
export async function deleteTarifaMaquinaria(id: string) {
  await apiClient.delete(`/costos/tarifas/maquinaria/${id}`);
}

// ── Tarifas: combustible ──────────────────────────────────────────────────────

export async function fetchTarifasCombustible(bodegaId: string | number) {
  const { data } = await apiClient.get<TarifaCombustible[]>(`/costos/tarifas/combustible${q(bodegaId)}`);
  return data;
}
export async function createTarifaCombustible(payload: {
  bodegaId: string | number;
  tipo: TipoCombustible;
  costo_unitario: number;
  unidad?: string;
  vigencia_desde?: string;
}) {
  const { data } = await apiClient.post<TarifaCombustible>("/costos/tarifas/combustible", payload);
  return data;
}
export async function patchTarifaCombustible(
  id: string,
  payload: Partial<{ costo_unitario: number; unidad: string; vigencia_desde: string; activo: boolean }>,
) {
  const { data } = await apiClient.patch<TarifaCombustible>(`/costos/tarifas/combustible/${id}`, payload);
  return data;
}
export async function deleteTarifaCombustible(id: string) {
  await apiClient.delete(`/costos/tarifas/combustible/${id}`);
}

// ── Catálogo de insumos ───────────────────────────────────────────────────────

export async function fetchInsumosCatalogo(bodegaId?: string | number) {
  const { data } = await apiClient.get<InsumoCatalogo[]>(`/costos/insumos${q(bodegaId)}`);
  return data;
}

export async function fetchSugerencias() {
  const { data } = await apiClient.get<ActividadSugerencia[]>("/costos/actividades/sugerencias");
  return data;
}
export async function fetchSugerencia(clave: string) {
  const { data } = await apiClient.get<ActividadSugerencia | null>(
    `/costos/actividades/${encodeURIComponent(clave)}/sugerencias`,
  );
  return data;
}

// ── Captura por actividad ─────────────────────────────────────────────────────

export async function fetchCostosTarea(tareaId: string) {
  const { data } = await apiClient.get<CostosTarea>(`/costos/tareas/${tareaId}`);
  return data;
}

export async function putEjecucion(
  tareaId: string,
  payload: {
    modalidad: ModalidadEjecucion;
    fecha_inicio?: string | null;
    fecha_fin?: string | null;
    superficie_intervenida: number;
    unidad_superficie?: string;
    cantidad_ejecutada?: number | null;
    unidad_ejecutada?: string | null;
    cantidad_operarios?: number | null;
    jornales_generales?: number | null;
    horas_generales?: number | null;
    jornales_tractorista?: number | null;
    horas_tractorista?: number | null;
    horas_tecnico?: number | null;
    responsable_user_id?: string | null;
    personal_asignado?: PersonalAsignadoInput[];
    observaciones?: string | null;
  },
) {
  const { data } = await apiClient.put<TareaEjecucion>(`/costos/tareas/${tareaId}/ejecucion`, payload);
  return data;
}

export async function addMaquina(
  tareaId: string,
  payload: {
    tarifa_maquinaria_id?: string | null;
    nombre?: string;
    clase: ClaseMaquinaria;
    propia?: boolean;
    cantidad?: number | null;
    horas: number;
    consumo_combustible_lts?: number | null;
  },
) {
  const { data } = await apiClient.post<ActividadMaquina>(`/costos/tareas/${tareaId}/maquinas`, payload);
  return data;
}
export async function deleteMaquina(id: string) {
  await apiClient.delete(`/costos/maquinas/${id}`);
}

export async function addInsumo(
  tareaId: string,
  payload: {
    insumo_id?: string | null;
    descripcion?: string;
    dosis_ha: number;
    unidad_dosis: string;
    cantidad_total: number;
    unidad_total?: string;
  },
) {
  const { data } = await apiClient.post<ActividadInsumo>(`/costos/tareas/${tareaId}/insumos`, payload);
  return data;
}
export async function deleteInsumo(id: string) {
  await apiClient.delete(`/costos/insumos/${id}`);
}

export async function addContratista(
  tareaId: string,
  payload: {
    cuadrilla: string;
    cantidad_operarios?: number | null;
    horas?: number | null;
    jornales?: number | null;
    monto: number;
  },
) {
  const { data } = await apiClient.post<ActividadContratista>(
    `/costos/tareas/${tareaId}/contratistas`,
    payload,
  );
  return data;
}
export async function deleteContratista(id: string) {
  await apiClient.delete(`/costos/contratistas/${id}`);
}

export async function recalcularCostos(tareaId: string) {
  const { data } = await apiClient.post(`/costos/tareas/${tareaId}/recalcular`);
  return data;
}

// ── Indicadores ───────────────────────────────────────────────────────────────

export async function fetchResumenPorCuartel(cuartelId: string) {
  const { data } = await apiClient.get<ResumenCostos>(`/costos/resumen/cuartel/${cuartelId}`);
  return data;
}

export type ActividadConCosto = {
  tareaId: string;
  titulo: string;
  estado: string;
  actividad: string | null;
  eventoTipo: string | null;
  finca: string | null;
  cuartel: string | null;
  fecha: string;
  superficie: number | null;
  total: number;
  costoPorHa: number | null;
  porCategoria: Partial<Record<CategoriaCosto, number>>;
};

export async function fetchActividadesPorCuartel(cuartelId: string) {
  const { data } = await apiClient.get<ActividadConCosto[]>(
    `/costos/resumen/cuartel/${cuartelId}/actividades`,
  );
  return data;
}

export type ResumenBodega = Omit<ResumenCostos, "actividades"> & { actividades: ActividadConCosto[] };

export async function fetchResumenPorBodega(bodegaId: string | number) {
  const { data } = await apiClient.get<ResumenBodega>(`/costos/resumen/bodega${q(bodegaId)}`);
  return data;
}
export async function fetchResumenPorCampania(campaniaId: string) {
  const { data } = await apiClient.get<ResumenCostos>(`/costos/resumen/campania/${campaniaId}`);
  return data;
}

// ── Helpers de presentación ───────────────────────────────────────────────────

export const CATEGORIA_LABEL: Record<CategoriaCosto, string> = {
  mano_obra: "Mano de obra",
  maquinaria: "Maquinaria",
  combustible: "Combustible",
  insumos: "Insumos",
  contratista: "Contratista",
};

export function formatMoney(value: number | string | null | undefined, moneda = "ARS"): string {
  const n = value === null || value === undefined ? 0 : Number(value);
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: moneda,
    maximumFractionDigits: 2,
  }).format(n);
}
