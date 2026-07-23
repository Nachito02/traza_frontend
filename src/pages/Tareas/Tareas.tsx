import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AppButton,
  AppCard,
  AppModal,
  AppSelect,
  GuidedState,
  NoticeBanner,
  SectionIntro,
} from "../../components/ui";
import type { Tarea } from "../../features/encargos/api";
import OrderRow from "./components/OrderRow";
import TaskDetailModal from "./components/TaskDetailModal";
import CreateOrderForm from "./components/CreateOrderForm";
import { useTareasData } from "./useTareasData";
import { getTaskCompletedDate, isCompletedTask } from "./tareas.helpers";

type TareasProps = {
  mode?: "manager" | "operator";
};

type SortDir = "desc" | "asc";
type StatusFilter = "todos" | "pendientes" | "completadas" | "canceladas";

// Fecha relevante para ordenar: completada → fecha de completado; si no, fecha límite; si no, creación
function taskSortTime(task: Tarea): number {
  if (isCompletedTask(task)) {
    return getTaskCompletedDate(task)?.getTime() ?? 0;
  }
  const ref = task.fecha_fin ?? task.updated_at ?? task.created_at;
  return ref ? new Date(String(ref)).getTime() : 0;
}

const Tareas = ({ mode = "operator" }: TareasProps) => {
  const {
    user,
    activeBodegaId,
    isManagerMode,
    canRenderManagerFlow,
    managerScope,
    form,
    setForm,
    tasks,
    completedTasks,
    cancelledTasks,
    loading,
    completedLoading,
    saving,
    error,
    deletingTaskId,
    fincas,
    cuartelOptions,
    assigneeOptions,
    activeProtocolo,
    protocolProcesses,
    groupedProtocolProcesses,
    scopedProtocoloTaskOptions,
    groupedProtocoloTaskOptions,
    requiresFinca,
    requiresCuartel,
    selectedCatalogTask,
    onCreate,
    onDeleteTask,
    refreshTasks,
    refreshCompletedTasks,
    confirmDialog,
  } = useTareasData(mode);

  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todos");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [detailTask, setDetailTask] = useState<Tarea | null>(null);

  const listLoading =
    statusFilter === "completadas"
      ? completedLoading
      : statusFilter === "pendientes"
        ? loading
        : loading || completedLoading;

  const visibleTasks = useMemo(() => {
    const base =
      statusFilter === "pendientes"
        ? tasks
        : statusFilter === "completadas"
          ? completedTasks
          : statusFilter === "canceladas"
            ? cancelledTasks
            : [...tasks, ...completedTasks, ...cancelledTasks];
    return base
      .slice()
      .sort((a, b) =>
        sortDir === "desc"
          ? taskSortTime(b) - taskSortTime(a)
          : taskSortTime(a) - taskSortTime(b),
      );
  }, [statusFilter, sortDir, tasks, completedTasks, cancelledTasks]);

  return (
    <div className="min-h-screen bg-secondary px-6 py-10">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <SectionIntro
          eyebrow="Trabajo diario"
          title="Órdenes de trabajo"
          description={
            isManagerMode
              ? "Centro diario para crear, asignar y completar órdenes operativas."
              : "Vista operario: gestión de órdenes asignadas a tu usuario."
          }
          actions={canRenderManagerFlow ? (
            <AppButton
              type="button"
              variant="primary"
              size="sm"
              onClick={() => setShowCreateModal(true)}
            >
              Crear orden de trabajo
            </AppButton>
          ) : undefined}
        />

        {!activeBodegaId ? (
          <GuidedState
            title="Seleccioná una bodega para ver órdenes"
            description="Las órdenes de trabajo se crean y se consultan dentro de una bodega activa. Elegí el contexto para continuar."
            action={(
              <Link to="/contexto">
                <AppButton variant="primary" size="sm">Elegir bodega</AppButton>
              </Link>
            )}
          />
        ) : isManagerMode && !canRenderManagerFlow ? (
          <AppCard as="section" tone="default" padding="lg" header={<h2 className="text-lg font-semibold text-text">Sin permisos de encargado</h2>}>
            <p className="text-xs text-text-secondary">
              Para asignar tareas necesitás rol de encargado de finca o de bodega.
            </p>
          </AppCard>
        ) : null}

        {error ? <NoticeBanner tone="danger">{error}</NoticeBanner> : null}

        {activeBodegaId ? (
          <AppCard
            as="section"
            tone="default"
            padding="lg"
            header={(
              <div className="space-y-4">
                <SectionIntro
                  title="Órdenes"
                  description={
                    isManagerMode
                      ? "Seguimiento de órdenes creadas: filtrá por estado y ordenalas por fecha."
                      : "Tus órdenes asignadas: filtrá por estado y ordenalas por fecha."
                  }
                />
                <div className="flex flex-wrap items-end gap-3">
                  <div className="w-44">
                    <AppSelect
                      label="Ordenar por fecha"
                      value={sortDir}
                      onChange={(e) => setSortDir(e.target.value as SortDir)}
                    >
                      <option value="desc">Más recientes primero</option>
                      <option value="asc">Más antiguas primero</option>
                    </AppSelect>
                  </div>
                  <div className="w-44">
                    <AppSelect
                      label="Estado"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                    >
                      <option value="todos">Todas</option>
                      <option value="pendientes">Pendientes</option>
                      <option value="completadas">Completadas</option>
                      <option value="canceladas">Canceladas</option>
                    </AppSelect>
                  </div>
                </div>
              </div>
            )}
          >
            {listLoading ? (
              <NoticeBanner tone="info">Cargando órdenes…</NoticeBanner>
            ) : visibleTasks.length === 0 ? (
              <GuidedState
                title={
                  statusFilter === "completadas"
                    ? "Todavía no hay órdenes completadas"
                    : statusFilter === "pendientes"
                      ? "No hay órdenes pendientes"
                      : "No hay órdenes que mostrar"
                }
                description={
                  statusFilter === "completadas"
                    ? "Cuando una orden se finalice, aparecerá en este historial para que el equipo pueda auditar el trabajo cerrado."
                    : isManagerMode
                      ? "Cuando crees una orden de trabajo, aparecerá acá para seguir su estado y completar el registro operativo."
                      : "Cuando te asignen una orden, aparecerá en este espacio con la acción correspondiente."
                }
              />
            ) : (
              <div className="relative mt-2 space-y-1 pl-6">
                <div className="pointer-events-none absolute bottom-2 left-[7px] top-2 w-px bg-[color:var(--border-shell)]" aria-hidden />
                {visibleTasks.map((task) => {
                  const taskId = String(task.tarea_id ?? task.id ?? "");
                  return (
                    <OrderRow
                      key={taskId}
                      task={task}
                      variant={isCompletedTask(task) ? "completed" : "pending"}
                      onOpenDetail={() => setDetailTask(task)}
                    />
                  );
                })}
              </div>
            )}
          </AppCard>
        ) : null}

      </div>
      {/* ── Modal: Nueva orden de trabajo ──────────────────────────── */}
      <AppModal
        opened={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={(
          <div className="flex w-full items-center justify-between">
            <span>Nueva orden de trabajo</span>
            <button
              type="button"
              aria-label="Cerrar"
              onClick={() => setShowCreateModal(false)}
              className="rounded-[var(--radius-md)] p-1.5 text-[color:var(--text-ink-muted)] transition-colors hover:bg-[color:var(--action-ghost-hover)] hover:text-[color:var(--text-ink)]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}
        description={`Usuario actual: ${user?.nombre ?? user?.email ?? "Usuario"}`}
        size="lg"
        showHeaderDivider
      >
        <CreateOrderForm
          managerScope={managerScope}
          form={form}
          onFormChange={(updates) => setForm((prev) => ({ ...prev, ...updates }))}
          activeProtocolo={activeProtocolo}
          protocolProcesses={protocolProcesses}
          groupedProtocolProcesses={groupedProtocolProcesses}
          scopedProtocoloTaskOptions={scopedProtocoloTaskOptions}
          groupedProtocoloTaskOptions={groupedProtocoloTaskOptions}
          requiresFinca={requiresFinca}
          requiresCuartel={requiresCuartel}
          fincas={fincas}
          cuartelOptions={cuartelOptions}
          assigneeOptions={assigneeOptions}
          selectedCatalogTask={selectedCatalogTask}
          saving={saving}
          onSubmit={async () => {
            await onCreate();
            setShowCreateModal(false);
          }}
          onCancel={() => setShowCreateModal(false)}
        />
      </AppModal>

      <TaskDetailModal
        task={detailTask}
        onClose={() => setDetailTask(null)}
        canDelete={canRenderManagerFlow}
        isDeleting={detailTask ? deletingTaskId === String(detailTask.tarea_id ?? detailTask.id ?? "") : false}
        onDelete={async () => {
          if (!detailTask) return;
          const ok = await onDeleteTask(detailTask);
          if (ok) setDetailTask(null);
        }}
        onCompleted={() => { void refreshTasks(); void refreshCompletedTasks(); }}
      />

      {confirmDialog}
    </div>
  );
};

export default Tareas;
