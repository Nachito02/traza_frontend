import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchTareasByBodega, fetchPendientesByScope, type Tarea } from "../../features/encargos/api";
import { useFincasStore } from "../../features/fincas/store";
import { useAuthStore } from "../../store/authStore";
import { AppButton, AppCard, AppInput, AppSelect, MetricCard, NoticeBanner, SectionIntro } from "../../components/ui";
import OrderList from "../Tareas/components/OrderList";
import TaskDetailModal from "../Tareas/components/TaskDetailModal";
import { dedupeTasksById, getTaskCompletedDate, isCompletedTask, isPendingTask, normalizeTaskStatus } from "../Tareas/tareas.helpers";

type StatusFilter = "todos" | "pendientes" | "completadas" | "canceladas";

function sortTime(task: Tarea) {
  if (isCompletedTask(task)) return getTaskCompletedDate(task)?.getTime() ?? 0;
  const date = task.fecha_fin ?? task.updated_at ?? task.created_at;
  return date ? new Date(date).getTime() : 0;
}

export default function CampoPage({ standalone = false }: { standalone?: boolean }) {
  const activeBodegaId = useAuthStore((state) => state.activeBodegaId);
  return <CampoContent key={String(activeBodegaId ?? "none")} standalone={standalone} />;
}

function CampoContent({ standalone }: { standalone: boolean }) {
  const activeBodegaId = useAuthStore((state) => state.activeBodegaId);
  const fincas = useFincasStore((state) => state.fincas);
  const loadFincas = useFincasStore((state) => state.loadFincas);
  const [tasks, setTasks] = useState<Tarea[]>([]);
  const [loadedRevision, setLoadedRevision] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const loading = Boolean(activeBodegaId) && loadedRevision !== revision;
  const [detailTask, setDetailTask] = useState<Tarea | null>(null);
  const [sortDir, setSortDir] = useState("desc");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pendientes");
  const [fincaFilter, setFincaFilter] = useState("todas");
  const [query, setQuery] = useState("");
  const origin = standalone ? "campo-directo" : "campo";
  const refresh = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    if (!activeBodegaId) return;
    void loadFincas(activeBodegaId);
    Promise.all([
      fetchTareasByBodega(String(activeBodegaId)),
      fetchPendientesByScope({ bodegaId: String(activeBodegaId), mode: "mine" }),
    ]).then(([all, mine]) => {
      if (active) {
        setTasks(dedupeTasksById([...mine, ...all]));
        setError(null);
      }
    }).catch(() => {
      if (active) setError("No se pudieron cargar las tareas de campo. Intentá nuevamente.");
    }).finally(() => { if (active) setLoadedRevision(revision); });
    return () => { active = false; };
  }, [activeBodegaId, loadFincas, revision]);

  const fieldTasks = useMemo(() => tasks
    .filter((task) => Boolean(task.finca_id ?? task.finca?.finca_id))
    .map((task) => ({ ...task, finca: {
      ...task.finca,
      nombre_finca: task.finca?.nombre_finca ?? fincas.find((finca) => String(finca.finca_id ?? finca.id) === String(task.finca_id ?? task.finca?.finca_id))?.nombre_finca,
    } })), [tasks, fincas]);

  const fincaOptions = useMemo(() => [...new Map(fieldTasks.map((task) => [
    String(task.finca_id ?? task.finca?.finca_id), task.finca?.nombre_finca ?? "Finca sin nombre",
  ])).entries()].sort((a, b) => a[1].localeCompare(b[1], "es")), [fieldTasks]);

  const visibleTasks = useMemo(() => fieldTasks.filter((task) => {
    if (fincaFilter !== "todas" && String(task.finca_id ?? task.finca?.finca_id) !== fincaFilter) return false;
    if (statusFilter === "pendientes" && !isPendingTask(task)) return false;
    if (statusFilter === "completadas" && !isCompletedTask(task)) return false;
    if (statusFilter === "canceladas" && normalizeTaskStatus(task.estado) !== "cancelado") return false;
    return [task.titulo, task.cuartel?.codigo_cuartel ?? ""].join(" ").toLowerCase().includes(query.trim().toLowerCase());
  }).sort((a, b) => sortDir === "desc" ? sortTime(b) - sortTime(a) : sortTime(a) - sortTime(b)), [fieldTasks, fincaFilter, statusFilter, query, sortDir]);

  const content = (
    <div className="space-y-6">
      <SectionIntro eyebrow="Operaciones de campo" title="Actividad de campo" description="Consultá las órdenes de las fincas y completá las tareas desde su detalle." actions={!standalone ? <Link to={"/operacion/registro?from=" + origin}><AppButton variant="primary">+ Registrar actividad</AppButton></Link> : undefined} />
      {!activeBodegaId ? <NoticeBanner tone="info">Seleccioná una bodega para consultar las tareas de campo.</NoticeBanner> : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="Tareas de campo" value={fieldTasks.length} hint="Total vinculadas a fincas" />
            <MetricCard label="Completadas" value={fieldTasks.filter(isCompletedTask).length} tone="success" hint="Trabajo cerrado" />
            <MetricCard label="En progreso" value={fieldTasks.filter((task) => normalizeTaskStatus(task.estado) === "en_progreso").length} tone="warning" hint="Con actividad activa" />
            <MetricCard label="Pendientes" value={fieldTasks.filter((task) => normalizeTaskStatus(task.estado) === "pendiente").length} hint="Sin iniciar o vencidas" />
          </div>
          <AppCard as="section" tone="default" padding="lg" header={
            <div className="space-y-4">
              <SectionIntro title="Órdenes de campo" description="Filtrá por finca y estado, o buscá una tarea por título o cuartel." />
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-48 flex-1"><AppInput label="Buscar tarea" type="search" placeholder="Título o cuartel…" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
                <div className="w-48"><AppSelect label="Finca" value={fincaFilter} onChange={(event) => setFincaFilter(event.target.value)}><option value="todas">Todas las fincas</option>{fincaOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</AppSelect></div>
                <div className="w-44"><AppSelect label="Estado" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}><option value="todos">Todas</option><option value="pendientes">Pendientes</option><option value="completadas">Completadas</option><option value="canceladas">Canceladas</option></AppSelect></div>
                <div className="w-44"><AppSelect label="Ordenar por fecha" value={sortDir} onChange={(event) => setSortDir(event.target.value)}><option value="desc">Más recientes primero</option><option value="asc">Más antiguas primero</option></AppSelect></div>
              </div>
            </div>
          }>
            {error ? <NoticeBanner tone="danger">{error} <AppButton size="sm" onClick={refresh}>Reintentar</AppButton></NoticeBanner> : loading ? <NoticeBanner tone="info">Cargando órdenes…</NoticeBanner> : visibleTasks.length ? <OrderList tasks={visibleTasks} onOpenDetail={setDetailTask} /> : <NoticeBanner tone="info">{fieldTasks.length ? "No hay tareas que coincidan con los filtros seleccionados." : "No hay tareas de campo para las fincas de esta bodega."}</NoticeBanner>}
          </AppCard>
        </>
      )}
      <TaskDetailModal task={detailTask} origin={origin} onClose={() => setDetailTask(null)} onCompleted={refresh} />
    </div>
  );
  return standalone ? <div className="min-h-screen bg-secondary px-6 py-10"><div className="mx-auto w-full max-w-6xl">{content}</div></div> : content;
}
