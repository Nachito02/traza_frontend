import { apiClient } from "../../lib/api";

export type TareaAsignacion = {
  tarea_asignacion_id: string;
  user_id: string;
  estado: string;
  assigned_at: string;
  completed_at?: string | null;
  observaciones?: string | null;
  app_user?: {
    user_id: string;
    nombre: string;
    email?: string | null;
  } | null;
};

export type Tarea = {
  tarea_id?: string;
  id?: string;
  titulo: string;
  descripcion?: string | null;
  prioridad?: string;
  estado?: string;
  proceso_id?: string | null;
  fecha_fin?: string | null;
  finca_id?: string | null;
  cuartel_id?: string | null;
  bodega_id?: string | null;
  imagen_cid?: string | null;
  imagen_url?: string | null;
  created_at?: string;
  updated_at?: string;
  finca?: {
    finca_id?: string;
    nombre_finca?: string;
  } | null;
  cuartel?: {
    cuartel_id?: string;
    codigo_cuartel?: string;
  } | null;
  tarea_asignacion?: TareaAsignacion[];
  evento_tipo?: string | null;
  protocolo_proceso?: { evento_tipo?: string | null } | null;
};

export type CreateTareaPayload = {
  bodegaId: string;
  procesoId?: string;
  fincaId?: string;
  cuartelId?: string;
  descripcion?: string;
  fechaFin?: string;
  imagenCid?: string;
  imagenUrl?: string;
  prioridad?: "baja" | "media" | "alta";
  operarioUserId?: string;
};

export async function fetchPendientesByScope(params: {
  bodegaId: string;
  fincaId?: string;
  mode?: "mine" | "scope";
}): Promise<Tarea[]> {
  if (params.mode === "mine") {
    // GET /tareas/mis-pendientes → TareaAsignacion[] con { tarea: Tarea } anidado
    const response = await apiClient.get<{ tarea?: Tarea }[]>("/tareas/mis-pendientes");
    return (response.data ?? [])
      .map((row) => row.tarea)
      .filter((t): t is Tarea => Boolean(t));
  }

  // scope: si hay fincaId usamos el query param, sino el endpoint de bodega
  const url = params.fincaId
    ? `/tareas?bodegaId=${encodeURIComponent(params.bodegaId)}&fincaId=${encodeURIComponent(params.fincaId)}&pendientes=true`
    : `/tareas/bodega/${encodeURIComponent(params.bodegaId)}/pendientes`;

  const response = await apiClient.get<Tarea[]>(url);
  return response.data ?? [];
}

export async function fetchCanManageTareas() {
  try {
    const response = await apiClient.get<{ canManage: boolean }>("/tareas/me/can-manage");
    return Boolean(response.data?.canManage);
  } catch {
    return false;
  }
}

export async function deleteTarea(tareaId: string) {
  const response = await apiClient.patch(`/tareas/${encodeURIComponent(tareaId)}/cancelar`);
  return response.data;
}

export async function updateTareaAsignacionEstado(
  tareaAsignacionId: string,
  estado: "en_progreso" | "completado" | "cancelado",
  observaciones?: string,
) {
  const response = await apiClient.patch(
    `/tareas/me/asignaciones/${encodeURIComponent(tareaAsignacionId)}/estado`,
    { estado, observaciones },
  );
  return response.data;
}

export async function createTarea(payload: CreateTareaPayload) {
  const response = await apiClient.post<Tarea>("/tareas", {
    bodegaId: payload.bodegaId,
    procesoId: payload.procesoId,
    fincaId: payload.fincaId,
    cuartelId: payload.cuartelId,
    descripcion: payload.descripcion || null,
    fechaFin: payload.fechaFin || null,
    imagenCid: payload.imagenCid || null,
    imagenUrl: payload.imagenUrl || null,
    prioridad: payload.prioridad ?? "media",
    assigneeUserIds: payload.operarioUserId ? [payload.operarioUserId] : undefined,
  });
  return response.data;
}

export async function assignTareaToUser(tareaId: string, userId: string) {
  const response = await apiClient.post(`/tareas/${encodeURIComponent(tareaId)}/asignaciones`, {
    userIds: [userId],
  });
  return response.data;
}

export type TareaDocumentoPayload = {
  cid?: string;
  url?: string;
  nombre?: string;
  mimeType?: string;
};

export type TareaPlantillaPayload = {
  schemaDisponible?: boolean;
  camposObligatorios?: Array<{ campo: string; type?: string; unit?: string }>;
  camposOpcionales?: Array<{ campo: string; type?: string; unit?: string }>;
};

export type SaveTareaProgresoPayload = {
  draft?: Record<string, unknown>;
  notas?: string;
  descripcion?: string;
  plantilla?: TareaPlantillaPayload;
  documentos?: TareaDocumentoPayload[];
  adjuntos?: TareaDocumentoPayload[];
};

function buildLegacyCompatiblePayload(payload: SaveTareaProgresoPayload) {
  return {
    ...payload,
    notas: payload.notas ?? payload.descripcion ?? null,
    descripcion: payload.descripcion ?? payload.notas ?? null,
    documentos: payload.documentos ?? payload.adjuntos ?? [],
    adjuntos: payload.adjuntos ?? payload.documentos ?? [],
  };
}

export async function createTareaEntrada(
  tareaAsignacionId: string,
  payload: SaveTareaProgresoPayload,
) {
  const response = await apiClient.post(
    `/tareas/me/asignaciones/${encodeURIComponent(tareaAsignacionId)}/entradas`,
    buildLegacyCompatiblePayload(payload),
  );
  return response.data;
}

export async function finalizarTareaAsignacion(tareaAsignacionId: string) {
  const response = await apiClient.post(
    `/tareas/me/asignaciones/${encodeURIComponent(tareaAsignacionId)}/finalizar`,
    {},
  );
  return response.data;
}

export type AdjuntoRecord = {
  cid: string;
  url: string;
  nombre: string;
  tipo: string;
  size: number;
};

export type TareaEntradaDetail = {
  entradaId: string;
  descripcion?: string | null;
  notas?: string | null;
  adjuntos?: AdjuntoRecord[];
  fecha: string;
  creadoPor?: { user_id: string; nombre: string } | null;
};

export async function uploadEntradaAdjunto(
  entradaId: string,
  file: File,
): Promise<{ adjunto: AdjuntoRecord; adjuntos: AdjuntoRecord[] }> {
  const formData = new FormData();
  formData.append("imagen", file);
  const response = await apiClient.post<{ adjunto: AdjuntoRecord; adjuntos: AdjuntoRecord[] }>(
    `/tareas/entradas/${encodeURIComponent(entradaId)}/adjuntos`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return response.data;
}

export async function fetchTareasByBodega(bodegaId: string): Promise<Tarea[]> {
  try {
    const response = await apiClient.get<Tarea[] | { items?: Tarea[] }>(
      `/tareas?bodegaId=${encodeURIComponent(bodegaId)}`,
    );
    if (Array.isArray(response.data)) return response.data;
    return response.data?.items ?? [];
  } catch {
    return [];
  }
}

export async function fetchTareaAsignacionDetail(tareaAsignacionId: string): Promise<TareaEntradaDetail[]> {
  const response = await apiClient.get<TareaEntradaDetail[]>(
    `/tareas/me/asignaciones/${encodeURIComponent(tareaAsignacionId)}/entradas`,
  );
  return Array.isArray(response.data) ? response.data : [];
}

export async function patchTareaEntrada(
  entradaId: string,
  data: { fecha?: string; descripcion?: string },
): Promise<TareaEntradaDetail> {
  const response = await apiClient.patch<TareaEntradaDetail>(
    `/tareas/entradas/${encodeURIComponent(entradaId)}`,
    data,
  );
  return response.data;
}
