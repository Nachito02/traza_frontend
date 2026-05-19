import type { Tarea } from "../../../features/encargos/api";
import {
  getActivityDate,
  getTaskCompletedDate,
  getTaskTargetLabel,
  normalizeTaskStatus,
} from "../tareas.helpers";

// ─── Types ────────────────────────────────────────────────────────────────────

type OrderRowProps = {
  task: Tarea;
  onOpenDetail: () => void;
  /** "pending" muestra badge de estado.
   *  "completed" muestra badge verde fijo y fecha de completado. */
  variant: "pending" | "completed";
};

// ─── Componente principal ─────────────────────────────────────────────────────

export default function OrderRow({ task, onOpenDetail, variant }: OrderRowProps) {
  const targetLabel = getTaskTargetLabel(task);

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

      {/* Card — clickeable para abrir detalle */}
      <div className="overflow-hidden rounded-[var(--radius-md)] border border-[color:var(--border-shell)] bg-[color:var(--surface-muted)]">
        <button
          type="button"
          onClick={onOpenDetail}
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

      </div>
    </div>
  );
}
