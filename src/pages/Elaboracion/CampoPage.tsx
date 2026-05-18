import { useEffect, useMemo, useState } from "react";
import {
  fetchTareasByBodega,
  fetchTareaAsignacionDetail,
  createTareaEntrada,
  finalizarTareaAsignacion,
  type Tarea,
  type TareaEntradaDetail,
} from "../../features/encargos/api";
import { getApiErrorMessage } from "../../lib/api";
import { useFincasStore } from "../../features/fincas/store";
import { useAuthStore } from "../../store/authStore";
import {
  AppButton,
  AppCard,
  AppInput,
  AppSelect,
  AppTextarea,
  MetricCard,
  NoticeBanner,
  SectionIntro,
  useAppNotifications,
} from "../../components/ui";
import { EVENTO_CONFIG, type EventoConfig } from "../Trazabilidad/eventoConfig";

// ─── helpers ────────────────────────────────────────────────────────────────

function normalizeStr(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function getEventoConfigForTask(tarea: Tarea): EventoConfig | null {
  const titleNorm = normalizeStr(tarea.titulo ?? "");
  for (const [key, config] of Object.entries(EVENTO_CONFIG)) {
    const keyNorm = normalizeStr(key);
    const labelNorm = normalizeStr(config.label);
    if (
      titleNorm === keyNorm ||
      titleNorm.includes(keyNorm) ||
      keyNorm.includes(titleNorm) ||
      titleNorm === labelNorm ||
      labelNorm.includes(titleNorm)
    ) {
      return config;
    }
  }
  return null;
}

function normalizeEstado(estado: string | undefined) {
  return String(estado ?? "").toLowerCase().trim();
}

function fechaLabel(tarea: Tarea): { text: string; overdue: boolean } | null {
  const estado = normalizeEstado(tarea.estado);
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
  const fin = new Date(tarea.fecha_fin);
  const overdue = fin < new Date();
  return {
    text: overdue
      ? `Venció el ${fin.toLocaleDateString("es-AR")}`
      : `Vence el ${fin.toLocaleDateString("es-AR")}`,
    overdue,
  };
}

function estadoBadge(estado: string | undefined) {
  switch (normalizeEstado(estado)) {
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

function formatKey(key: string) {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function EntradaDescripcion({ descripcion }: { descripcion: string }) {
  let parsed: Record<string, unknown> | null = null;
  try {
    const obj = JSON.parse(descripcion);
    if (obj && typeof obj === "object" && !Array.isArray(obj)) {
      parsed = obj as Record<string, unknown>;
    }
  } catch {
    /* texto plano */
  }

  if (!parsed) {
    return <p className="mt-1 text-xs text-[color:var(--text-ink)]">{descripcion}</p>;
  }

  return (
    <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2">
      {Object.entries(parsed).map(([key, val]) => (
        <div key={key}>
          <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[color:var(--text-ink-muted)]">
            {formatKey(key)}
          </p>
          <p className="mt-0.5 text-xs font-medium text-[color:var(--text-ink)]">
            {val === null || val === undefined ? "—" : typeof val === "boolean" ? (val ? "Sí" : "No") : String(val)}
          </p>
        </div>
      ))}
    </div>
  );
}

// ─── TareaRow ────────────────────────────────────────────────────────────────

function TareaRow({
  tarea,
  onCompleted,
}: {
  tarea: Tarea;
  onCompleted?: () => void;
}) {
  const { notifySuccess, notifyError } = useAppNotifications();
  const [open, setOpen] = useState(false);
  const [entradas, setEntradas] = useState<TareaEntradaDetail[] | null>(null);
  const [loadingEntradas, setLoadingEntradas] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  const fecha = fechaLabel(tarea);
  const asignacionId = tarea.tarea_asignacion?.[0]?.tarea_asignacion_id ?? null;
  const isCompleted = normalizeEstado(tarea.estado) === "completado";
  const eventoConfig = getEventoConfigForTask(tarea);

  const loadEntradas = () => {
    if ((tarea.tarea_asignacion?.length ?? 0) === 0) {
      setEntradas([]);
      return;
    }
    setLoadingEntradas(true);
    Promise.all(
      (tarea.tarea_asignacion ?? []).map((a) =>
        fetchTareaAsignacionDetail(a.tarea_asignacion_id),
      ),
    )
      .then((results) => setEntradas(results.flat()))
      .finally(() => setLoadingEntradas(false));
  };

  function handleToggle() {
    const willOpen = !open;
    setOpen(willOpen);
    if (willOpen && entradas === null) loadEntradas();
  }

  const setDraftField = (field: string, value: string) =>
    setDraft((prev) => ({ ...prev, [field]: value }));

  const hasDraftValues = eventoConfig
    ? Object.values(draft).some((v) => v.trim() !== "")
    : (draft["_notas"] ?? "").trim() !== "";

  const handleRegister = async () => {
    if (!asignacionId || !hasDraftValues) return;

    let descripcion: string;
    let notas: string;
    if (eventoConfig) {
      const filtered = Object.fromEntries(
        Object.entries(draft).filter(([, v]) => v.trim() !== ""),
      );
      descripcion = JSON.stringify(filtered);
      notas = Object.entries(filtered)
        .map(([k, v]) => {
          const label = eventoConfig.fields.find((f) => f.name === k)?.label ?? k;
          return `${label}: ${v}`;
        })
        .join(", ");
    } else {
      const text = draft["_notas"] ?? "";
      descripcion = text;
      notas = text;
    }

    setSaving(true);
    try {
      await createTareaEntrada(asignacionId, { notas, descripcion });
      notifySuccess({ title: "Registro guardado", message: "La entrada fue registrada correctamente." });
      setDraft({});
      loadEntradas();
    } catch (e) {
      notifyError({ title: "Error al registrar", message: getApiErrorMessage(e) });
    } finally {
      setSaving(false);
    }
  };

  const handleFinalize = async () => {
    if (!asignacionId || (entradas ?? []).length === 0) return;
    setFinalizing(true);
    try {
      await finalizarTareaAsignacion(asignacionId);
      notifySuccess({ title: "Tarea completada", message: "La tarea fue marcada como completada." });
      setOpen(false);
      onCompleted?.();
    } catch (e) {
      notifyError({ title: "Error al finalizar", message: getApiErrorMessage(e) });
    } finally {
      setFinalizing(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-[var(--radius-md)] border border-[color:var(--border-shell)] bg-[color:var(--surface-muted)]">
      {/* Header */}
      <button
        type="button"
        onClick={handleToggle}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left transition hover:bg-[color:var(--action-ghost-bg)]"
      >
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-[color:var(--text-ink)]">{tarea.titulo}</p>
          {tarea.cuartel?.codigo_cuartel && (
            <p className="text-[10px] text-[color:var(--text-ink-muted)]">
              Cuartel: {tarea.cuartel.codigo_cuartel}
            </p>
          )}
          {fecha && (
            <p className={`text-[10px] ${fecha.overdue ? "font-semibold text-red-400" : "text-[color:var(--text-ink-muted)]"}`}>
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
        <div className="space-y-4 border-t border-[color:var(--border-default)]/50 px-3 py-3">

          {/* Metadata */}
          <div className="flex flex-wrap gap-1.5">
            {tarea.prioridad && (
              <span className="rounded border border-[color:var(--border-shell)] bg-[color:var(--surface-soft)] px-2 py-0.5 text-[10px] capitalize text-[color:var(--text-ink-muted)]">
                Prioridad: {tarea.prioridad}
              </span>
            )}
            {eventoConfig && (
              <span className="rounded border border-[color:var(--border-shell)] bg-[color:var(--surface-soft)] px-2 py-0.5 text-[10px] text-[color:var(--accent-primary)]">
                {eventoConfig.label}
              </span>
            )}
          </div>

          {tarea.descripcion && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--text-ink-muted)]">
                Descripción
              </p>
              <p className="mt-0.5 text-xs text-[color:var(--text-ink)]">{tarea.descripcion}</p>
            </div>
          )}

          {tarea.imagen_url && (
            <img
              src={tarea.imagen_url}
              alt="Evidencia"
              className="max-h-48 rounded-[var(--radius-md)] border border-[color:var(--border-shell)] object-cover"
            />
          )}

          {/* Asignaciones */}
          {(tarea.tarea_asignacion?.length ?? 0) > 0 && (
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--text-ink-muted)]">
                Asignaciones
              </p>
              <div className="space-y-1.5">
                {tarea.tarea_asignacion!.map((a) => (
                  <div
                    key={a.tarea_asignacion_id}
                    className="space-y-1 rounded border border-[color:var(--border-shell)] bg-[color:var(--surface-soft)] px-3 py-2 text-xs"
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

          {/* Entradas ya guardadas */}
          {loadingEntradas && (
            <p className="text-[10px] text-[color:var(--text-ink-muted)]">Cargando registros…</p>
          )}
          {entradas && entradas.length > 0 && (
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--text-ink-muted)]">
                Registros guardados ({entradas.length})
              </p>
              <div className="space-y-1.5">
                {entradas.map((e, i) => {
                  let parsedFields: [string, string][] | null = null;
                  const rawDesc = e.notas ?? e.descripcion ?? "";
                  try {
                    const parsed = JSON.parse(rawDesc) as unknown;
                    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
                      parsedFields = Object.entries(parsed as Record<string, unknown>)
                        .filter(([, v]) => v !== null && v !== "")
                        .map(([k, v]) => {
                          const label = eventoConfig?.fields.find((f) => f.name === k)?.label ?? k.replace(/_/g, " ");
                          return [label, String(v)];
                        });
                    }
                  } catch { /* texto plano */ }

                  return (
                    <div
                      key={e.entradaId ?? i}
                      className="rounded border border-[color:var(--border-shell)] bg-[color:var(--surface-soft)] px-3 py-2 text-xs"
                    >
                      <p className="text-[10px] text-[color:var(--text-ink-muted)]">
                        #{i + 1} · {new Date(e.fecha).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                        {e.creadoPor?.nombre ? ` · ${e.creadoPor.nombre}` : ""}
                      </p>
                      {parsedFields ? (
                        <div className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-0.5">
                          {parsedFields.map(([label, value]) => (
                            <div key={label}>
                              <span className="capitalize text-[color:var(--text-ink-muted)]">{label}: </span>
                              <span className="font-medium text-[color:var(--text-ink)]">{value}</span>
                            </div>
                          ))}
                        </div>
                      ) : rawDesc ? (
                        <EntradaDescripcion descripcion={rawDesc} />
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {entradas !== null && entradas.length === 0 && (
            <p className="text-[10px] text-[color:var(--text-ink-muted)]">
              {(tarea.tarea_asignacion?.length ?? 0) === 0
                ? "Sin asignaciones — la tarea todavía no fue tomada por ningún operario."
                : isCompleted
                  ? "Completada sin datos de formulario guardados."
                  : "Sin registros guardados aún."}
            </p>
          )}

          {/* Formulario de registro */}
          {asignacionId && !isCompleted && (
            <div className="space-y-3 border-t border-[color:var(--border-default)]/50 pt-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--text-ink-muted)]">
                Registrar avance{eventoConfig ? ` — ${eventoConfig.label}` : ""}
              </p>

              {eventoConfig ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {eventoConfig.fields
                    .filter((field) => field.type !== "user_select")
                    .map((field) => {
                      const value = draft[field.name] ?? field.defaultValue ?? "";
                      if (field.type === "textarea") {
                        return (
                          <div key={field.name} className="sm:col-span-2">
                            <AppTextarea
                              label={field.label}
                              value={value}
                              onChange={(e) => setDraftField(field.name, e.target.value)}
                              placeholder={field.placeholder}
                              uiSize="lg"
                            />
                          </div>
                        );
                      }
                      if (field.type === "select" && field.options) {
                        return (
                          <AppSelect
                            key={field.name}
                            label={field.label}
                            value={value}
                            onChange={(e) => setDraftField(field.name, e.target.value)}
                          >
                            <option value="">Seleccionar...</option>
                            {field.options.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </AppSelect>
                        );
                      }
                      return (
                        <AppInput
                          key={field.name}
                          label={`${field.label}${field.required ? " *" : ""}`}
                          type={field.type === "date" ? "date" : field.type === "number" ? "number" : "text"}
                          value={value}
                          onChange={(e) => setDraftField(field.name, e.target.value)}
                          placeholder={field.placeholder}
                          step={field.step}
                          uiSize="lg"
                        />
                      );
                    })}
                </div>
              ) : (
                <AppTextarea
                  label="Notas del registro"
                  value={draft["_notas"] ?? ""}
                  onChange={(e) => setDraftField("_notas", e.target.value)}
                  placeholder="Describí qué se hizo, mediciones, observaciones..."
                  uiSize="lg"
                />
              )}

              <div className="flex flex-wrap items-center gap-2">
                <AppButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => void handleRegister()}
                  disabled={saving || !hasDraftValues}
                  loading={saving}
                >
                  {saving ? "Guardando…" : "Registrar"}
                </AppButton>
                <AppButton
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => void handleFinalize()}
                  disabled={finalizing || (entradas ?? []).length === 0}
                  loading={finalizing}
                  title={(entradas ?? []).length === 0 ? "Registrá al menos un avance antes de finalizar" : undefined}
                >
                  {finalizing ? "Finalizando…" : "Finalizar tarea"}
                </AppButton>
              </div>
              {(entradas ?? []).length === 0 && (
                <p className="text-[10px] text-[color:var(--text-ink-muted)]">
                  Necesitás registrar al menos una entrada antes de poder finalizar la tarea.
                </p>
              )}
            </div>
          )}

          <p className="border-t border-[color:var(--border-shell)]/50 pt-2 text-[10px] text-[color:var(--text-ink-muted)]">
            Creada: {tarea.created_at ? new Date(tarea.created_at).toLocaleString("es-AR") : "—"}
            {tarea.updated_at ? ` · Actualizada: ${new Date(tarea.updated_at).toLocaleString("es-AR")}` : ""}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function CampoPage() {
  const activeBodegaId = useAuthStore((state) => state.activeBodegaId);
  const fincas = useFincasStore((state) => state.fincas);
  const loadFincas = useFincasStore((state) => state.loadFincas);
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTareas = () => {
    if (!activeBodegaId) { setLoading(false); return; }
    setLoading(true);
    fetchTareasByBodega(String(activeBodegaId))
      .then((data) => setTareas(data))
      .catch(() => setTareas([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!activeBodegaId) {
      setLoading(false);
      return;
    }
    void loadFincas(activeBodegaId);
    loadTareas();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBodegaId, loadFincas]);

  const tareasDeCampo = useMemo(
    () => tareas.filter((t) => Boolean(t.finca_id ?? t.finca?.finca_id)),
    [tareas],
  );

  const porFinca = useMemo(() => {
    const map = new Map<
      string,
      { fincaId: string; nombre: string; tareas: Tarea[] }
    >();
    for (const tarea of tareasDeCampo) {
      const fincaId = String(tarea.finca_id ?? tarea.finca?.finca_id ?? "");
      if (!fincaId) continue;
      const existing = map.get(fincaId);
      if (existing) {
        existing.tareas.push(tarea);
      } else {
        const finca = fincas.find(
          (f) => String(f.finca_id ?? f.id ?? "") === fincaId,
        );
        const nombre =
          finca?.nombre_finca ?? finca?.nombre ?? finca?.name ?? `Finca ${fincaId.slice(0, 6)}`;
        map.set(fincaId, { fincaId, nombre, tareas: [tarea] });
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      a.nombre.localeCompare(b.nombre, "es"),
    );
  }, [tareasDeCampo, fincas]);

  const totales = useMemo(() => {
    const completadas = tareasDeCampo.filter(
      (t) => normalizeEstado(t.estado) === "completado",
    ).length;
    const enProgreso = tareasDeCampo.filter(
      (t) => normalizeEstado(t.estado) === "en_progreso",
    ).length;
    const pendientes = tareasDeCampo.filter(
      (t) =>
        normalizeEstado(t.estado) !== "completado" &&
        normalizeEstado(t.estado) !== "en_progreso" &&
        normalizeEstado(t.estado) !== "cancelado",
    ).length;
    return { total: tareasDeCampo.length, completadas, enProgreso, pendientes };
  }, [tareasDeCampo]);

  if (loading) {
    return (
      <NoticeBanner tone="info">Cargando operaciones de campo…</NoticeBanner>
    );
  }

  return (
    <div className="space-y-6">
      <AppCard as="section" tone="default" padding="lg">
        <SectionIntro
          eyebrow="Operaciones de campo"
          title="Actividad por finca"
          description="Tareas registradas en las fincas vinculadas a esta bodega. Expandí cada tarea para ver los datos registrados por el operario."
        />

        {tareasDeCampo.length > 0 && (
          <div className="mt-5 grid gap-4 md:grid-cols-4">
            <MetricCard label="Tareas de campo" value={totales.total} hint="Total vinculadas a fincas" />
            <MetricCard label="Completadas" value={totales.completadas} tone="success" hint="Trabajo cerrado" />
            <MetricCard label="En progreso" value={totales.enProgreso} tone="warning" hint="Con actividad activa" />
            <MetricCard label="Pendientes" value={totales.pendientes} hint="Sin iniciar o vencidas" />
          </div>
        )}
      </AppCard>

      {tareasDeCampo.length === 0 ? (
        <NoticeBanner tone="info">
          No hay tareas de campo registradas para las fincas vinculadas a esta bodega.
          Las tareas aparecen cuando los operarios reciben órdenes de trabajo asociadas a una finca.
        </NoticeBanner>
      ) : (
        porFinca.map((grupo) => (
          <AppCard
            key={grupo.fincaId}
            as="section"
            tone="default"
            padding="lg"
            header={(
              <SectionIntro
                title={grupo.nombre}
                description={`${grupo.tareas.length} tarea${grupo.tareas.length !== 1 ? "s" : ""} registrada${grupo.tareas.length !== 1 ? "s" : ""}`}
              />
            )}
          >
            <div className="space-y-2">
              {grupo.tareas
                .slice()
                .sort((a, b) => {
                  const aTime = new Date(String(a.updated_at ?? a.created_at ?? 0)).getTime();
                  const bTime = new Date(String(b.updated_at ?? b.created_at ?? 0)).getTime();
                  return bTime - aTime;
                })
                .map((tarea) => (
                  <TareaRow
                    key={String(tarea.tarea_id ?? tarea.id ?? "")}
                    tarea={tarea}
                    onCompleted={loadTareas}
                  />
                ))}
            </div>
          </AppCard>
        ))
      )}
    </div>
  );
}
