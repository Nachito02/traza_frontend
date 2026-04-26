import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchTareasByBodega, type Tarea } from "../../features/encargos/api";
import { fetchProtocoloById, type ProtocoloExpanded } from "../../features/protocolos/api";
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
            <div className="space-y-1">
              {proceso.tareas.map((tarea) => {
                const tareaId = String(tarea.tarea_id ?? tarea.id ?? "");
                return (
                  <div
                    key={tareaId}
                    className="flex items-center justify-between gap-2 rounded-[var(--radius-md)] border border-[color:var(--border-shell)] bg-[color:var(--surface-muted)] px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-[color:var(--text-ink)]">{tarea.titulo}</p>
                      {tarea.fecha_fin && (
                        <p className="text-[10px] text-[color:var(--text-ink-muted)]">
                          Vence: {new Date(tarea.fecha_fin).toLocaleDateString("es-AR")}
                        </p>
                      )}
                    </div>
                    {estadoBadge(tarea.estado)}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </AppCard>
  );
}

export default function ProgresoPage() {
  const activeBodegaId = useAuthStore((state) => state.activeBodegaId);
  const { activeProtocoloId } = useOperacionStore();
  const [protocolo, setProtocolo] = useState<ProtocoloExpanded | null>(null);
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [loading, setLoading] = useState(true);

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
    fetchTareasByBodega(String(activeBodegaId))
      .then((data) => setTareas(data))
      .catch(() => setTareas([]));
  }, [activeBodegaId]);

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
    <div className="min-h-screen bg-secondary px-6 py-10">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <SectionIntro
          title="Progreso"
          description="Estado de ejecución del protocolo activo."
        />

        <AppCard
          as="section"
          tone="default"
          padding="lg"
          className="bg-[color:var(--surface-hero)] text-[color:var(--text-on-dark)]"
          header={(
            <SectionIntro
              title={protocolo.nombre ?? "Protocolo activo"}
              description={protocolo.version ? `Versión ${protocolo.version}` : undefined}
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
        </AppCard>

        {grouped.map((etapa) => (
          <AppCard
            key={etapa.nombre}
            as="section"
            tone="default"
            padding="lg"
            header={(
              <SectionIntro
                title={etapa.nombre}
                description={`${etapa.procesos.length} procesos en esta etapa`}
              />
            )}
          >
            <div className="space-y-2">
              {etapa.procesos.map((proceso) => (
                <ProcesoRow key={proceso.proceso_id} proceso={proceso} />
              ))}
            </div>
          </AppCard>
        ))}
      </div>
    </div>
  );
}
