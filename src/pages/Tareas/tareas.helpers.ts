import type { Tarea } from "../../features/encargos/api";
import {
  FINCA_PRODUCCION_EVENT_TYPES,
  OPERACION_TASK_TEMPLATES,
  SETUP_ONLY_EVENT_TYPES,
  type OperacionCategoria,
  type ProtocoloTaskOption,
} from "./tareas.constants";

// ─── Protocolo / eventos ──────────────────────────────────────────────────────

/**
 * Devuelve true si el proceso pertenece al capítulo de setup inicial
 * y no debe mostrarse en el flujo operativo normal.
 */
export function isSetupOnlyProtocolItem(input: {
  eventoTipo?: string | null;
  etapaLabel?: string | null;
  etapaNombre?: string | null;
  titulo?: string | null;
  nombre?: string | null;
}) {
  const eventoTipo = String(input.eventoTipo ?? "").toLowerCase().trim();
  if (SETUP_ONLY_EVENT_TYPES.has(eventoTipo)) return true;

  const fingerprint = [input.etapaLabel, input.etapaNombre, input.titulo, input.nombre]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

  return (
    fingerprint.includes("capitulo 0") ||
    fingerprint.includes("origen / unidad productiva")
  );
}

/**
 * Devuelve true si la opción de protocolo corresponde a una tarea
 * de producción de finca (riego, cosecha, canopia, etc.).
 */
export function isFincaProductionOption(option: ProtocoloTaskOption) {
  if (isSetupOnlyProtocolItem(option)) return false;
  if (FINCA_PRODUCCION_EVENT_TYPES.has(option.eventoTipo)) return true;

  const fingerprint = `${option.protocoloLabel} ${option.etapaLabel} ${option.titulo} ${option.eventoTipo}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

  return [
    "finca", "campo", "cuartel", "vinedo", "produccion",
    "agronom", "cosecha", "cultivo",
  ].some((keyword) => fingerprint.includes(keyword));
}

// ─── Catálogo de operaciones bodega ──────────────────────────────────────────

/** Primera tarea disponible para una categoría de operación. */
export function getDefaultTaskForCategory(categoria: OperacionCategoria) {
  return OPERACION_TASK_TEMPLATES.find((task) => task.categoria === categoria) ?? null;
}

/**
 * Busca el id del template de catálogo que mejor corresponde a un título
 * o tipo de evento dado.  Devuelve null si no hay match.
 */
export function getMatchedCatalogTaskId(titulo: string, eventoTipo?: string | null): string | null {
  if (eventoTipo) {
    const byType = OPERACION_TASK_TEMPLATES.find((t) => t.id === eventoTipo);
    if (byType) return byType.id;
  }
  const norm = normalizeStr(titulo);
  for (const template of OPERACION_TASK_TEMPLATES) {
    const templateNorm = normalizeStr(template.titulo);
    if (norm === templateNorm || norm.includes(templateNorm) || templateNorm.includes(norm)) {
      return template.id;
    }
  }
  return null;
}

// ─── Roles ────────────────────────────────────────────────────────────────────

/**
 * Aplana y normaliza cualquier estructura de roles que pueda venir de la API
 * (string, array, objeto con campos rol/role/rol_global…) a string[].
 */
export function normalizeRoles(input: unknown): string[] {
  if (typeof input === "string") {
    const normalized = input.trim().toLowerCase();
    return normalized ? [normalized] : [];
  }
  if (Array.isArray(input)) {
    return input
      .flatMap((role) => {
        if (typeof role === "string") return [role];
        if (role && typeof role === "object") {
          const r = role as Record<string, unknown>;
          return [r.rol_global, r.rol_en_bodega, r.rol_en_finca, r.rol, r.role]
            .filter((v): v is string => typeof v === "string");
        }
        return [];
      })
      .map((role) => role.trim().toLowerCase())
      .filter(Boolean);
  }
  if (input && typeof input === "object") {
    const r = input as Record<string, unknown>;
    return normalizeRoles([r.rol_global, r.rol_en_bodega, r.rol_en_finca, r.rol, r.role]);
  }
  return [];
}

/** Devuelve true si alguno de los roles actuales está en la lista esperada. */
export function includesAnyRole(currentRoles: string[], expectedRoles: string[]) {
  const expected = new Set(expectedRoles.map((r) => r.toLowerCase()));
  return currentRoles.some((r) => expected.has(r));
}

// ─── Tareas ───────────────────────────────────────────────────────────────────

/** Id canónico de una tarea (soporta tarea_id e id). */
export function getTaskId(task: Tarea) {
  return String(task.tarea_id ?? task.id ?? "");
}

/** Estado normalizado a minúsculas sin espacios extra. */
export function normalizeTaskStatus(status?: string | null) {
  return String(status ?? "").trim().toLowerCase();
}

/** Etiqueta legible que combina finca y cuartel para mostrar en la fila. */
export function getTaskTargetLabel(task: Tarea) {
  const fincaName =
    task.finca?.nombre_finca ??
    (task.finca_id ? `Finca ${task.finca_id.slice(0, 8)}` : null);
  const cuartelName =
    task.cuartel?.codigo_cuartel ??
    (task.cuartel_id ? `Cuartel ${task.cuartel_id.slice(0, 8)}` : null);

  if (fincaName && cuartelName) return `${fincaName} / ${cuartelName}`;
  if (fincaName) return fincaName;
  return null;
}

/** Devuelve true si alguna asignación de la tarea está en estado completado. */
export function hasCompletedAssignment(task: Tarea) {
  return (
    task.tarea_asignacion?.some(
      (a) => normalizeTaskStatus(a.estado) === "completado",
    ) ?? false
  );
}

/** Devuelve true si la tarea está completada (por estado o por asignación). */
export function isCompletedTask(task: Tarea) {
  return normalizeTaskStatus(task.estado) === "completado" || hasCompletedAssignment(task);
}

/** Devuelve true si la tarea está activa (pendiente o en progreso). */
export function isPendingTask(task: Tarea) {
  const taskStatus = normalizeTaskStatus(task.estado || "pendiente");
  const hasActiveAssignment =
    task.tarea_asignacion?.some((a) =>
      ["pendiente", "en_progreso"].includes(normalizeTaskStatus(a.estado)),
    ) ?? false;

  return (
    !isCompletedTask(task) &&
    (["pendiente", "en_progreso"].includes(taskStatus) || hasActiveAssignment)
  );
}

/**
 * Elimina duplicados por id, preservando la asignación más completa
 * cuando la misma tarea aparece más de una vez.
 */
export function dedupeTasksById(items: Tarea[]) {
  const unique = new Map<string, Tarea>();

  for (const item of items) {
    const taskId = getTaskId(item);
    if (!taskId) continue;

    const current = unique.get(taskId);
    if (!current) {
      unique.set(taskId, item);
      continue;
    }

    unique.set(taskId, {
      ...current,
      ...item,
      tarea_asignacion: item.tarea_asignacion?.length
        ? item.tarea_asignacion
        : current.tarea_asignacion,
    });
  }

  return Array.from(unique.values());
}

// ─── Fechas ───────────────────────────────────────────────────────────────────

/**
 * Fecha de completado de la tarea: busca en asignaciones primero,
 * luego updated_at, luego created_at.
 */
export function getTaskCompletedDate(task: Tarea) {
  const raw =
    task.tarea_asignacion?.find((a) => a.estado === "completado")?.completed_at ??
    task.updated_at ??
    task.created_at ??
    null;
  return raw ? new Date(raw) : null;
}

/**
 * Timestamp más reciente entre todas las asignaciones y las fechas
 * de la tarea.  Usado para ordenar el historial de actividad.
 */
export function getActivityDate(task: Tarea): number {
  const candidates: number[] = [];
  for (const a of task.tarea_asignacion ?? []) {
    if (a.completed_at) candidates.push(new Date(a.completed_at).getTime());
  }
  if (task.updated_at) candidates.push(new Date(task.updated_at).getTime());
  if (task.created_at) candidates.push(new Date(task.created_at).getTime());
  return candidates.length > 0 ? Math.max(...candidates) : 0;
}

/** Formatea una fecha para mostrar en la interfaz (dd/mm/aa hh:mm). */
export function formatTaskDate(date: Date | null) {
  if (!date || Number.isNaN(date.getTime())) return "Sin fecha";
  return date.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Strings ──────────────────────────────────────────────────────────────────

/** Normaliza un string para comparaciones insensibles a tildes y caracteres especiales. */
export function normalizeStr(str: string) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}
