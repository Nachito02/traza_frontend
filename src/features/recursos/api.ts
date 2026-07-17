import { apiClient } from "../../lib/api";

export type AmbitoRecurso = "finca" | "bodega";
export type ClaseRecurso = "motriz" | "implemento" | "equipo" | "herramienta";

export type Recurso = {
  tarifa_maquinaria_id: string;
  bodega_id: string;
  ambito: AmbitoRecurso;
  clase: ClaseRecurso;
  categoria: string | null;
  familia: string | null;
  nombre: string;
  potencia_hp: string | null;
  uso_principal: string | null;
  unidad_uso: string | null;
  consumo_descripcion: string | null;
  observaciones: string | null;
  costo_hora: string | null;
  consumo_lts_hora: string | null;
  moneda: string;
  vigencia_desde: string | null;
  activo: boolean;
};

export type RecursoMaestro = {
  recurso_maestro_id: string;
  ambito: AmbitoRecurso;
  clase: ClaseRecurso;
  categoria: string | null;
  familia: string | null;
  nombre: string;
  potencia_hp: string | null;
  uso_principal: string | null;
  unidad_uso: string | null;
  consumo_descripcion: string | null;
  observaciones: string | null;
};

export type RecursoInput = {
  ambito: AmbitoRecurso;
  clase: ClaseRecurso;
  categoria?: string | null;
  familia?: string | null;
  nombre: string;
  potencia_hp?: string | null;
  uso_principal?: string | null;
  unidad_uso?: string | null;
  consumo_descripcion?: string | null;
  observaciones?: string | null;
  costo_hora?: number | null;
  consumo_lts_hora?: number | null;
  vigencia_desde?: string | null;
};

export async function fetchRecursos(bodegaId: string | number, ambito?: AmbitoRecurso, clase?: ClaseRecurso) {
  const params = new URLSearchParams({ bodegaId: String(bodegaId) });
  if (ambito) params.set("ambito", ambito);
  if (clase) params.set("clase", clase);
  const { data } = await apiClient.get<Recurso[]>(`/recursos?${params.toString()}`);
  return data;
}

export async function fetchClasesMaestro(ambito: AmbitoRecurso) {
  const { data } = await apiClient.get<ClaseRecurso[]>(`/recursos/maestro/clases?ambito=${ambito}`);
  return data;
}

export async function fetchCategoriasMaestro(ambito: AmbitoRecurso, clase: ClaseRecurso) {
  const { data } = await apiClient.get<string[]>(`/recursos/maestro/categorias?ambito=${ambito}&clase=${clase}`);
  return data;
}

export async function fetchMaestro(ambito: AmbitoRecurso, clase: ClaseRecurso, categoria: string) {
  const { data } = await apiClient.get<RecursoMaestro[]>(
    `/recursos/maestro?ambito=${ambito}&clase=${clase}&categoria=${encodeURIComponent(categoria)}`,
  );
  return data;
}

export async function createRecurso(payload: RecursoInput & { bodegaId: string | number }) {
  const { data } = await apiClient.post<Recurso>("/recursos", payload);
  return data;
}

export async function patchRecurso(id: string, payload: Partial<RecursoInput & { activo: boolean }>) {
  const { data } = await apiClient.patch<Recurso>(`/recursos/${id}`, payload);
  return data;
}

export async function deleteRecurso(id: string) {
  const { data } = await apiClient.delete<{ deleted: boolean; desactivado: boolean }>(`/recursos/${id}`);
  return data;
}
