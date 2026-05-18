import { Link } from "react-router-dom";
import { AppButton } from "../../../components/ui";
import type { Tarea, TareaEntradaDetail } from "../../../features/encargos/api";
import { OPERACION_TASK_ROUTES } from "../tareas.constants";
import {
  getActivityDate,
  getTaskCompletedDate,
  getTaskTargetLabel,
  normalizeTaskStatus,
} from "../tareas.helpers";

// ─── Types ────────────────────────────────────────────────────────────────────

type OrderRowProps = {
  task: Tarea;
  isExpanded: boolean;
  taskEntries: TareaEntradaDetail[] | undefined;
  loadingEntries: boolean;
  onToggleExpand: () => void;
  /** "pending" muestra badge de estado + link operativo + botón eliminar.
   *  "completed" muestra badge verde fijo y fecha de completado. */
  variant: "pending" | "completed";
  // Pending-only
  catalogTaskId?: string | null;
  isFincaTask?: boolean;
  canDelete?: boolean;
  isDeleting?: boolean;
  onDelete?: () => void;
};

// ─── Helpers internos ─────────────────────────────────────────────────────────

/** Renderiza el contenido de un registro de entrada (JSON o texto plano). */
function EntryContent({ descripcion, notas }: { descripcion?: string | null; notas?: string | null }) {
  if (!descripcion) return null;
  try {
    const json = JSON.parse(descripcion) as unknown;
    if (json && typeof json === "object" && !Array.isArray(json)) {
      const kvPairs = Object.entries(json as Record<string, unknown>).filter(
        ([, v]) => v !== null && v !== "",
      );
      if (kvPairs.length === 0) return null;
      return (
        <div className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
          {kvPairs.map(([k, v]) => (
            <div key={k} className="contents">
              <span className="capitalize text-[color:var(--text-ink-muted)]">{k.replace(/_/g, " ")}</span>
              <span className="text-[color:var(--text-ink)]">{String(v)}</span>
            </div>
          ))}
        </div>
      );
    }
  } catch { /* not JSON */ }
  return <p className="mt-1 text-[color:var(--text-ink)]">{notas ?? descripcion}</p>;
}

/** Lista de registros de entrada con cabecera y cada entrada como card. */
function EntriesList({ entries }: { entries: TareaEntradaDetail[] }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--text-on-dark-muted)]">
        Registros ({entries.length})
      </p>
      {entries.map((entry, i) => (
        <div
          key={entry.entradaId ?? i}
          className="rounded-[var(--radius-sm)] border border-[color:var(--border-shell)] bg-[color:var(--surface-soft)] px-2.5 py-2 text-[11px]"
        >
          <div className="flex items-center justify-between gap-2 text-[color:var(--text-ink-muted)]">
            <span>
              #{i + 1} ·{" "}
              {new Date(entry.fecha).toLocaleString("es-AR", {
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            {entry.creadoPor?.nombre && <span>{entry.creadoPor.nombre}</span>}
          </div>
          <EntryContent descripcion={entry.descripcion} notas={entry.notas} />
        </div>
      ))}
    </div>
  );
}

/** Badge de estado de asignación (coloreado según estado). */
function AssignmentBadge({ estado }: { estado: string | null | undefined }) {
  const s = normalizeTaskStatus(estado);
  const cls =
    s === "completado"
      ? "border-[color:var(--feedback-success-border)] bg-[color:var(--feedback-success-bg)] text-[color:var(--feedback-success-text)]"
      : s === "cancelado"
        ? "border-[color:var(--feedback-danger-border)] bg-[color:var(--feedback-danger-bg)] text-[color:var(--feedback-danger-text)]"
        : "border-[color:var(--feedback-warning-border)] bg-[color:var(--feedback-warning-bg)] text-[color:var(--feedback-warning-text)]";
  return (
    <span className={`rounded-full border px-2 py-0.5 font-semibold ${cls}`}>
      {estado ?? "pendiente"}
    </span>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function OrderRow({
  task,
  isExpanded,
  taskEntries,
  loadingEntries,
  onToggleExpand,
  variant,
  catalogTaskId,
  isFincaTask,
  canDelete,
  isDeleting,
  onDelete,
}: OrderRowProps) {
  const targetLabel = getTaskTargetLabel(task);
  const asignaciones = task.tarea_asignacion ?? [];

  // ── Fecha visible en la fila ──────────────────────────────────────────────
  const dateStr = (() => {
    if (variant === "completed") {
      const d = getTaskCompletedDate(task);
      return d
        ? d.toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })
        : "Sin fecha";
    }
    const d = getActivityDate(task);
    return d > 0
      ? new Date(d).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })
      : "Sin fecha";
  })();

  // ── Estado (solo pendientes) ──────────────────────────────────────────────
  const estado = normalizeTaskStatus(task.estado ?? "pendiente");

  // ── Link operativo (solo pendientes) ─────────────────────────────────────
  const operativoHref = isFincaTask
    ? "/operacion/campo"
    : (OPERACION_TASK_ROUTES[catalogTaskId ?? ""] ?? "/operacion/recepcion");

  return (
    <div className="relative">
      {/* Dot de la línea de tiempo */}
      <div
        className={[
          "absolute -left-6 top-[14px] h-3.5 w-3.5 rounded-full border-2",
          variant === "completed"
            ? "border-[color:var(--feedback-success)] bg-[color:var(--feedback-success)]"
            : "border-[color:var(--feedback-warning)] bg-[color:var(--feedback-warning)]",
        ].join(" ")}
        aria-hidden
      />

      {/* Card wrapper — fondo oscuro siempre visible */}
      <div className="overflow-hidden rounded-[var(--radius-md)] border border-[color:var(--border-shell)] bg-[color:var(--surface-muted)]">

        {/* Fila comprimida (botón toggler) */}
        <button
          type="button"
          onClick={onToggleExpand}
          className="w-full px-3 py-2.5 text-left transition-all duration-[var(--motion-fast)] hover:bg-[color:var(--action-ghost-bg)]"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[color:var(--text-ink)]">{task.titulo}</p>
              {targetLabel ? (
                <p className="mt-0.5 text-[11px] text-[color:var(--text-ink-muted)]">{targetLabel}</p>
              ) : null}
              {variant === "pending" && task.descripcion ? (
                <p className="mt-0.5 truncate text-[11px] text-[color:var(--text-ink)]/70">{task.descripcion}</p>
              ) : null}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              {variant === "completed" ? (
                <span className="rounded-full border border-[color:var(--feedback-success-border)] bg-[color:var(--feedback-success-bg)] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--feedback-success-text)]">
                  Completada
                </span>
              ) : (
                <span className="rounded-full border border-[color:var(--feedback-warning-border)] bg-[color:var(--feedback-warning-bg)] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--feedback-warning-text)]">
                  {estado === "en_progreso" ? "En progreso" : "Pendiente"}
                </span>
              )}
              <span className="text-[11px] text-[color:var(--text-ink-muted)]">{dateStr}</span>
              {variant === "pending" && task.prioridad && task.prioridad !== "media" ? (
                <span className="text-[10px] uppercase tracking-wide text-[color:var(--text-ink-muted)]">
                  {task.prioridad}
                </span>
              ) : null}
            </div>
          </div>
        </button>

        {/* Panel expandido */}
        {isExpanded && (
          <div className="space-y-3 border-t border-[color:var(--border-default)]/50 px-3 pb-3 pt-2">

            {/* Asignaciones */}
            {asignaciones.length > 0 ? (
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--text-on-dark-muted)]">Asignaciones</p>
                {asignaciones.map((a) => (
                  <div key={a.tarea_asignacion_id} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px]">
                    <AssignmentBadge estado={a.estado} />
                    <span className="text-[color:var(--text-ink-muted)]">
                      Asignada el {new Date(a.assigned_at).toLocaleDateString("es-AR")}
                    </span>
                    {a.completed_at && (
                      <span className="text-[color:var(--feedback-success-text)]">
                        Completada el {new Date(a.completed_at).toLocaleDateString("es-AR")}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-[color:var(--text-ink-muted)]">Sin asignaciones todavía.</p>
            )}

            {/* Registros */}
            {loadingEntries || taskEntries === undefined ? (
              <p className="text-[11px] text-[color:var(--text-ink-muted)]">Cargando registros…</p>
            ) : taskEntries.length === 0 ? (
              <p className="text-[11px] text-[color:var(--text-ink-muted)]">
                {variant === "completed" ? "Sin registros guardados." : "Sin registros guardados aún."}
              </p>
            ) : (
              <EntriesList entries={taskEntries} />
            )}

            {/* Acciones (solo pendientes) */}
            {variant === "pending" && (
              <div className="flex flex-wrap items-center gap-3 border-t border-[color:var(--border-shell)]/50 pt-3">
                <Link to={operativoHref}>
                  <AppButton type="button" variant="secondary" size="sm">
                    {isFincaTask ? "Registrar en Operación Campo →" : "Ir a Registro Operativo →"}
                  </AppButton>
                </Link>
                {canDelete && (
                  <AppButton
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={onDelete}
                    disabled={isDeleting}
                    loading={isDeleting}
                  >
                    {isDeleting ? "Eliminando..." : "Eliminar"}
                  </AppButton>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
