import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppButton, AppModal } from "../../../components/ui";
import { resolveModuleAccess } from "../../../lib/permissions";
import { useAuthStore } from "../../../store/authStore";
import {
  fetchTareaAsignacionDetail,
  validarTarea,
  eliminarTareaDefinitivo,
  type Tarea,
  type TareaEntradaDetail,
} from "../../../features/encargos/api";
import { useAppNotifications } from "../../../components/ui";
import { getApiErrorMessage } from "../../../lib/api";
import { OPERACION_TASK_ROUTES } from "../tareas.constants";
import { getMatchedCatalogTaskId, normalizeTaskStatus } from "../tareas.helpers";
import { EVENTO_CONFIG, type EventoConfig } from "../../Trazabilidad/eventoConfig";

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
        <span className="rounded-full border border-[color:var(--feedback-success-border)] bg-[color:var(--feedback-success-bg)] px-3 py-1 text-xs font-semibold text-[color:var(--feedback-success-text)]">
          Completado
        </span>
      );
    case "en_progreso":
      return (
        <span className="rounded-full border border-[color:var(--feedback-warning-border)] bg-[color:var(--feedback-warning-bg)] px-3 py-1 text-xs font-semibold text-[color:var(--feedback-warning-text)]">
          En progreso
        </span>
      );
    case "cancelado":
      return (
        <span className="rounded-full border border-[color:var(--feedback-danger-border)] bg-[color:var(--feedback-danger-bg)] px-3 py-1 text-xs font-semibold text-[color:var(--feedback-danger-text)]">
          Cancelado
        </span>
      );
    default:
      return (
        <span className="rounded-full border border-[color:var(--feedback-warning-border)] bg-[color:var(--feedback-warning-bg)] px-3 py-1 text-xs font-semibold text-[color:var(--feedback-warning-text)]">
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
          <p className={`text-xs font-semibold uppercase tracking-wide ${isMissing ? "text-red-400/80" : "text-[color:var(--text-ink-muted)]"}`}>
            {formatFieldKey(campo)}
          </p>
          <p className={`mt-0.5 text-sm ${isEmpty ? "italic text-[color:var(--text-ink-muted)]" : "font-medium text-[color:var(--text-ink)]"}`}>
            {isEmpty ? "—" : display}
          </p>
        </div>
      );
    });

  return (
    <div className="space-y-4">
      {eventotipo && (
        <span className="rounded-full border border-[color:var(--border-shell)] bg-[color:var(--surface-soft)] px-2.5 py-1 text-xs capitalize text-[color:var(--text-ink-muted)]">
          {eventotipo}
        </span>
      )}
      {allFields.length > 0 && hasDraft ? (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--text-ink-muted)]">
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
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--text-ink-muted)] opacity-60">
                Opcionales
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">{renderFields(opcionales)}</div>
            </div>
          )}
        </div>
      ) : hasDraft ? (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--text-ink-muted)]">
            Datos registrados
          </p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            {Object.entries(draft!).filter(([, v]) => v != null && v !== "").map(([k, v]) => (
              <div key={k}>
                <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--text-ink-muted)]">
                  {formatFieldKey(k)}
                </p>
                <p className="mt-0.5 text-sm font-medium text-[color:var(--text-ink)]">{String(v)}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {notas && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--text-ink-muted)]">Notas</p>
          <p className="mt-1 text-sm text-[color:var(--text-ink)]">{notas}</p>
        </div>
      )}
      {missingRequired.length > 0 && (
        <div className="rounded border border-red-500/20 bg-red-500/5 px-3 py-2">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-red-400/80">
            Faltan {missingRequired.length} campos obligatorios
          </p>
          <p className="text-sm text-red-400/70">
            {missingRequired.map((c) => formatFieldKey(c)).join(" · ")}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Totales acumulados ───────────────────────────────────────────────────────

const SUMABLE_FIELDS: Record<string, { key: string; label: string; unit?: string }[]> = {
  riego:       [{ key: "volumen", label: "Volumen total" }, { key: "tiempo_horas", label: "Horas totales" }, { key: "jornales", label: "Jornales" }],
  cosecha:     [{ key: "cantidad", label: "Cantidad total" }, { key: "jornales", label: "Jornales" }],
  canopia:     [{ key: "jornales", label: "Jornales" }],
  labor_suelo: [{ key: "horas", label: "Horas" }, { key: "combustible_litros", label: "Combustible (L)" }, { key: "jornales", label: "Jornales" }],
  fertilizacion: [{ key: "cantidad_total", label: "Cantidad total" }],
};

function TotalesResumen({ entradas, eventoTipo }: { entradas: TareaEntradaDetail[]; eventoTipo: string | null }) {
  if (entradas.length < 2 || !eventoTipo) return null;

  const sumableFields = SUMABLE_FIELDS[eventoTipo] ?? [];
  if (sumableFields.length === 0) return null;

  // Leer draft desde descripcion (JSON) de cada entrada
  const drafts: Record<string, number>[] = [];
  for (const e of entradas) {
    const raw = e.descripcion ?? e.notas ?? "";
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const numericDraft: Record<string, number> = {};
        for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
          const n = Number(v);
          if (!isNaN(n) && n > 0) numericDraft[k] = n;
        }
        if (Object.keys(numericDraft).length > 0) drafts.push(numericDraft);
      }
    } catch { /* entrada sin JSON */ }
  }

  if (drafts.length < 2) return null;

  const totals = sumableFields
    .map(({ key, label }) => {
      const sum = drafts.reduce((acc, d) => acc + (d[key] ?? 0), 0);
      return sum > 0 ? { label, value: Number(sum.toFixed(2)) } : null;
    })
    .filter(Boolean) as { label: string; value: number }[];

  if (totals.length === 0) return null;

  return (
    <div className="rounded-[var(--radius-md)] border border-[color:var(--feedback-success-border)] bg-[color:var(--feedback-success-bg)] px-4 py-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--feedback-success-text)]">
        Totales acumulados ({drafts.length} registros)
      </p>
      <div className="flex flex-wrap gap-4">
        {totals.map(({ label, value }) => (
          <div key={label}>
            <p className="text-xs text-[color:var(--feedback-success-text)] opacity-70">{label}</p>
            <p className="text-sm font-semibold text-[color:var(--feedback-success-text)]">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── EntradaRow con edición completa ─────────────────────────────────────────

function parseDraftRecord(text: string | null): Record<string, string> {
  if (!text) return {};
  try {
    const parsed = JSON.parse(text) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return Object.fromEntries(
        Object.entries(parsed as Record<string, unknown>).map(([k, v]) => [k, v == null ? "" : String(v)]),
      );
    }
  } catch { /* texto plano */ }
  return {};
}

function getDraftFieldLabel(key: string, eventoConfig: EventoConfig | null) {
  return eventoConfig?.fields.find((field) => field.name === key)?.label ?? formatFieldKey(key);
}

function summarizeDraftFields(
  draft: Record<string, string>,
  eventoConfig: EventoConfig | null,
  maxItems = 3,
) {
  return Object.entries(draft)
    .filter(([, value]) => value.trim() !== "")
    .slice(0, maxItems)
    .map(([key, value]) => ({
      key,
      label: getDraftFieldLabel(key, eventoConfig),
      value,
    }));
}

type EntradaRowProps = {
  tareaId: string;
  entrada: TareaEntradaDetail;
  eventoConfig: EventoConfig | null;
};

function EntradaRow({ tareaId, entrada, eventoConfig }: EntradaRowProps) {
  const [open, setOpen] = useState(false);

  const adj = entrada.adjuntos as AdjuntosPayload | null | undefined;
  const hasAdjuntos = adj != null && typeof adj === "object" && !Array.isArray(adj);
  const textContent = entrada.descripcion ?? entrada.notas ?? null;
  const hasContent = hasAdjuntos || Boolean(textContent);
  const draftSummary = summarizeDraftFields(parseDraftRecord(textContent), eventoConfig);
  const previewText = draftSummary.length > 0
    ? null
    : hasAdjuntos
      ? "Ver datos guardados y observaciones del registro."
      : textContent
        ? textContent
        : "Sin datos adicionales.";

  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[color:var(--border-shell)] bg-[color:var(--surface-soft)] shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
      {/* Cabecera */}
      <div className="flex w-full items-start justify-between gap-3 px-4 py-3">
        <button type="button" onClick={() => setOpen((v) => !v)} className="min-w-0 flex-1 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-[color:var(--border-shell)] bg-[color:var(--surface-base)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--text-ink-muted)]">
              Registro
            </span>
            <p className="text-sm font-semibold text-[color:var(--text-ink)]">
              {new Date(entrada.fecha).toLocaleString("es-AR")}
            </p>
            {entrada.creadoPor?.nombre ? (
              <span className="text-sm text-[color:var(--text-ink-muted)]">
                · {entrada.creadoPor.nombre}
              </span>
            ) : null}
          </div>
          {draftSummary.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {draftSummary.map((item) => (
                <span
                  key={item.key}
                  className="rounded-full border border-[color:var(--border-shell)] bg-[color:var(--surface-base)] px-3 py-1 text-xs text-[color:var(--text-ink-muted)]"
                >
                  <strong className="font-semibold text-[color:var(--text-ink)]">{item.label}:</strong> {item.value}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-2 line-clamp-2 text-sm text-[color:var(--text-ink-muted)]">
              {previewText}
            </p>
          )}
        </button>
        <div className="flex shrink-0 items-center gap-2 pt-0.5">
          <Link
            to={`/operacion/registro?mode=edit&tareaId=${encodeURIComponent(tareaId)}&entradaId=${encodeURIComponent(entrada.entradaId)}&from=ordenes`}
            className="inline-flex min-h-9 cursor-pointer items-center justify-center rounded-[var(--radius-md)] border border-[color:var(--border-shell)] bg-[color:var(--action-secondary-bg)] px-3 py-2 text-xs font-semibold text-[color:var(--accent-primary)] shadow-[var(--shadow-inset-soft)] transition-all duration-[var(--motion-fast)] ease-[var(--motion-standard)] hover:border-[color:var(--border-default)] hover:bg-[color:var(--action-secondary-hover)]"
          >
            Abrir editor
          </Link>
          <AppButton
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? "Ocultar" : hasContent ? "Ver detalle" : "Sin detalle"}
          </AppButton>
        </div>
      </div>

      {/* Modo lectura */}
      {open && (
        <div className="border-t border-[color:var(--border-shell)]/60 bg-[color:var(--surface-base)] px-4 py-4">
          {hasAdjuntos ? (
            <AdjuntosContent adj={adj} />
          ) : textContent ? (
            (() => {
              try {
                const parsed = JSON.parse(textContent) as unknown;
                if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
                  const entries = Object.entries(parsed as Record<string, unknown>).filter(([, v]) => v != null && v !== "");
                  return (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                      {entries.map(([key, val]) => (
                        <div key={key}>
                          <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--text-ink-muted)]">
                            {formatFieldKey(key)}
                          </p>
                          <p className="mt-0.5 text-sm font-medium text-[color:var(--text-ink)]">{formatCampoValue(val)}</p>
                        </div>
                      ))}
                    </div>
                  );
                }
              } catch { /* texto plano */ }
              return <p className="text-sm text-[color:var(--text-ink)]">{textContent}</p>;
            })()
          ) : (
            <p className="text-sm text-[color:var(--text-ink-muted)]">Sin datos adicionales.</p>
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
  onCompleted?: () => void;
};

export default function TaskDetailModal({ task, onClose, canDelete, isDeleting, onDelete, onCompleted }: TaskDetailModalProps) {
  const [entradas, setEntradas] = useState<TareaEntradaDetail[] | null>(null);
  const [validando, setValidando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const { notifySuccess, notifyError } = useAppNotifications();

  const handleEliminar = async () => {
    const id = String(task?.tarea_id ?? task?.id ?? "");
    if (!id) return;
    setEliminando(true);
    try {
      await eliminarTareaDefinitivo(id);
      notifySuccess({ title: "Orden eliminada" });
      onCompleted?.();
      onClose();
    } catch (e) {
      notifyError({ title: "No se pudo eliminar", message: getApiErrorMessage(e) });
    } finally {
      setEliminando(false);
    }
  };

  const handleValidar = async () => {
    const id = String(task?.tarea_id ?? task?.id ?? "");
    if (!id) return;
    setValidando(true);
    try {
      await validarTarea(id);
      notifySuccess({ title: "Tarea validada" });
      onCompleted?.();
      onClose();
    } catch (e) {
      notifyError({ title: "No se pudo validar", message: getApiErrorMessage(e) });
    } finally {
      setValidando(false);
    }
  };

  const [loadingEntradas, setLoadingEntradas] = useState(false);
  const user = useAuthStore((state) => state.user);
  const activeBodegaId = useAuthStore((state) => state.activeBodegaId);
  const access = resolveModuleAccess(user, activeBodegaId);

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
  const eventoConfig = (() => {
    const et = task.evento_tipo ?? task.protocolo_proceso?.evento_tipo;
    return et ? (EVENTO_CONFIG[et] ?? null) : null;
  })();
  const operativoHref = isFincaTask
    ? (access.canAccessOperacionBodega ? "/operacion/campo" : "/campo")
    : (OPERACION_TASK_ROUTES[catalogTaskId ?? ""] ?? "/operacion/recepcion");

  return (
    <AppModal
      opened={Boolean(task)}
      onClose={onClose}
      title={(
        <div className="flex w-full items-center justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-[color:var(--text-ink-muted)]">
              Detalle de orden
            </p>
            <p className="mt-1 truncate text-lg font-semibold text-[color:var(--text-ink)]">
              {task.titulo}
            </p>
          </div>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
            className="ml-3 shrink-0 rounded-[var(--radius-md)] p-1.5 text-[color:var(--text-ink-muted)] transition-colors hover:bg-[color:var(--action-ghost-hover)] hover:text-[color:var(--text-ink)]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}
      size="lg"
      showHeaderDivider
    >
      <div className="space-y-5">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)]">
          <div className="rounded-[var(--radius-lg)] border border-[color:var(--border-shell)] bg-[color:var(--surface-muted)] px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-[color:var(--text-ink-muted)]">
              Contexto de la orden
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <EstadoBadge estado={effectiveEstado} />
              {task.prioridad ? (
                <span className="rounded-full border border-[color:var(--border-shell)] bg-[color:var(--surface-base)] px-3 py-1 text-xs font-semibold capitalize text-[color:var(--text-ink-muted)]">
                  Prioridad: {task.prioridad}
                </span>
              ) : null}
              {eventoConfig ? (
                <span className="rounded-full border border-[color:var(--border-shell)] bg-[color:var(--surface-base)] px-3 py-1 text-xs font-semibold text-[color:var(--accent-primary)]">
                  {eventoConfig.label}
                </span>
              ) : null}
            </div>
            {task.descripcion ? (
              <p className="mt-3 text-sm leading-relaxed text-[color:var(--text-ink)]">
                {task.descripcion}
              </p>
            ) : (
              <p className="mt-3 text-sm text-[color:var(--text-ink-muted)]">
                Esta orden no tiene una descripción adicional cargada.
              </p>
            )}
            {(task.finca || task.cuartel) && (
              <div className="mt-4 flex flex-wrap gap-2">
                {task.finca?.nombre_finca && (
                  <span className="rounded-[var(--radius-md)] border border-[color:var(--border-shell)] bg-[color:var(--surface-base)] px-3 py-1.5 text-sm text-[color:var(--text-ink-muted)]">
                    <strong className="font-semibold text-[color:var(--text-ink)]">Finca:</strong> {task.finca.nombre_finca}
                  </span>
                )}
                {task.cuartel?.codigo_cuartel && (
                  <span className="rounded-[var(--radius-md)] border border-[color:var(--border-shell)] bg-[color:var(--surface-base)] px-3 py-1.5 text-sm text-[color:var(--text-ink-muted)]">
                    <strong className="font-semibold text-[color:var(--text-ink)]">Cuartel:</strong> {task.cuartel.codigo_cuartel}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-1">
            <div className="rounded-[var(--radius-lg)] border border-[color:var(--border-shell)] bg-[color:var(--surface-muted)] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-[color:var(--text-ink-muted)]">
                Estado y vencimiento
              </p>
              <p className="mt-2 text-sm font-semibold text-[color:var(--text-ink)]">
                {fecha ? fecha.text : "Sin fecha comprometida"}
              </p>
              {fecha?.overdue ? (
                <p className="mt-1 text-xs font-semibold text-red-400">
                  Requiere revisión por vencimiento.
                </p>
              ) : null}
            </div>
            <div className="rounded-[var(--radius-lg)] border border-[color:var(--border-shell)] bg-[color:var(--surface-muted)] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-[color:var(--text-ink-muted)]">
                Historial
              </p>
              <p className="mt-2 text-sm text-[color:var(--text-ink)]">
                Creada: {task.created_at ? new Date(task.created_at).toLocaleDateString("es-AR") : "—"}
              </p>
              <p className="mt-1 text-sm text-[color:var(--text-ink-muted)]">
                {task.updated_at ? `Última actualización: ${new Date(task.updated_at).toLocaleDateString("es-AR")}` : "Sin actualizaciones recientes"}
              </p>
            </div>
          </div>
        </div>

        {task.imagen_url && (
          <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[color:var(--border-shell)] bg-[color:var(--surface-muted)]">
            <img
              src={task.imagen_url}
              alt="Evidencia"
              className="w-full max-h-56 object-cover"
            />
          </div>
        )}

        {/* Asignaciones */}
        {(task.tarea_asignacion?.length ?? 0) > 0 && (
          <div className="rounded-[var(--radius-lg)] border border-[color:var(--border-shell)] bg-[color:var(--surface-muted)] px-4 py-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[color:var(--text-ink-muted)]">
              Asignaciones
            </p>
            <div className="space-y-2">
              {task.tarea_asignacion!.map((a) => (
                <div
                  key={a.tarea_asignacion_id}
                  className="space-y-1.5 rounded-[var(--radius-md)] border border-[color:var(--border-shell)] bg-[color:var(--surface-base)] px-4 py-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {normalizeTaskStatus(a.estado) !== "pendiente" && (
                        <EstadoBadge estado={a.estado} />
                      )}
                      {a.app_user?.nombre && (
                        <span className="text-sm font-medium text-[color:var(--text-ink)]">
                          {a.app_user.nombre}
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-[color:var(--text-ink-muted)]">
                      Asignada el {new Date(a.assigned_at).toLocaleDateString("es-AR")}
                    </span>
                  </div>
                  {a.completed_at && (
                    <p className="text-sm text-[color:var(--feedback-success-text)]">
                      Completada el {new Date(a.completed_at).toLocaleString("es-AR")}
                    </p>
                  )}
                  {a.observaciones && (
                    <p className="border-t border-[color:var(--border-shell)]/50 pt-2 text-sm text-[color:var(--text-ink)]">
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
          <p className="text-sm text-[color:var(--text-ink-muted)]">Cargando registros…</p>
        )}
        {entradas && entradas.length > 0 && (
          <div className="rounded-[var(--radius-lg)] border border-[color:var(--border-shell)] bg-[color:var(--surface-muted)] px-4 py-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[color:var(--text-ink-muted)]">
              Registros guardados ({entradas.length})
            </p>
            <div className="space-y-2">
              <TotalesResumen
                entradas={entradas}
                eventoTipo={task.evento_tipo ?? task.protocolo_proceso?.evento_tipo ?? null}
              />
              {entradas.map((entrada) => (
                <EntradaRow
                  key={entrada.entradaId}
                  tareaId={String(task.tarea_id ?? task.id ?? "")}
                  entrada={entrada}
                  eventoConfig={eventoConfig}
                />
              ))}
            </div>
          </div>
        )}
        {entradas !== null && entradas.length === 0 && !loadingEntradas && (
          <p className="text-sm text-[color:var(--text-ink-muted)]">
            {(task.tarea_asignacion?.length ?? 0) === 0
              ? "Sin asignaciones — la tarea todavía no fue tomada por ningún operario."
              : normalizeTaskStatus(task.estado) === "completado"
                ? "Completada sin datos de formulario guardados."
                : "Sin registros guardados aún."}
          </p>
        )}

        {/* Metadata */}
        <p className="border-t border-[color:var(--border-shell)]/50 pt-3 text-xs text-[color:var(--text-ink-muted)]">
          Creada: {task.created_at ? new Date(task.created_at).toLocaleString("es-AR") : "—"}
          {task.updated_at ? ` · Actualizada: ${new Date(task.updated_at).toLocaleString("es-AR")}` : ""}
        </p>

        {/* Acciones */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[color:var(--border-shell)]/50 pt-3">
          <Link
            to={operativoHref}
            onClick={onClose}
            className="inline-flex items-center rounded-[var(--radius-md)] border border-[color:var(--border-default)] bg-[color:var(--action-primary-bg)] px-4 py-2 text-sm font-semibold text-[color:var(--action-primary-text)] transition hover:border-[color:var(--accent-secondary)] hover:bg-[color:var(--action-primary-hover)] hover:shadow-[0_0_0_1px_rgba(0,212,122,0.2),0_10px_22px_rgba(0,212,122,0.18)]"
          >
            {isFincaTask ? "Ir a Operación Campo →" : "Ir a Registro Operativo →"}
          </Link>
          <div className="flex flex-wrap gap-2">
            {normalizeTaskStatus(effectiveEstado) === "completado" && access.canAccessBodega && (
              <AppButton
                type="button"
                variant="primary"
                size="sm"
                onClick={() => void handleValidar()}
                disabled={validando}
                loading={validando}
              >
                {validando ? "Validando…" : "Validar"}
              </AppButton>
            )}
            {normalizeTaskStatus(effectiveEstado) === "cancelado" && access.canAccessBodega ? (
              <AppButton
                type="button"
                variant="danger"
                size="sm"
                onClick={() => void handleEliminar()}
                disabled={eliminando}
                loading={eliminando}
              >
                {eliminando ? "Eliminando…" : "Eliminar definitivamente"}
              </AppButton>
            ) : canDelete ? (
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
            ) : null}
          </div>
        </div>
      </div>
    </AppModal>
  );
}
