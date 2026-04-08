import { apiClient } from "../../lib/api";

export type TareaAsignacion = {
  tarea_asignacion_id: string;
  user_id: string;
  estado: string;
  assigned_at: string;
  observaciones?: string | null;
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
  tarea_asignacion?: TareaAsignacion[];
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
}) {
  const mineCandidates = [
    "/tareas/me/asignaciones",
    "/tareas/mis-pendientes",
    "/tareas?mine=1&pendientes=1",
  ];
  const scopeCandidates: string[] = [];
  if (params.fincaId) {
    scopeCandidates.push(
      `/tareas?bodegaId=${encodeURIComponent(params.bodegaId)}&fincaId=${encodeURIComponent(params.fincaId)}&pendientes=true`,
    );
  }
  scopeCandidates.push(`/tareas/bodega/${encodeURIComponent(params.bodegaId)}/pendientes`);
  scopeCandidates.push(`/tareas?bodegaId=${encodeURIComponent(params.bodegaId)}&pendientes=1`);
  scopeCandidates.push("/tareas/mis-pendientes");
  const candidates = params.mode === "mine" ? [...mineCandidates] : [...scopeCandidates];

  let lastError: unknown;
  for (const url of candidates) {
    try {
      const response = await apiClient.get<
        Tarea[] | { items?: Tarea[] } | { tarea?: Tarea }[] | { items?: { tarea?: Tarea }[] }
      >(url);
      if (Array.isArray(response.data)) {
        if (response.data.length === 0) return [];
        const first = response.data[0] as { tarea?: Tarea };
        if (first?.tarea) {
          return (response.data as { tarea?: Tarea }[])
            .map((row) => row.tarea)
            .filter((item): item is Tarea => Boolean(item));
        }
        return response.data as Tarea[];
      }

      const items = response.data?.items ?? [];
      if (items.length === 0) return [];
      const first = items[0] as { tarea?: Tarea };
      if (first?.tarea) {
        return (items as { tarea?: Tarea }[])
          .map((row) => row.tarea)
          .filter((item): item is Tarea => Boolean(item));
      }
      return items as Tarea[];
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error("No se pudieron cargar las tareas pendientes");
}

export async function fetchCanManageTareas() {
  try {
    const response = await apiClient.get<{ canManage?: boolean; can_manage?: boolean } | boolean>(
      "/tareas/me/can-manage",
    );
    if (typeof response.data === "boolean") return response.data;
    return Boolean(response.data?.canManage ?? response.data?.can_manage);
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
    userId,
    assigneeUserId: userId,
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

export type SaveTareaProgresoResponse = {
  validation?: {
    canClose?: boolean;
    missingRequired?: string[];
    invalidFields?: string[];
  };
  [key: string]: unknown;
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

export async function saveTareaProgreso(
  tareaAsignacionId: string,
  payload: SaveTareaProgresoPayload,
) {
  const response = await apiClient.post<SaveTareaProgresoResponse>(
    `/ia/tareas/${encodeURIComponent(tareaAsignacionId)}/guardar-progreso`,
    buildLegacyCompatiblePayload(payload),
  );
  return response.data;
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

export type TareaEntradaDetail = {
  entradaId: string;
  descripcion?: string | null;
  adjuntos?: unknown;
  fecha: string;
  creadoPor?: { user_id: string; nombre: string } | null;
};

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
  try {
    const response = await apiClient.get<TareaEntradaDetail[]>(
      `/tareas/me/asignaciones/${encodeURIComponent(tareaAsignacionId)}/entradas`,
    );
    return Array.isArray(response.data) ? response.data : [];
  } catch {
    return [];
  }
}
