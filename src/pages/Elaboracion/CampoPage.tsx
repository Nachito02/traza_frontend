import { useEffect, useMemo, useState } from "react";
import {
  fetchTareasByBodega,
  fetchTareaAsignacionDetail,
  type Tarea,
  type TareaEntradaDetail,
} from "../../features/encargos/api";
import { useFincasStore } from "../../features/fincas/store";
import { useAuthStore } from "../../store/authStore";
import { AppCard, MetricCard, NoticeBanner, SectionIntro } from "../../components/ui";

// ─── helpers ────────────────────────────────────────────────────────────────

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

function TareaRow({ tarea }: { tarea: Tarea }) {
  const [open, setOpen] = useState(false);
  const [entradas, setEntradas] = useState<TareaEntradaDetail[] | null>(null);
  const [loadingEntradas, setLoadingEntradas] = useState(false);
  const fecha = fechaLabel(tarea);

  function handleToggle() {
    const willOpen = !open;
    setOpen(willOpen);
    if (!willOpen || entradas !== null) return;
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
  }

  return (
    <div className="overflow-hidden rounded-[var(--radius-md)] border border-[color:var(--border-shell)] bg-[color:var(--surface-muted)]">
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
        <div className="space-y-3 border-t border-[color:var(--border-default)]/50 px-3 py-3">
          {tarea.descripcion && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--text-ink-muted)]">
                Descripción
              </p>
              <p className="mt-0.5 text-xs text-[color:var(--text-ink)]">{tarea.descripcion}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-1.5">
            {tarea.prioridad && (
              <span className="rounded border border-[color:var(--border-shell)] bg-[color:var(--surface-soft)] px-2 py-0.5 text-[10px] capitalize text-[color:var(--text-ink-muted)]">
                Prioridad: {tarea.prioridad}
              </span>
            )}
          </div>

          {tarea.imagen_url && (
            <img
              src={tarea.imagen_url}
              alt="Evidencia"
              className="max-h-48 rounded-[var(--radius-md)] border border-[color:var(--border-shell)] object-cover"
            />
          )}

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

          {loadingEntradas && (
            <p className="text-[10px] text-[color:var(--text-ink-muted)]">Cargando registros…</p>
          )}
          {entradas && entradas.length > 0 && (
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--text-ink-muted)]">
                Registros guardados ({entradas.length})
              </p>
              <div className="space-y-1.5">
                {entradas.map((e) => (
                  <div
                    key={e.entradaId}
                    className="rounded border border-[color:var(--border-shell)] bg-[color:var(--surface-soft)] px-3 py-2 text-xs"
                  >
                    <p className="text-[10px] text-[color:var(--text-ink-muted)]">
                      {new Date(e.fecha).toLocaleString("es-AR")}
                      {e.creadoPor?.nombre ? ` · ${e.creadoPor.nombre}` : ""}
                    </p>
                    {e.descripcion && <EntradaDescripcion descripcion={e.descripcion} />}
                  </div>
                ))}
              </div>
            </div>
          )}
          {entradas !== null && entradas.length === 0 && (
            <p className="text-[10px] text-[color:var(--text-ink-muted)]">
              {(tarea.tarea_asignacion?.length ?? 0) === 0
                ? "Sin asignaciones — la tarea todavía no fue tomada por ningún operario."
                : normalizeEstado(tarea.estado) === "completado"
                  ? "Completada sin datos de formulario guardados."
                  : "Sin registros guardados aún."}
            </p>
          )}

          <p className="border-t border-[color:var(--border-shell)]/50 pt-2 text-[10px] text-[color:var(--text-ink-muted)]">
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

// ─── Page ────────────────────────────────────────────────────────────────────

export default function CampoPage() {
  const activeBodegaId = useAuthStore((state) => state.activeBodegaId);
  const fincas = useFincasStore((state) => state.fincas);
  const loadFincas = useFincasStore((state) => state.loadFincas);
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeBodegaId) {
      setLoading(false);
      return;
    }
    void loadFincas(activeBodegaId);
    setLoading(true);
    fetchTareasByBodega(String(activeBodegaId))
      .then((data) => setTareas(data))
      .catch(() => setTareas([]))
      .finally(() => setLoading(false));
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
                  <TareaRow key={String(tarea.tarea_id ?? tarea.id ?? "")} tarea={tarea} />
                ))}
            </div>
          </AppCard>
        ))
      )}
    </div>
  );
}
