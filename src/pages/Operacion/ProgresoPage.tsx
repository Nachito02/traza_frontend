import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchTareasByBodega, type Tarea } from "../../features/encargos/api";
import { fetchProtocoloById, type ProtocoloExpanded } from "../../features/protocolos/api";
import { useAuthStore } from "../../store/authStore";
import { useOperacionStore } from "../../store/operacionStore";

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
        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
          Completado
        </span>
      );
    case "en_progreso":
      return (
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
          En progreso
        </span>
      );
    case "cancelado":
      return (
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
          Cancelado
        </span>
      );
    default:
      return (
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">
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
    return <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" title="Completado" />;
  }
  if (estado === "en_progreso") {
    return <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-400" title="En progreso" />;
  }
  if (estado === "pendiente") {
    return <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-300" title="Con tareas pendientes" />;
  }
  return <span className="inline-block h-2.5 w-2.5 rounded-full bg-gray-200" title="Sin tareas" />;
}

function ProcesoRow({ proceso }: { proceso: ProcesoProgreso }) {
  const [open, setOpen] = useState(false);
  const estado = procesoEstado(proceso.tareas);
  const activeTasks = getActiveTasks(proceso.tareas);
  const completedTasks = activeTasks.filter((t) => normalizeTaskEstado(t.estado) === "completado").length;
  return (
    <div className="rounded-lg border border-[#C9A961]/20 bg-[#FFF9F0]">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <ProcesoIndicator estado={estado} />
          <span className="text-sm font-medium text-[#3D1B1F] truncate">
            {proceso.nombre}
            {proceso.obligatorio ? <span className="ml-1 text-[10px] text-[#722F37]">*</span> : null}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {activeTasks.length > 0 && (
            <span className="text-[11px] text-[#7A4A50]">
              {completedTasks}/{activeTasks.length}
            </span>
          )}
          <span className="text-[10px] text-[#7A4A50]">{open ? "▲" : "▼"}</span>
        </div>
      </button>

      {open && (
        <div className="border-t border-[#C9A961]/20 px-3 py-2">
          {proceso.tareas.length === 0 ? (
            <p className="text-xs text-[#7A4A50]">Sin tareas registradas para este proceso.</p>
          ) : (
            <div className="space-y-1">
              {proceso.tareas.map((tarea) => {
                const tareaId = String(tarea.tarea_id ?? tarea.id ?? "");
                return (
                  <div
                    key={tareaId}
                    className="flex items-center justify-between gap-2 rounded bg-white px-2 py-1"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-[#3D1B1F] truncate">{tarea.titulo}</p>
                      {tarea.fecha_fin && (
                        <p className="text-[10px] text-[#7A4A50]">
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
    </div>
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
          <div className="rounded-2xl bg-primary p-6 text-sm text-text-secondary">Cargando…</div>
        </div>
      </div>
    );
  }

  if (!activeProtocoloId) {
    return (
      <div className="min-h-screen bg-secondary px-6 py-10">
        <div className="mx-auto w-full max-w-6xl">
          <div className="rounded-2xl bg-primary p-6 shadow-lg">
            <p className="text-sm text-text-secondary">
              No hay protocolo activo. Seleccioná uno desde{" "}
              <Link to="/bodega" className="underline text-[#722F37]">Bodega</Link>.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!protocolo) {
    return (
      <div className="min-h-screen bg-secondary px-6 py-10">
        <div className="mx-auto w-full max-w-6xl">
          <div className="rounded-2xl bg-primary p-6 shadow-lg">
            <p className="text-sm text-text-secondary">No se pudo cargar el protocolo.</p>
          </div>
        </div>
      </div>
    );
  }

  const pctCompleto = totales.total > 0 ? Math.round((totales.completados / totales.total) * 100) : 0;

  return (
    <div className="min-h-screen bg-secondary px-6 py-10">
      <div className="mx-auto w-full max-w-6xl space-y-4">
        <div>
          <h1 className="text-3xl font-bold text-text">Progreso</h1>
          <p className="mt-2 text-sm text-text-secondary">Estado de ejecución del protocolo activo.</p>
        </div>
      {/* Resumen */}
      <section className="rounded-2xl bg-primary p-5 shadow-lg">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-text">{protocolo.nombre ?? "Protocolo activo"}</h2>
            {protocolo.version ? (
              <p className="text-xs text-text-secondary">v{protocolo.version}</p>
            ) : null}
          </div>
          <span className="rounded-full bg-[#F3E2C7] px-3 py-1 text-xs font-semibold text-[#5A2D32]">
            {pctCompleto}% completado
          </span>
        </div>

        {/* Barra de progreso */}
        <div className="mt-4 h-2 w-full rounded-full bg-gray-200">
          <div
            className="h-2 rounded-full bg-emerald-500 transition-all"
            style={{ width: `${pctCompleto}%` }}
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-4 text-xs text-[#E8D9D0]">
          <span><span className="font-semibold text-emerald-300">{totales.completados}</span> completados</span>
          <span><span className="font-semibold text-amber-300">{totales.enProgreso}</span> en progreso</span>
          <span><span className="font-semibold text-slate-200">{totales.sinTareas}</span> sin iniciar</span>
          <span><span className="font-semibold text-white">{totales.total}</span> procesos totales</span>
        </div>
      </section>

      {/* Etapas y procesos */}
        {grouped.map((etapa) => (
          <section key={etapa.nombre} className="rounded-2xl bg-primary p-5 shadow-lg">
            <h3 className="mb-3 text-sm font-bold text-[#F5E9DD] uppercase tracking-wide">{etapa.nombre}</h3>
            <div className="space-y-2">
              {etapa.procesos.map((proceso) => (
                <ProcesoRow key={proceso.proceso_id} proceso={proceso} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
