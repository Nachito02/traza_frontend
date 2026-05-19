import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppButton, AppModal } from "../../../components/ui";
import {
  fetchTareaAsignacionDetail,
  type Tarea,
  type TareaEntradaDetail,
} from "../../../features/encargos/api";
import { OPERACION_TASK_ROUTES } from "../tareas.constants";
import { getMatchedCatalogTaskId, normalizeTaskStatus } from "../tareas.helpers";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fechaLabel(tarea: Tarea): { text: string; overdue: boolean } | null {
  const estado = normalizeTaskStatus(tarea.estado);
  if (estado === "completado") {
    const completedAt =
      tarea.tarea_asignacion
        ?.map((a) => a.completed_at)
        .filter(Boolean)
        .sort()
        .reverse()[0] ?? tarea.updated_at;
    if (!completedAt) return null;
    return {
      text: `Completada el ${new Date(completedAt).toLocaleDateString("es-AR")}`,
      overdue: false,
    };
  }
  if (!tarea.fecha_fin) return null;
  const fechaFin = new Date(tarea.fecha_fin);
  const overdue = fechaFin < new Date();
  return {
    text: overdue
      ? `Venció el ${fechaFin.toLocaleDateString("es-AR")}`
      : `Vence el ${fechaFin.toLocaleDateString("es-AR")}`,
    overdue,
  };
}

function EstadoBadge({ estado }: { estado: string | undefined }) {
  switch (normalizeTaskStatus(estado)) {
    case "completado":
      return (
        <span className="rounded-full border border-[color:var(--feedback-success-border)] bg-[color:var(--feedback-success-bg)] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--feedback-success-text)]">
          Completado
        </span>
      );
    case "en_progreso":
      return (
        <span className="rounded-full border border-[color:var(--feedback-warning-border)] bg-[color:var(--feedback-warning-bg)] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--feedback-warning-text)]">
          En progreso
        </span>
      );
    case "cancelado":
      return (
        <span className="rounded-full border border-[color:var(--feedback-danger-border)] bg-[color:var(--feedback-danger-bg)] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--feedback-danger-text)]">
          Cancelado
        </span>
      );
    default:
      return (
        <span className="rounded-full border border-[color:var(--feedback-warning-border)] bg-[color:var(--feedback-warning-bg)] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--feedback-warning-text)]">
          Pendiente
        </span>
      );
  }
}

// ─── Adjuntos / registros ─────────────────────────────────────────────────────

type AdjuntosCampo = { campo: string; type?: string; unit?: string };
type AdjuntosPayload = {
  draft?: Record<string, unknown>;
  notas?: string | null;
  eventotipo?: string;
  plantilla?: {
    camposObligatorios?: AdjuntosCampo[];
    camposOpcionales?: AdjuntosCampo[];
  };
  validation?: {
    missingRequired?: string[];
    requiredTotal?: number;
    requiredPresent?: number;
  };
};

function formatFieldKey(key: string) {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatCampoValue(val: unknown): string {
  if (val === null || val === undefined || val === "") return "";
  if (typeof val === "boolean") return val ? "Sí" : "No";
  return String(val);
}

function AdjuntosContent({ adj }: { adj: AdjuntosPayload }) {
  const { draft, plantilla, validation, eventotipo, notas } = adj;
  const obligatorios = plantilla?.camposObligatorios ?? [];
  const opcionales = plantilla?.camposOpcionales ?? [];
  const allFields = [...obligatorios, ...opcionales];
  const missingRequired = validation?.missingRequired ?? [];
  const requiredTotal = validation?.requiredTotal ?? obligatorios.length;
  const requiredPresent = validation?.requiredPresent ?? 0;
  const hasDraft = draft && Object.keys(draft).length > 0;

  const renderFields = (fields: AdjuntosCampo[]) =>
    fields.map(({ campo }) => {
      const raw = draft?.[campo];
      const display = formatCampoValue(raw);
      const isEmpty = display === "";
      const isMissing = missingRequired.includes(campo);
      return (
        <div key={campo}>
          <p className={`text-[9px] font-semibold uppercase tracking-[0.14em] ${isMissing ? "text-red-400/80" : "text-[color:var(--text-ink-muted)]"}`}>
            {formatFieldKey(campo)}
          </p>
          <p className={`mt-0.5 text-xs ${isEmpty ? "italic text-[color:var(--text-ink-muted)]" : "font-medium text-[color:var(--text-ink)]"}`}>
            {isEmpty ? "—" : display}
          </p>
        </div>
      );
    });

  return (
    <div className="space-y-4">
      {eventotipo && (
        <span className="rounded-full border border-[color:var(--border-shell)] bg-[color:var(--surface-soft)] px-2 py-0.5 text-[10px] capitalize text-[color:var(--text-ink-muted)]">
          {eventotipo}
        </span>
      )}
      {allFields.length > 0 && hasDraft ? (
        <div>
          <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-[color:var(--text-ink-muted)]">
            Datos registrados
            {requiredTotal > 0 && (
              <span className="ml-2 font-normal normal-case">
                ({requiredPresent}/{requiredTotal} obligatorios)
              </span>
            )}
          </p>
          {obligatorios.length > 0 && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">{renderFields(obligatorios)}</div>
          )}
          {opcionales.length > 0 && (
            <div className="mt-3">
              <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-[color:var(--text-ink-muted)] opacity-60">
                Opcionales
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">{renderFields(opcionales)}</div>
            </div>
          )}
        </div>
      ) : hasDraft ? (
        <div>
          <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-[color:var(--text-ink-muted)]">
            Datos registrados
          </p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            {Object.entries(draft!).filter(([, v]) => v != null && v !== "").map(([k, v]) => (
              <div key={k}>
                <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[color:var(--text-ink-muted)]">
                  {formatFieldKey(k)}
                </p>
                <p className="mt-0.5 text-xs font-medium text-[color:var(--text-ink)]">{String(v)}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {notas && (
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[color:var(--text-ink-muted)]">Notas</p>
          <p className="mt-1 text-xs text-[color:var(--text-ink)]">{notas}</p>
        </div>
      )}
      {missingRequired.length > 0 && (
        <div className="rounded border border-red-500/20 bg-red-500/5 px-3 py-2">
          <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-red-400/80">
            Faltan {missingRequired.length} campos obligatorios
          </p>
          <p className="text-xs text-red-400/70">
            {missingRequired.map((c) => formatFieldKey(c)).join(" · ")}
          </p>
        </div>
      )}
    </div>
  );
}

function EntradaRow({ entrada }: { entrada: TareaEntradaDetail }) {
  const [open, setOpen] = useState(false);
  const adj = entrada.adjuntos as AdjuntosPayload | null | undefined;
  const hasAdjuntos = adj != null && typeof adj === "object" && !Array.isArray(adj);
  const textContent = entrada.descripcion ?? entrada.notas ?? null;
  const hasContent = hasAdjuntos || Boolean(textContent);

  return (
    <div className="overflow-hidden rounded border border-[color:var(--border-shell)] bg-[color:var(--surface-muted)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition hover:bg-[color:var(--action-ghost-bg)]"
      >
        <p className="text-[10px] text-[color:var(--text-ink-muted)]">
          {new Date(entrada.fecha).toLocaleString("es-AR")}
          {entrada.creadoPor?.nombre ? ` · ${entrada.creadoPor.nombre}` : ""}
        </p>
        <span className="shrink-0 text-[10px] text-[color:var(--text-ink-muted)]">
          {open ? "▲" : hasContent ? "▼" : "—"}
        </span>
      </button>
      {open && (
        <div className="border-t border-[color:var(--border-shell)]/50 px-3 py-3">
          {hasAdjuntos ? (
            <AdjuntosContent adj={adj} />
          ) : textContent ? (
            (() => {
              try {
                const parsed = JSON.parse(textContent) as unknown;
                if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
                  const entries = Object.entries(parsed as Record<string, unknown>).filter(
                    ([, v]) => v != null && v !== "",
                  );
                  return (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                      {entries.map(([key, val]) => (
                        <div key={key}>
                          <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[color:var(--text-ink-muted)]">
                            {formatFieldKey(key)}
                          </p>
                          <p className="mt-0.5 text-xs font-medium text-[color:var(--text-ink)]">
                            {formatCampoValue(val)}
                          </p>
                        </div>
                      ))}
                    </div>
                  );
                }
              } catch { /* texto plano */ }
              return <p className="text-xs text-[color:var(--text-ink)]">{textContent}</p>;
            })()
          ) : (
            <p className="text-[10px] text-[color:var(--text-ink-muted)]">Sin datos adicionales.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── TaskDetailModal ──────────────────────────────────────────────────────────

type TaskDetailModalProps = {
  task: Tarea | null;
  onClose: () => void;
  canDelete?: boolean;
  isDeleting?: boolean;
  onDelete?: () => void;
};

export default function TaskDetailModal({ task, onClose, canDelete, isDeleting, onDelete }: TaskDetailModalProps) {
  const [entradas, setEntradas] = useState<TareaEntradaDetail[] | null>(null);
  const [loadingEntradas, setLoadingEntradas] = useState(false);

  useEffect(() => {
    if (!task) {
      setEntradas(null);
      return;
    }
    const asignaciones = task.tarea_asignacion ?? [];
    if (asignaciones.length === 0) {
      setEntradas([]);
      return;
    }
    setLoadingEntradas(true);
    Promise.all(asignaciones.map((a) => fetchTareaAsignacionDetail(a.tarea_asignacion_id)))
      .then((results) => setEntradas(results.flat()))
      .catch(() => setEntradas([]))
      .finally(() => setLoadingEntradas(false));
  }, [task]);

  if (!task) return null;

  const hasCompletedAssignment =
    task.tarea_asignacion?.some((a) => normalizeTaskStatus(a.estado) === "completado") ?? false;
  const effectiveEstado = hasCompletedAssignment ? "completado" : task.estado;
  const fecha = fechaLabel(task);
  const isFincaTask = Boolean(task.finca_id ?? task.finca?.finca_id);
  const catalogTaskId = getMatchedCatalogTaskId(task.titulo, task.evento_tipo ?? null);
  const operativoHref = isFincaTask
    ? "/operacion/campo"
    : (OPERACION_TASK_ROUTES[catalogTaskId ?? ""] ?? "/operacion/recepcion");

  return (
    <AppModal
      opened={Boolean(task)}
      onClose={onClose}
      title={(
        <div className="flex w-full items-center justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--text-ink-muted)]">
              Detalle de orden
            </p>
            <p className="mt-0.5 truncate text-sm font-semibold text-[color:var(--text-ink)]">
              {task.titulo}
            </p>
          </div>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
            className="ml-3 shrink-0 rounded-[var(--radius-md)] p-1.5 text-[color:var(--text-ink-muted)] transition-colors hover:bg-white/10 hover:text-[color:var(--text-ink)]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}
      size="lg"
      showHeaderDivider
    >
      <div className="space-y-4">

        {/* Estado + fecha + prioridad */}
        <div className="flex flex-wrap items-center gap-2">
          <EstadoBadge estado={effectiveEstado} />
          {fecha && (
            <span className={`text-xs ${fecha.overdue ? "font-semibold text-red-400" : "text-[color:var(--text-ink-muted)]"}`}>
              {fecha.text}
            </span>
          )}
          {task.prioridad && (
            <span className="text-xs capitalize text-[color:var(--text-ink-muted)]">
              Prioridad: {task.prioridad}
            </span>
          )}
        </div>

        {/* Descripción */}
        {task.descripcion && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--text-ink-muted)]">
              Descripción
            </p>
            <p className="mt-1 text-sm text-[color:var(--text-ink)]">{task.descripcion}</p>
          </div>
        )}

        {/* Finca / Cuartel */}
        {(task.finca || task.cuartel) && (
          <div className="flex flex-wrap gap-2">
            {task.finca?.nombre_finca && (
              <span className="rounded border border-[color:var(--border-shell)] bg-[color:var(--surface-muted)] px-2 py-0.5 text-[10px] text-[color:var(--text-ink-muted)]">
                Finca: {task.finca.nombre_finca}
              </span>
            )}
            {task.cuartel?.codigo_cuartel && (
              <span className="rounded border border-[color:var(--border-shell)] bg-[color:var(--surface-muted)] px-2 py-0.5 text-[10px] text-[color:var(--text-ink-muted)]">
                Cuartel: {task.cuartel.codigo_cuartel}
              </span>
            )}
          </div>
        )}

        {/* Imagen */}
        {task.imagen_url && (
          <img
            src={task.imagen_url}
            alt="Evidencia"
            className="w-full max-h-56 rounded-[var(--radius-md)] border border-[color:var(--border-shell)] object-cover"
          />
        )}

        {/* Asignaciones */}
        {(task.tarea_asignacion?.length ?? 0) > 0 && (
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--text-ink-muted)]">
              Asignaciones
            </p>
            <div className="space-y-2">
              {task.tarea_asignacion!.map((a) => (
                <div
                  key={a.tarea_asignacion_id}
                  className="space-y-1 rounded border border-[color:var(--border-shell)] bg-[color:var(--surface-muted)] px-3 py-2.5 text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <EstadoBadge estado={a.estado} />
                    <span className="text-[10px] text-[color:var(--text-ink-muted)]">
                      Asignada el {new Date(a.assigned_at).toLocaleDateString("es-AR")}
                    </span>
                  </div>
                  {a.completed_at && (
                    <p className="text-[10px] text-[color:var(--feedback-success-text)]">
                      Completada el {new Date(a.completed_at).toLocaleString("es-AR")}
                    </p>
                  )}
                  {a.observaciones && (
                    <p className="border-t border-[color:var(--border-shell)]/50 pt-1.5 text-[color:var(--text-ink)]">
                      {a.observaciones}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Registros */}
        {loadingEntradas && (
          <p className="text-[10px] text-[color:var(--text-ink-muted)]">Cargando registros…</p>
        )}
        {entradas && entradas.length > 0 && (
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--text-ink-muted)]">
              Registros guardados ({entradas.length})
            </p>
            <div className="space-y-2">
              {entradas.map((entrada) => (
                <EntradaRow key={entrada.entradaId} entrada={entrada} />
              ))}
            </div>
          </div>
        )}
        {entradas !== null && entradas.length === 0 && !loadingEntradas && (
          <p className="text-[10px] text-[color:var(--text-ink-muted)]">
            {(task.tarea_asignacion?.length ?? 0) === 0
              ? "Sin asignaciones — la tarea todavía no fue tomada por ningún operario."
              : normalizeTaskStatus(task.estado) === "completado"
                ? "Completada sin datos de formulario guardados."
                : "Sin registros guardados aún."}
          </p>
        )}

        {/* Metadata */}
        <p className="border-t border-[color:var(--border-shell)]/50 pt-3 text-[10px] text-[color:var(--text-ink-muted)]">
          Creada: {task.created_at ? new Date(task.created_at).toLocaleString("es-AR") : "—"}
          {task.updated_at ? ` · Actualizada: ${new Date(task.updated_at).toLocaleString("es-AR")}` : ""}
        </p>

        {/* Acciones */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[color:var(--border-shell)]/50 pt-3">
          <Link
            to={operativoHref}
            onClick={onClose}
            className="inline-flex items-center rounded-[var(--radius-md)] border border-[color:var(--border-shell)] bg-[color:var(--action-secondary-bg)] px-3 py-1.5 text-xs font-semibold text-[color:var(--accent-primary)] transition hover:border-[color:var(--border-default)] hover:bg-[color:var(--action-secondary-hover)]"
          >
            {isFincaTask ? "Ir a Operación Campo →" : "Ir a Registro Operativo →"}
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
              {isDeleting ? "Eliminando…" : "Eliminar orden"}
            </AppButton>
          )}
        </div>
      </div>
    </AppModal>
  );
}
