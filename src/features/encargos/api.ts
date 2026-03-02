import { apiClient } from "../../lib/api";

export type Encargo = {
  encargo_id?: string;
  id?: string;
  titulo: string;
  descripcion?: string | null;
  prioridad?: string;
  estado?: string;
  fecha_objetivo?: string | null;
  finca_id?: string | null;
  cuartel_id?: string | null;
  bodega_id?: string | null;
  milestone_id?: string | null;
  trazabilidad_id?: string | null;
  milestone?: {
    milestone_id?: string;
    trazabilidad_id?: string;
  } | null;
  trazabilidad?: {
    trazabilidad_id?: string;
  } | null;
};

export type CreateEncargoPayload = {
  bodegaId: string;
  fincaId?: string;
  cuartelId?: string;
  milestoneId?: string;
  titulo: string;
  descripcion?: string;
  fechaObjetivo?: string;
  prioridad?: "baja" | "media" | "alta";
  operarioUserId?: string;
};

export async function fetchPendientesByScope(params: {
  bodegaId: string;
  fincaId?: string;
  mode?: "mine" | "scope";
}) {
  const mineCandidates = ["/encargos/me/asignaciones", "/encargos/mis-pendientes"];
  const scopeCandidates: string[] = [];
  if (params.fincaId) {
    scopeCandidates.push(
      `/encargos?bodegaId=${encodeURIComponent(params.bodegaId)}&fincaId=${encodeURIComponent(params.fincaId)}&pendientes=true`,
    );
  }
  scopeCandidates.push(`/encargos/bodega/${encodeURIComponent(params.bodegaId)}/pendientes`);
  scopeCandidates.push(`/encargos?bodegaId=${encodeURIComponent(params.bodegaId)}&pendientes=1`);
  scopeCandidates.push("/encargos/mis-pendientes");
  const candidates =
    params.mode === "mine" ? [...mineCandidates, ...scopeCandidates] : [...scopeCandidates];

  let lastError: unknown;
  for (const url of candidates) {
    try {
      const response = await apiClient.get<
        Encargo[] | { items?: Encargo[] } | { encargo?: Encargo }[] | { items?: { encargo?: Encargo }[] }
      >(url);
      if (Array.isArray(response.data)) {
        if (response.data.length === 0) return [];
        const first = response.data[0] as { encargo?: Encargo };
        if (first?.encargo) {
          return (response.data as { encargo?: Encargo }[])
            .map((row) => row.encargo)
            .filter((item): item is Encargo => Boolean(item));
        }
        return response.data as Encargo[];
      }

      const items = response.data?.items ?? [];
      if (items.length === 0) return [];
      const first = items[0] as { encargo?: Encargo };
      if (first?.encargo) {
        return (items as { encargo?: Encargo }[])
          .map((row) => row.encargo)
          .filter((item): item is Encargo => Boolean(item));
      }
      return items as Encargo[];
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error("No se pudieron cargar las tareas pendientes");
}

export async function fetchCanManageEncargos() {
  try {
    const response = await apiClient.get<{ canManage?: boolean; can_manage?: boolean } | boolean>(
      "/encargos/me/can-manage",
    );
    if (typeof response.data === "boolean") return response.data;
    return Boolean(response.data?.canManage ?? response.data?.can_manage);
  } catch {
    return false;
  }
}

export async function deleteEncargo(encargoId: string) {
  const candidates = [
    { method: "patch" as const, url: `/encargos/${encodeURIComponent(encargoId)}/cancelar` },
    { method: "delete" as const, url: `/encargos/${encodeURIComponent(encargoId)}` },
    { method: "post" as const, url: `/encargos/${encodeURIComponent(encargoId)}/cancelar` },
  ];

  let lastError: unknown;
  for (const candidate of candidates) {
    try {
      const response =
        candidate.method === "delete"
          ? await apiClient.delete(candidate.url)
          : candidate.method === "post"
            ? await apiClient.post(candidate.url)
            : await apiClient.patch(candidate.url);
      return response.data;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error("No se pudo eliminar/cancelar la tarea");
}

export async function createEncargo(payload: CreateEncargoPayload) {
  const response = await apiClient.post<Encargo>("/encargos", {
    bodegaId: payload.bodegaId,
    bodega_id: payload.bodegaId,
    fincaId: payload.fincaId,
    finca_id: payload.fincaId,
    cuartelId: payload.cuartelId,
    cuartel_id: payload.cuartelId,
    milestoneId: payload.milestoneId,
    milestone_id: payload.milestoneId,
    titulo: payload.titulo,
    descripcion: payload.descripcion || null,
    fechaObjetivo: payload.fechaObjetivo || null,
    fecha_objetivo: payload.fechaObjetivo || null,
    prioridad: payload.prioridad ?? "media",
    assigneeUserIds: payload.operarioUserId ? [payload.operarioUserId] : undefined,
    assignedUserIds: payload.operarioUserId ? [payload.operarioUserId] : undefined,
    userIds: payload.operarioUserId ? [payload.operarioUserId] : undefined,
  });
  return response.data;
}

export async function assignEncargoToUser(encargoId: string, userId: string) {
  const candidates = [
    {
      method: "post" as const,
      url: `/encargos/${encodeURIComponent(encargoId)}/asignaciones`,
    },
    {
      method: "post" as const,
      url: `/encargos/${encodeURIComponent(encargoId)}/asignar`,
    },
    {
      method: "put" as const,
      url: `/encargos/${encodeURIComponent(encargoId)}/asignar`,
    },
    {
      method: "patch" as const,
      url: `/encargos/${encodeURIComponent(encargoId)}/asignar`,
    },
    {
      method: "post" as const,
      url: `/encargos/${encodeURIComponent(encargoId)}/asignaciones/${encodeURIComponent(userId)}`,
    },
  ];

  let lastError: unknown;
  for (const candidate of candidates) {
    try {
      const payload = {
        userId,
        assigneeUserId: userId,
        user_id: userId,
        userIds: [userId],
        operarioUserId: userId,
      };
      const response =
        candidate.method === "post"
          ? await apiClient.post(candidate.url, payload)
          : candidate.method === "put"
            ? await apiClient.put(candidate.url, payload)
            : await apiClient.patch(candidate.url, payload);
      return response.data;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error("No se pudo asignar el encargo al operario");
}
