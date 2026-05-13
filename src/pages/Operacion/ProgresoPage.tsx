import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  fetchTareasByBodega,
  fetchTareaAsignacionDetail,
  type Tarea,
  type TareaEntradaDetail,
} from "../../features/encargos/api";
import { fetchProtocoloById, type ProtocoloExpanded } from "../../features/protocolos/api";
import { useFincasStore } from "../../features/fincas/store";
import { useAuthStore } from "../../store/authStore";
import { useOperacionStore } from "../../store/operacionStore";
import {
  AppCard,
  MetricCard,
  NoticeBanner,
  SectionIntro,
} from "../../components/ui";

type ProcesoProgreso = {
  proceso_id: string;
  nombre: string;
  obligatorio: boolean;
  etapaNombre: string;
  etapaOrden: number;
  orden: number;
  tareas: Tarea[];
};

function normalizeTaskEstado(estado: string | undefined) {
  return String(estado ?? "").toLowerCase().trim();
}

function getActiveTasks(tareas: Tarea[]) {
  return tareas.filter((t) => normalizeTaskEstado(t.estado) !== "cancelado");
}

function getFincaNombre(input: {
  nombre?: string | null;
  nombre_finca?: string | null;
  name?: string | null;
}) {
  return input.nombre ?? input.nombre_finca ?? input.name ?? "Finca sin nombre";
}

function fechaLabel(tarea: Tarea): { text: string; overdue: boolean } | null {
  const estado = normalizeTaskEstado(tarea.estado);

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

function estadoBadge(estado: string | undefined) {
  switch (normalizeTaskEstado(estado)) {
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
        <span className="rounded-full border border-[color:var(--feedback-neutral-border)] bg-[color:var(--feedback-neutral-bg)] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--feedback-neutral-text)]">
          Cancelado
        </span>
      );
    default:
      return (
        <span className="rounded-full border border-[color:var(--border-shell)] bg-[color:var(--surface-muted)] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--text-on-dark-muted)]">
          Pendiente
        </span>
      );
  }
}

function procesoEstado(tareas: Tarea[]): "sin_tareas" | "pendiente" | "en_progreso" | "completado" {
  const activeTasks = getActiveTasks(tareas);
  if (activeTasks.length === 0) return "sin_tareas";
  if (activeTasks.every((t) => normalizeTaskEstado(t.estado) === "completado")) return "completado";
  if (
    activeTasks.some((t) =>
      ["en_progreso", "completado"].includes(normalizeTaskEstado(t.estado)),
    )
  ) return "en_progreso";
  return "pendiente";
}

function etapaEstado(procesos: ProcesoProgreso[]) {
  if (procesos.length === 0) return "sin_tareas" as const;
  const estados = procesos.map((proceso) => procesoEstado(proceso.tareas));
  if (estados.every((estado) => estado === "completado")) return "completado" as const;
  if (estados.some((estado) => estado === "en_progreso")) return "en_progreso" as const;
  if (estados.some((estado) => estado === "pendiente")) return "pendiente" as const;
  return "sin_tareas" as const;
}

type EstadoResumen = "sin_tareas" | "pendiente" | "en_progreso" | "completado";

function ProcesoIndicator({ estado }: { estado: ReturnType<typeof procesoEstado> }) {
  if (estado === "completado") {
    return <span className="inline-block h-2.5 w-2.5 rounded-full bg-[color:var(--feedback-success)]" title="Completado" />;
  }
  if (estado === "en_progreso") {
    return <span className="inline-block h-2.5 w-2.5 rounded-full bg-[color:var(--feedback-warning)]" title="En progreso" />;
  }
  if (estado === "pendiente") {
    return <span className="inline-block h-2.5 w-2.5 rounded-full bg-[color:var(--accent-secondary)]" title="Con tareas pendientes" />;
  }
  return <span className="inline-block h-2.5 w-2.5 rounded-full bg-[color:var(--feedback-neutral-border)]" title="Sin tareas" />;
}

function formatFieldKey(key: string) {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}


type AdjuntosCampo = { campo: string; type?: string; unit?: string };

type AdjuntosPayload = {
  draft?: Record<string, unknown>;
  notas?: string | null;
  formato?: string;
  eventotipo?: string;
  plantilla?: {
    schemaDisponible?: boolean;
    camposObligatorios?: AdjuntosCampo[];
    camposOpcionales?: AdjuntosCampo[];
  };
  documentos?: unknown[];
  validation?: {
    canClose?: boolean;
    missingRequired?: string[];
    invalidFields?: string[];
    requiredTotal?: number;
    requiredPresent?: number;
  };
};

function formatCampoValue(val: unknown): string {
  if (val === null || val === undefined || val === "") return "";
  if (typeof val === "boolean") return val ? "Sí" : "No";
  return String(val);
}

function EntradaDetailContent({ adj }: { adj: AdjuntosPayload }) {
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
      {(eventotipo) && (
        <div className="flex flex-wrap gap-2">
          {eventotipo && (
            <span className="rounded-full border border-[color:var(--border-shell)] bg-[color:var(--surface-soft)] px-2 py-0.5 text-[10px] capitalize text-[color:var(--text-ink-muted)]">
              {eventotipo}
            </span>
          )}
        </div>
      )}

      {allFields.length > 0 && hasDraft ? (
        <div>
          <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-[color:var(--text-ink-muted)]">
            Datos registrados
            {requiredTotal > 0 && (
              <span className="ml-2 normal-case font-normal">
                ({requiredPresent}/{requiredTotal} obligatorios)
              </span>
            )}
          </p>
          {obligatorios.length > 0 && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">{renderFields(obligatorios)}</div>
          )}
          {opcionales.length > 0 && (
            <div className="mt-3">
              <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-[color:var(--text-ink-muted)] opacity-60">Opcionales</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">{renderFields(opcionales)}</div>
            </div>
          )}
        </div>
      ) : hasDraft ? (
        <div>
          <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-[color:var(--text-ink-muted)]">Datos registrados</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            {Object.entries(draft!).filter(([, v]) => v != null && v !== "").map(([k, v]) => (
              <div key={k}>
                <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[color:var(--text-ink-muted)]">{formatFieldKey(k)}</p>
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
          <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-red-400/80 mb-1">
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
    <div className="rounded border border-[color:var(--border-shell)] bg-[color:var(--surface-muted)] overflow-hidden">
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
            <EntradaDetailContent adj={adj} />
          ) : textContent ? (
            (() => {
              try {
                const parsed = JSON.parse(textContent);
                if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
                  const entries = Object.entries(parsed as Record<string, unknown>).filter(([, v]) => v != null && v !== "");
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

function TareaRow({ tarea }: { tarea: Tarea }) {
  const [open, setOpen] = useState(false);
  const [entradas, setEntradas] = useState<TareaEntradaDetail[] | null>(null);
  const [loadingEntradas, setLoadingEntradas] = useState(false);
  const tareaId = String(tarea.tarea_id ?? tarea.id ?? "");
  const fecha = fechaLabel(tarea);

  function handleToggle() {
    const willOpen = !open;
    setOpen(willOpen);
    if (willOpen && entradas === null && (tarea.tarea_asignacion?.length ?? 0) > 0) {
      setLoadingEntradas(true);
      Promise.all(
        (tarea.tarea_asignacion ?? []).map((a) =>
          fetchTareaAsignacionDetail(a.tarea_asignacion_id),
        ),
      )
        .then((results) => setEntradas(results.flat()))
        .finally(() => setLoadingEntradas(false));
    }
  }

  return (
    <div
      key={tareaId}
      className="rounded-[var(--radius-md)] border border-[color:var(--border-shell)] bg-[color:var(--surface-muted)] overflow-hidden"
    >
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition hover:bg-[color:var(--action-ghost-bg)]"
        onClick={handleToggle}
      >
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-[color:var(--text-ink)]">{tarea.titulo}</p>
          {fecha && (
            <p
              className={`text-[10px] ${
                fecha.overdue
                  ? "font-semibold text-red-400"
                  : "text-[color:var(--text-ink-muted)]"
              }`}
            >
              {fecha.text}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {estadoBadge(tarea.estado)}
          <span className="text-[10px] text-[color:var(--text-ink-muted)]">{open ? "▲" : "▼"}</span>
        </div>
      </button>

      {open && (
        <div className="border-t border-[color:var(--border-default)]/50 px-3 py-3 space-y-3">
          {tarea.descripcion && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--text-ink-muted)]">
                Descripción
              </p>
              <p className="mt-1 text-xs text-[color:var(--text-ink)]">{tarea.descripcion}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {tarea.prioridad && (
              <span className="rounded border border-[color:var(--border-shell)] bg-[color:var(--surface-soft)] px-2 py-0.5 text-[10px] capitalize text-[color:var(--text-ink-muted)]">
                Prioridad: {tarea.prioridad}
              </span>
            )}
            {(tarea.finca?.nombre_finca ?? tarea.finca?.nombre) && (
              <span className="rounded border border-[color:var(--border-shell)] bg-[color:var(--surface-soft)] px-2 py-0.5 text-[10px] text-[color:var(--text-ink-muted)]">
                Finca: {tarea.finca?.nombre_finca ?? tarea.finca?.nombre}
              </span>
            )}
            {tarea.cuartel?.codigo_cuartel && (
              <span className="rounded border border-[color:var(--border-shell)] bg-[color:var(--surface-soft)] px-2 py-0.5 text-[10px] text-[color:var(--text-ink-muted)]">
                Cuartel: {tarea.cuartel.codigo_cuartel}
              </span>
            )}
          </div>

          {tarea.imagen_url && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--text-ink-muted)] mb-1">
                Imagen
              </p>
              <img
                src={tarea.imagen_url}
                alt="Evidencia"
                className="max-h-48 rounded-[var(--radius-md)] border border-[color:var(--border-shell)] object-cover"
              />
            </div>
          )}

          {(tarea.tarea_asignacion?.length ?? 0) > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--text-ink-muted)] mb-2">
                Asignaciones
              </p>
              <div className="space-y-2">
                {tarea.tarea_asignacion!.map((a) => (
                  <div
                    key={a.tarea_asignacion_id}
                    className="rounded border border-[color:var(--border-shell)] bg-[color:var(--surface-soft)] px-3 py-2 text-xs space-y-1"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      {estadoBadge(a.estado)}
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
                      <p className="border-t border-[color:var(--border-shell)]/50 pt-1 text-[color:var(--text-ink)]">
                        {a.observaciones}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {loadingEntradas && (
            <p className="text-[10px] text-[color:var(--text-ink-muted)]">Cargando registros…</p>
          )}
          {entradas && entradas.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--text-ink-muted)] mb-2">
                Registros guardados ({entradas.length})
              </p>
              <div className="space-y-2">
                {entradas.map((entrada) => (
                  <EntradaRow key={entrada.entradaId} entrada={entrada} />
                ))}
              </div>
            </div>
          )}
          {entradas !== null && entradas.length === 0 && (
            <p className="text-[10px] text-[color:var(--text-ink-muted)]">
              {(tarea.tarea_asignacion?.length ?? 0) === 0
                ? "Sin asignaciones — la tarea todavía no fue tomada por ningún operario."
                : normalizeTaskEstado(tarea.estado) === "completado"
                  ? "Completada sin datos de formulario guardados."
                  : "Sin registros guardados aún."}
            </p>
          )}

          <p className="text-[10px] text-[color:var(--text-ink-muted)] border-t border-[color:var(--border-shell)]/50 pt-2">
            Creada: {tarea.created_at ? new Date(tarea.created_at).toLocaleString("es-AR") : "—"}
            {tarea.updated_at
              ? ` · Actualizada: ${new Date(tarea.updated_at).toLocaleString("es-AR")}`
              : ""}
          </p>
        </div>
      )}
    </div>
  );
}

function ProcesoRow({ proceso }: { proceso: ProcesoProgreso }) {
  const [open, setOpen] = useState(false);
  const estado = procesoEstado(proceso.tareas);
  const activeTasks = getActiveTasks(proceso.tareas);
  const completedTasks = activeTasks.filter((t) => normalizeTaskEstado(t.estado) === "completado").length;
  return (
    <AppCard as="article" tone="soft" padding="sm" className="overflow-hidden">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 rounded-[var(--radius-md)] border border-transparent px-2 py-2 text-left transition hover:border-[color:var(--border-shell)] hover:bg-[color:var(--action-ghost-bg)]"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex min-w-0 items-center gap-2">
          <ProcesoIndicator estado={estado} />
          <span className="truncate text-sm font-medium text-[color:var(--text-ink)]">
            {proceso.nombre}
            {proceso.obligatorio ? <span className="ml-1 text-[10px] text-[color:var(--accent-primary)]">*</span> : null}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {activeTasks.length > 0 && (
            <span className="text-[11px] text-[color:var(--text-ink-muted)]">
              {completedTasks}/{activeTasks.length}
            </span>
          )}
          <span className="text-[10px] text-[color:var(--text-ink-muted)]">{open ? "▲" : "▼"}</span>
        </div>
      </button>

      {open && (
        <div className="mt-3 border-t border-[color:var(--border-default)]/70 px-1 pt-3">
          {proceso.tareas.length === 0 ? (
            <p className="text-xs text-[color:var(--text-ink-muted)]">Sin tareas registradas para este proceso.</p>
          ) : (
            <div className="space-y-1.5">
              {proceso.tareas.map((tarea) => (
                <TareaRow key={String(tarea.tarea_id ?? tarea.id ?? "")} tarea={tarea} />
              ))}
            </div>
          )}
        </div>
      )}
    </AppCard>
  );
}

function TareaModal({ tarea, onClose }: { tarea: Tarea; onClose: () => void }) {
  const [entradas, setEntradas] = useState<TareaEntradaDetail[] | null>(null);
  const [loadingEntradas, setLoadingEntradas] = useState(false);
  const hasCompletedAssignment = tarea.tarea_asignacion?.some(
    (a) => normalizeTaskEstado(a.estado) === "completado",
  ) ?? false;
  const effectiveEstado = hasCompletedAssignment ? "completado" : tarea.estado;
  const fecha = hasCompletedAssignment ? null : fechaLabel(tarea);

  useEffect(() => {
    const asignaciones = tarea.tarea_asignacion ?? [];
    if (asignaciones.length === 0) {
      setEntradas([]);
      return;
    }
    setLoadingEntradas(true);
    Promise.all(asignaciones.map((a) => fetchTareaAsignacionDetail(a.tarea_asignacion_id)))
      .then((results) => setEntradas(results.flat()))
      .finally(() => setLoadingEntradas(false));
  }, [tarea]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex w-full max-w-lg flex-col max-h-[85vh] rounded-[var(--radius-xl)] border border-[color:var(--border-default)] bg-[color:var(--surface-card)] shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[color:var(--border-default)] px-5 py-4">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:var(--text-ink-muted)]">Detalle de tarea</p>
            <h2 className="mt-0.5 text-base font-semibold text-[color:var(--text-ink)]">{tarea.titulo}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full px-2.5 py-1 text-sm text-[color:var(--text-ink-muted)] hover:bg-[color:var(--action-ghost-bg)] hover:text-[color:var(--text-ink)]"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Estado + fecha */}
          <div className="flex flex-wrap items-center gap-2">
            {estadoBadge(effectiveEstado)}
            {fecha && (
              <span className={`text-xs ${fecha.overdue ? "font-semibold text-red-400" : "text-[color:var(--text-ink-muted)]"}`}>
                {fecha.text}
              </span>
            )}
            {tarea.prioridad && (
              <span className="text-xs capitalize text-[color:var(--text-ink-muted)]">
                Prioridad: {tarea.prioridad}
              </span>
            )}
          </div>

          {/* Descripción */}
          {tarea.descripcion && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--text-ink-muted)]">Descripción</p>
              <p className="mt-1 text-sm text-[color:var(--text-ink)]">{tarea.descripcion}</p>
            </div>
          )}

          {/* Finca / Cuartel */}
          {(tarea.finca || tarea.cuartel) && (
            <div className="flex flex-wrap gap-2">
              {(tarea.finca?.nombre_finca ?? tarea.finca?.nombre) && (
                <span className="rounded border border-[color:var(--border-shell)] bg-[color:var(--surface-muted)] px-2 py-0.5 text-[10px] text-[color:var(--text-ink-muted)]">
                  Finca: {tarea.finca?.nombre_finca ?? tarea.finca?.nombre}
                </span>
              )}
              {tarea.cuartel?.codigo_cuartel && (
                <span className="rounded border border-[color:var(--border-shell)] bg-[color:var(--surface-muted)] px-2 py-0.5 text-[10px] text-[color:var(--text-ink-muted)]">
                  Cuartel: {tarea.cuartel.codigo_cuartel}
                </span>
              )}
            </div>
          )}

          {/* Imagen */}
          {tarea.imagen_url && (
            <img src={tarea.imagen_url} alt="Evidencia" className="w-full max-h-56 rounded-[var(--radius-md)] border border-[color:var(--border-shell)] object-cover" />
          )}

          {/* Asignaciones */}
          {(tarea.tarea_asignacion?.length ?? 0) > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--text-ink-muted)] mb-2">Asignaciones</p>
              <div className="space-y-2">
                {tarea.tarea_asignacion!.map((a) => (
                  <div key={a.tarea_asignacion_id} className="rounded border border-[color:var(--border-shell)] bg-[color:var(--surface-muted)] px-3 py-2.5 text-xs space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      {estadoBadge(a.estado)}
                      <span className="text-[10px] text-[color:var(--text-ink-muted)]">Asignada el {new Date(a.assigned_at).toLocaleDateString("es-AR")}</span>
                    </div>
                    {a.completed_at && (
                      <p className="text-[10px] text-[color:var(--feedback-success-text)]">
                        Completada el {new Date(a.completed_at).toLocaleString("es-AR")}
                      </p>
                    )}
                    {a.observaciones && (
                      <p className="border-t border-[color:var(--border-shell)]/50 pt-1.5 text-[color:var(--text-ink)]">{a.observaciones}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Registros */}
          {loadingEntradas && <p className="text-[10px] text-[color:var(--text-ink-muted)]">Cargando registros…</p>}
          {entradas && entradas.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--text-ink-muted)] mb-2">
                Registros guardados ({entradas.length})
              </p>
              <div className="space-y-2">
                {entradas.map((entrada) => (
                  <EntradaRow key={entrada.entradaId} entrada={entrada} />
                ))}
              </div>
            </div>
          )}
          {entradas !== null && entradas.length === 0 && (
            <p className="text-[10px] text-[color:var(--text-ink-muted)]">
              {(tarea.tarea_asignacion?.length ?? 0) === 0
                ? "Sin asignaciones — la tarea todavía no fue tomada por ningún operario."
                : normalizeTaskEstado(tarea.estado) === "completado"
                  ? "Completada sin datos de formulario guardados."
                  : "Sin registros guardados aún."}
            </p>
          )}

          <p className="border-t border-[color:var(--border-shell)]/50 pt-3 text-[10px] text-[color:var(--text-ink-muted)]">
            Creada: {tarea.created_at ? new Date(tarea.created_at).toLocaleString("es-AR") : "—"}
            {tarea.updated_at ? ` · Actualizada: ${new Date(tarea.updated_at).toLocaleString("es-AR")}` : ""}
          </p>

          <div className="flex flex-wrap gap-2 border-t border-[color:var(--border-shell)]/50 pt-3">
            <Link
              to="/ordenes"
              onClick={onClose}
              className="inline-flex items-center rounded-[var(--radius-md)] border border-[color:var(--border-shell)] bg-[color:var(--action-secondary-bg)] px-3 py-1.5 text-xs font-semibold text-[color:var(--text-ink)] transition hover:border-[color:var(--border-default)] hover:bg-[color:var(--action-secondary-hover)]"
            >
              Administrar en Órdenes →
            </Link>
            <Link
              to={Boolean(tarea.finca_id ?? tarea.finca?.finca_id) ? `/operacion/campo?tareaId=${String(tarea.tarea_id ?? tarea.id ?? "")}` : "/operacion/recepcion"}
              onClick={onClose}
              className="inline-flex items-center rounded-[var(--radius-md)] border border-[color:var(--border-shell)] bg-[color:var(--action-secondary-bg)] px-3 py-1.5 text-xs font-semibold text-[color:var(--accent-primary)] transition hover:border-[color:var(--border-default)] hover:bg-[color:var(--action-secondary-hover)]"
            >
              Ir a Registro Operativo →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

type FincaResumen = {
  fincaId: string;
  nombre: string;
  tareasTotal: number;
  activas: number;
  completadas: number;
  estado: EstadoResumen;
  ultimaActividad: Tarea | undefined;
};

function FincaCard({ finca, onTareaClick }: { finca: FincaResumen; onTareaClick: (t: Tarea) => void }) {
  const [open, setOpen] = useState(false);
  const estadoLabel =
    finca.estado === "completado"
      ? "Con trabajo completado"
      : finca.estado === "en_progreso"
        ? "Con actividad en curso"
        : finca.estado === "pendiente"
          ? "Con tareas pendientes"
          : "Sin actividad registrada";

  return (
    <AppCard as="article" tone="soft" padding="md" className="border-[color:var(--border-default)] bg-[color:var(--surface-card)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex min-w-0 flex-1 items-start gap-2 text-left"
        >
          <ProcesoIndicator estado={finca.estado} />
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-[color:var(--text-ink)]">{finca.nombre}</h3>
            <p className="mt-0.5 text-sm text-[color:var(--text-ink-muted)]">{estadoLabel}</p>
          </div>
          <span className="ml-1 shrink-0 text-[10px] text-[color:var(--text-ink-muted)]">{open ? "▲" : "▼"}</span>
        </button>
        <Link to={`/fincas/${encodeURIComponent(finca.fincaId)}`}>
          <span className="inline-flex rounded-[var(--radius-md)] border border-[color:var(--border-shell)] bg-[color:var(--action-secondary-bg)] px-3 py-2 text-xs font-semibold text-[color:var(--text-ink)] transition hover:bg-[color:var(--action-secondary-hover)]">
            Ver contexto
          </span>
        </Link>
      </div>

      {open && (
        <div className="mt-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[var(--radius-md)] border border-[color:var(--border-shell)] bg-[color:var(--surface-soft)] px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--text-ink-muted)]">Tareas</p>
              <p className="mt-1 text-lg font-semibold text-[color:var(--text-ink)]">{finca.tareasTotal}</p>
            </div>
            <div className="rounded-[var(--radius-md)] border border-[color:var(--border-shell)] bg-[color:var(--surface-soft)] px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--text-ink-muted)]">Activas</p>
              <p className="mt-1 text-lg font-semibold text-[color:var(--text-ink)]">{finca.activas}</p>
            </div>
            <div className="rounded-[var(--radius-md)] border border-[color:var(--border-shell)] bg-[color:var(--surface-soft)] px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--text-ink-muted)]">Completadas</p>
              <p className="mt-1 text-lg font-semibold text-[color:var(--text-ink)]">{finca.completadas}</p>
            </div>
          </div>

          {finca.ultimaActividad ? (
            <button
              type="button"
              onClick={() => onTareaClick(finca.ultimaActividad!)}
              className="mt-4 w-full rounded-[var(--radius-md)] border border-[color:var(--border-shell)] bg-[color:var(--surface-soft)] px-4 py-3 text-left transition hover:border-[color:var(--border-default)] hover:bg-[color:var(--action-ghost-bg)]"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--text-ink-muted)]">Última actividad</p>
              <p className="mt-1 text-sm font-medium text-[color:var(--text-ink)]">{finca.ultimaActividad.titulo}</p>
              {(finca.ultimaActividad.updated_at ?? finca.ultimaActividad.created_at) && (
                <p className="mt-0.5 text-xs text-[color:var(--text-ink-muted)]">
                  {new Date(String(finca.ultimaActividad.updated_at ?? finca.ultimaActividad.created_at ?? "")).toLocaleString("es-AR")}
                </p>
              )}
              <p className="mt-1.5 text-[10px] font-medium text-[color:var(--accent-secondary)]">Ver detalle →</p>
            </button>
          ) : (
            <div className="mt-4 rounded-[var(--radius-md)] border border-[color:var(--border-shell)] bg-[color:var(--surface-soft)] px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--text-ink-muted)]">Última actividad</p>
              <p className="mt-1 text-sm text-[color:var(--text-ink-muted)]">Todavía no hay tareas asociadas a esta finca.</p>
            </div>
          )}
        </div>
      )}
    </AppCard>
  );
}

function EtapaSection({
  etapa,
  open,
  onToggle,
}: {
  etapa: { nombre: string; procesos: ProcesoProgreso[] };
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <AppCard
      as="section"
      tone="default"
      padding="lg"
      header={(
        <button
          type="button"
          onClick={onToggle}
          className="flex w-full items-center justify-between gap-3 text-left"
        >
          <SectionIntro
            title={etapa.nombre}
            description={`${etapa.procesos.length} procesos en esta etapa`}
          />
          <span className={`shrink-0 text-sm text-[color:var(--text-ink-muted)] transition-transform duration-[var(--motion-fast)] ${open ? "rotate-90" : ""}`}>
            ▶
          </span>
        </button>
      )}
    >
      {open && (
        <div className="space-y-2">
          {etapa.procesos.map((proceso) => (
            <ProcesoRow key={proceso.proceso_id} proceso={proceso} />
          ))}
        </div>
      )}
    </AppCard>
  );
}

function HelpPanel({ focoOperativo }: { focoOperativo: { nombre: string } | null }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 rounded-[var(--radius-md)] border px-3 py-1.5 text-xs font-medium transition ${
          open
            ? "border-[color:var(--border-default)] bg-white/10 text-[color:var(--text-on-dark)]"
            : "border-[color:var(--border-shell)] bg-transparent text-[color:var(--text-on-dark-muted)] hover:bg-white/5 hover:text-[color:var(--text-on-dark)]"
        }`}
      >
        <span className="flex h-4 w-4 items-center justify-center rounded-full border border-current text-[10px] font-bold leading-none">?</span>
        Cómo leer este tablero
        <span className="text-[10px] opacity-60">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="mt-3 grid gap-4 rounded-[var(--radius-lg)] border border-[color:var(--border-shell)] bg-white/5 p-4 sm:grid-cols-3">
          <div>
            <p className="text-xs font-semibold text-[color:var(--text-on-dark)]">Qué representa</p>
            <p className="mt-1 text-xs text-[color:var(--text-on-dark-muted)]">
              Una foto consolidada del protocolo activo: cuánto está completo, qué etapas tienen movimiento y dónde conviene poner foco.
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-[color:var(--text-on-dark)]">Qué no representa</p>
            <p className="mt-1 text-xs text-[color:var(--text-on-dark-muted)]">
              No es el historial de una finca ni la historia de un producto. Esa lectura vive en la vista por finca.
            </p>
          </div>
          {focoOperativo && (
            <div>
              <p className="text-xs font-semibold text-[color:var(--text-on-dark)]">Foco sugerido</p>
              <p className="mt-1 text-xs text-[color:var(--text-on-dark-muted)]">
                Revisá primero{" "}
                <span className="font-medium text-[color:var(--text-on-dark)]">{focoOperativo.nombre}</span>
                , es el próximo punto clave.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ProgresoPage() {
  const activeBodegaId = useAuthStore((state) => state.activeBodegaId);
  const { activeProtocoloId } = useOperacionStore();
  const fincas = useFincasStore((state) => state.fincas);
  const loadFincas = useFincasStore((state) => state.loadFincas);
  const [protocolo, setProtocolo] = useState<ProtocoloExpanded | null>(null);
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTarea, setSelectedTarea] = useState<Tarea | null>(null);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [etapasOpen, setEtapasOpen] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!activeProtocoloId) {
      setProtocolo(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchProtocoloById(activeProtocoloId)
      .then((data) => setProtocolo(data))
      .catch(() => setProtocolo(null))
      .finally(() => setLoading(false));
  }, [activeProtocoloId]);

  useEffect(() => {
    if (!activeBodegaId) return;
    void loadFincas(activeBodegaId);
    fetchTareasByBodega(String(activeBodegaId))
      .then((data) => setTareas(data))
      .catch(() => setTareas([]));
  }, [activeBodegaId, loadFincas]);

  const procesos = useMemo((): ProcesoProgreso[] => {
    if (!protocolo) return [];
    return (protocolo.protocolo_etapa ?? [])
      .flatMap((etapa) =>
        (etapa.protocolo_proceso ?? []).map((proceso) => ({
          proceso_id: String(proceso.proceso_id ?? proceso.id ?? ""),
          nombre: proceso.nombre ?? "",
          obligatorio: proceso.obligatorio ?? false,
          etapaNombre: etapa.nombre ?? "",
          etapaOrden: etapa.orden ?? 999,
          orden: proceso.orden ?? 999,
          tareas: tareas.filter(
            (t) => t.proceso_id && String(t.proceso_id) === String(proceso.proceso_id ?? proceso.id ?? ""),
          ),
        })),
      )
      .sort((a, b) => a.etapaOrden - b.etapaOrden || a.orden - b.orden);
  }, [protocolo, tareas]);

  const grouped = useMemo(() => {
    const map = new Map<string, { nombre: string; orden: number; procesos: ProcesoProgreso[] }>();
    procesos.forEach((p) => {
      const existing = map.get(p.etapaNombre);
      if (existing) existing.procesos.push(p);
      else map.set(p.etapaNombre, { nombre: p.etapaNombre, orden: p.etapaOrden, procesos: [p] });
    });
    return Array.from(map.values()).sort((a, b) => a.orden - b.orden);
  }, [procesos]);

  const resumenEtapas = useMemo(
    () =>
      grouped.map((etapa) => {
        const procesosActivos = etapa.procesos.filter(
          (proceso) => procesoEstado(proceso.tareas) !== "sin_tareas",
        ).length;
        const procesosCompletados = etapa.procesos.filter(
          (proceso) => procesoEstado(proceso.tareas) === "completado",
        ).length;
        return {
          ...etapa,
          estado: etapaEstado(etapa.procesos),
          procesosActivos,
          procesosCompletados,
        };
      }),
    [grouped],
  );

  const totales = useMemo(() => {
    const total = procesos.length;
    const completados = procesos.filter((p) => procesoEstado(p.tareas) === "completado").length;
    const enProgreso = procesos.filter((p) => procesoEstado(p.tareas) === "en_progreso").length;
    const sinTareas = procesos.filter((p) => {
      const estado = procesoEstado(p.tareas);
      return estado === "sin_tareas" || estado === "pendiente";
    }).length;
    return { total, completados, enProgreso, sinTareas };
  }, [procesos]);

  const focoOperativo = useMemo(() => {
    const enCurso = resumenEtapas.find((etapa) => etapa.estado === "en_progreso");
    if (enCurso) return enCurso;
    const pendiente = resumenEtapas.find((etapa) => etapa.estado === "pendiente");
    if (pendiente) return pendiente;
    return resumenEtapas[0] ?? null;
  }, [resumenEtapas]);

  const timelineTasks = useMemo(() => {
    const getDate = (t: Tarea): number => {
      const candidates: number[] = [];
      for (const a of t.tarea_asignacion ?? []) {
        if (a.completed_at) candidates.push(new Date(a.completed_at).getTime());
      }
      if (t.updated_at) candidates.push(new Date(t.updated_at).getTime());
      if (t.created_at) candidates.push(new Date(t.created_at).getTime());
      return candidates.length > 0 ? Math.max(...candidates) : 0;
    };
    return [...tareas].sort((a, b) => getDate(b) - getDate(a));
  }, [tareas]);

  const resumenFincas = useMemo(() => {
    return fincas
      .map((finca) => {
        const fincaId = String(finca.finca_id ?? finca.id ?? "");
        if (!fincaId) return null;

        const tareasFinca = tareas.filter((tarea) => String(tarea.finca_id ?? tarea.finca?.finca_id ?? "") === fincaId);
        const activas = tareasFinca.filter((tarea) => {
          const estado = normalizeTaskEstado(tarea.estado);
          return estado !== "cancelado" && estado !== "completado";
        }).length;
        const completadas = tareasFinca.filter(
          (tarea) => normalizeTaskEstado(tarea.estado) === "completado",
        ).length;
        const ultimaActividad = [...tareasFinca]
          .sort((a, b) => {
            const aTime = new Date(String(a.updated_at ?? a.created_at ?? 0)).getTime();
            const bTime = new Date(String(b.updated_at ?? b.created_at ?? 0)).getTime();
            return bTime - aTime;
          })[0];

        const estado: EstadoResumen =
          activas > 0
            ? "en_progreso"
            : completadas > 0
              ? "completado"
              : tareasFinca.length > 0
                ? "pendiente"
                : "sin_tareas";

        return {
          fincaId,
          nombre: getFincaNombre(finca),
          tareasTotal: tareasFinca.length,
          activas,
          completadas,
          estado,
          ultimaActividad,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  }, [fincas, tareas]);

  if (loading) {
    return (
      <div className="min-h-screen bg-secondary px-6 py-10">
        <div className="mx-auto w-full max-w-6xl">
          <NoticeBanner tone="info">Cargando progreso del protocolo…</NoticeBanner>
        </div>
      </div>
    );
  }

  if (!activeProtocoloId) {
    return (
      <div className="min-h-screen bg-secondary px-6 py-10">
        <div className="mx-auto w-full max-w-6xl">
          <NoticeBanner tone="warning">
            No hay protocolo activo. Seleccioná uno desde{" "}
            <Link to="/bodega" className="font-semibold text-[color:var(--accent-primary)] hover:underline">
              Bodega
            </Link>
            .
          </NoticeBanner>
        </div>
      </div>
    );
  }

  if (!protocolo) {
    return (
      <div className="min-h-screen bg-secondary px-6 py-10">
        <div className="mx-auto w-full max-w-6xl">
          <NoticeBanner tone="danger">No se pudo cargar el protocolo.</NoticeBanner>
        </div>
      </div>
    );
  }

  const pctCompleto = totales.total > 0 ? Math.round((totales.completados / totales.total) * 100) : 0;

  return (
    <>
    <div className="min-h-screen bg-secondary px-6 py-10">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <SectionIntro
          eyebrow="Vista ejecutiva"
          title="Progreso general"
          description="Panorama agregado de la operación según el protocolo activo. Esta pantalla resume la ejecución total de la bodega, no el historial detallado de una finca."
        />

        {timelineTasks.length > 0 && (
          <AppCard
            as="section"
            tone="default"
            padding="lg"
            header={(
              <button
                type="button"
                onClick={() => setTimelineOpen((v) => !v)}
                className="flex w-full items-center justify-between gap-3 text-left"
              >
                <SectionIntro
                  title="Historial de actividad"
                  description="Todas las tareas ordenadas de más reciente a más antigua."
                />
                <span className={`shrink-0 text-sm text-[color:var(--text-ink-muted)] transition-transform duration-[var(--motion-fast)] ${timelineOpen ? "rotate-90" : ""}`}>▶</span>
              </button>
            )}
          >
            {timelineOpen && (
              <div className="relative mt-2 space-y-1 pl-6">
                <div className="pointer-events-none absolute bottom-2 left-[7px] top-2 w-px bg-[color:var(--border-shell)]" aria-hidden />
                {timelineTasks.map((task) => {
                  const taskId = String(task.tarea_id ?? task.id ?? "");
                  const estado = normalizeTaskEstado(task.estado ?? "pendiente");
                  const hasCompletedAssignment = task.tarea_asignacion?.some(
                    (a) => normalizeTaskEstado(a.estado) === "completado",
                  ) ?? false;
                  const completed = estado === "completado" || hasCompletedAssignment;
                  const effectiveEstado = completed ? "completado" : estado;
                  const candidates: number[] = [];
                  for (const a of task.tarea_asignacion ?? []) {
                    if (a.completed_at) candidates.push(new Date(a.completed_at).getTime());
                  }
                  if (task.updated_at) candidates.push(new Date(task.updated_at).getTime());
                  if (task.created_at) candidates.push(new Date(task.created_at).getTime());
                  const dateTs = candidates.length > 0 ? Math.max(...candidates) : 0;
                  const dateStr = dateTs > 0
                    ? new Date(dateTs).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })
                    : "Sin fecha";
                  const fincaNombre = task.finca?.nombre_finca ?? task.finca?.nombre ?? null;
                  const cuartelCode = task.cuartel?.codigo_cuartel ?? null;
                  const targetLabel = fincaNombre
                    ? cuartelCode ? `${fincaNombre} / ${cuartelCode}` : fincaNombre
                    : null;
                  return (
                    <div key={taskId} className="relative">
                      <div
                        className={[
                          "absolute -left-6 top-[14px] h-3.5 w-3.5 rounded-full border-2",
                          completed
                            ? "border-[color:var(--feedback-success)] bg-[color:var(--feedback-success)]"
                            : effectiveEstado === "en_progreso"
                              ? "border-[color:var(--feedback-warning)] bg-[color:var(--feedback-warning)]"
                              : "border-[color:var(--border-default)] bg-[color:var(--surface-muted)]",
                        ].join(" ")}
                        aria-hidden
                      />
                      <button
                        type="button"
                        onClick={() => setSelectedTarea(task)}
                        className="w-full rounded-[var(--radius-md)] border border-[color:var(--border-shell)] bg-transparent px-3 py-2.5 text-left transition-all duration-[var(--motion-fast)] hover:border-[color:var(--border-default)] hover:bg-[color:var(--surface-muted)]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-[color:var(--text-ink)]">{task.titulo}</p>
                            {targetLabel && (
                              <p className="mt-0.5 text-[11px] text-[color:var(--text-ink-muted)]">{targetLabel}</p>
                            )}
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-1">
                            {estadoBadge(effectiveEstado)}
                            <span className="text-[11px] text-[color:var(--text-ink-muted)]">{dateStr}</span>
                          </div>
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </AppCard>
        )}

        <AppCard
          as="section"
          tone="default"
          padding="lg"
          className="bg-[color:var(--surface-hero)] text-[color:var(--text-on-dark)]"
          header={(
            <SectionIntro
              eyebrow="Tablero macro"
              title={protocolo.nombre ?? "Protocolo activo"}
              description={protocolo.version ? `Versión ${protocolo.version} · lectura consolidada por etapas y procesos` : "Lectura consolidada por etapas y procesos"}
              className="text-[color:var(--text-on-dark)]"
              descriptionClassName="text-[color:var(--text-on-dark-muted)]"
              actions={(
                <span className="rounded-[var(--radius-md)] border border-[color:var(--border-shell)] bg-[color:var(--action-secondary-bg)] px-3 py-1 text-xs font-semibold text-[color:var(--text-on-dark)]">
                  {pctCompleto}% completado
                </span>
              )}
            />
          )}
        >
          <div className="grid gap-4 md:grid-cols-4">
            <MetricCard
              label="Procesos totales"
              value={totales.total}
              hint="Base del protocolo activo"
            />
            <MetricCard
              label="Completados"
              value={totales.completados}
              tone="success"
              hint="Procesos cerrados"
            />
            <MetricCard
              label="En progreso"
              value={totales.enProgreso}
              tone="warning"
              hint="Con actividad registrada"
            />
            <MetricCard
              label="Sin iniciar"
              value={totales.sinTareas}
              hint="Pendientes o sin tareas"
            />
          </div>

          <NoticeBanner tone="info" className="mt-5">
            Usá este tablero para entender el estado general de la bodega. El seguimiento fino por origen, campaña e historial de registros va a vivir mejor en una vista dedicada por finca.
          </NoticeBanner>

          <div className="mt-5">
            <div className="h-2.5 w-full rounded-full bg-white/15">
              <div
                className="h-2.5 rounded-full bg-[color:var(--feedback-success)] transition-all"
                style={{ width: `${pctCompleto}%` }}
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-[color:var(--text-on-dark-muted)]">
              <span>
                <span className="font-semibold text-[color:var(--brand-cream-50)]">{totales.completados}</span> completados
              </span>
              <span>
                <span className="font-semibold text-[color:var(--brand-cream-100)]">{totales.enProgreso}</span> en progreso
              </span>
              <span>
                <span className="font-semibold text-white/90">{totales.sinTareas}</span> sin iniciar
              </span>
            </div>
          </div>

          <HelpPanel focoOperativo={focoOperativo} />

          <AppCard
            as="section"
            tone="soft"
            padding="md"
            className="mt-6 border-[color:var(--border-shell)] bg-[color:var(--surface-muted)]"
            header={(
              <SectionIntro
                title="Estado por etapa"
                description="Resumen rápido para ubicar dónde hay avance, trabajo en curso o etapas todavía sin activar."
                className="text-[color:var(--text-on-dark)]"
                descriptionClassName="text-[color:var(--text-on-dark-muted)]"
              />
            )}
          >
            <div className="grid gap-3 md:grid-cols-2">
              {resumenEtapas.map((etapa) => {
                const estado = etapa.estado;
                const estadoLabel =
                  estado === "completado"
                    ? "Completada"
                    : estado === "en_progreso"
                      ? "En progreso"
                      : estado === "pendiente"
                        ? "Pendiente"
                        : "Sin actividad";

                return (
                  <div
                    key={etapa.nombre}
                    className="rounded-[var(--radius-md)] border border-[color:var(--border-shell)] bg-[color:var(--surface-card)] px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[color:var(--text-on-dark)]">
                          {etapa.nombre}
                        </p>
                        <p className="text-[11px] text-[color:var(--text-on-dark-muted)]">
                          {etapa.procesosActivos}/{etapa.procesos.length} procesos con actividad
                        </p>
                      </div>
                      <ProcesoIndicator estado={estado} />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-[color:var(--text-on-dark-muted)]">
                      <span>{estadoLabel}</span>
                      <span>{etapa.procesosCompletados} completados</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </AppCard>
        </AppCard>

        <AppCard
          as="section"
          tone="default"
          padding="lg"
          header={(
            <SectionIntro
              title="Estado por finca"
              description="Primer recorte operativo por origen. Desde acá ya podés empezar a leer qué fincas tienen actividad, cuáles están quietas y cuáles necesitan una vista de detalle propia."
            />
          )}
        >
          {resumenFincas.length === 0 ? (
            <NoticeBanner tone="warning">
              No hay fincas cargadas para la bodega activa. Cuando existan fincas vinculadas, este bloque va a mostrar su estado resumido y el acceso al detalle.
            </NoticeBanner>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {resumenFincas.map((finca) => (
                <FincaCard key={finca.fincaId} finca={finca} onTareaClick={setSelectedTarea} />
              ))}
            </div>
          )}
        </AppCard>

        {grouped.length > 0 && (
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={() => {
                const allOpen = grouped.every((e) => etapasOpen[e.nombre]);
                if (allOpen) {
                  setEtapasOpen({});
                } else {
                  const next: Record<string, boolean> = {};
                  grouped.forEach((e) => { next[e.nombre] = true; });
                  setEtapasOpen(next);
                }
              }}
              className="flex items-center gap-1.5 text-xs text-[color:var(--text-ink-muted)] transition hover:text-[color:var(--text-ink)]"
            >
              <span className={`text-[10px] transition-transform duration-[var(--motion-fast)] ${grouped.every((e) => etapasOpen[e.nombre]) ? "rotate-90" : ""}`}>▶</span>
              {grouped.every((e) => etapasOpen[e.nombre]) ? "Colapsar todas" : "Expandir todas"}
            </button>
          </div>
        )}
        {grouped.map((etapa) => (
          <EtapaSection
            key={etapa.nombre}
            etapa={etapa}
            open={etapasOpen[etapa.nombre] ?? false}
            onToggle={() => setEtapasOpen((prev) => ({ ...prev, [etapa.nombre]: !prev[etapa.nombre] }))}
          />
        ))}

      </div>
    </div>

    {selectedTarea && (
      <TareaModal tarea={selectedTarea} onClose={() => setSelectedTarea(null)} />
    )}
    </>
  );
}
