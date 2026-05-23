import { useState } from "react";
import { Link } from "react-router-dom";
import {
  AppButton,
  AppCard,
  AppModal,
  GuidedState,
  NoticeBanner,
  SectionIntro,
} from "../../components/ui";
import type { Tarea } from "../../features/encargos/api";
import OrderRow from "./components/OrderRow";
import TaskDetailModal from "./components/TaskDetailModal";
import CreateOrderForm from "./components/CreateOrderForm";
import { useTareasData } from "./useTareasData";

type TareasProps = {
  mode?: "manager" | "operator";
};

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
    requiresFincaTarget,
    selectedCatalogTask,
    onCreate,
    onDeleteTask,
    confirmDialog,
  } = useTareasData(mode);

  const [ordersView, setOrdersView] = useState<"pending" | "completed">("pending");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [detailTask, setDetailTask] = useState<Tarea | null>(null);

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
                  title={ordersView === "pending" ? "Pendientes" : "Completadas"}
                  description={
                    ordersView === "pending"
                      ? isManagerMode
                        ? "Seguimiento de órdenes creadas y registros pendientes por completar."
                        : "Tus órdenes activas, listas para registrar avances y finalizarlas."
                      : "Historial de trabajos cerrados para revisar qué ya quedó resuelto."
                  }
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => { setOrdersView("pending"); }}
                    className={[
                      "inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-md)] border px-3 py-2 text-xs font-semibold shadow-[var(--shadow-inset-soft)] transition-all duration-[var(--motion-fast)] ease-[var(--motion-standard)]",
                      ordersView === "pending"
                        ? "border-[color:var(--border-default)] bg-[color:var(--action-primary-bg)] text-[color:var(--text-primary)]"
                        : "border-[color:var(--border-shell)] bg-[color:var(--action-secondary-bg)] text-[color:var(--text-on-dark-muted)] hover:border-[color:var(--border-default)] hover:bg-[color:var(--action-secondary-hover)] hover:text-[color:var(--text-on-dark)]",
                    ].join(" ")}
                  >
                    Pendientes
                    <span className="rounded-full bg-[color:var(--surface-muted)] px-2 py-0.5 text-[11px] text-[color:var(--text-on-dark)]">
                      {loading ? "..." : tasks.length}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setOrdersView("completed"); }}
                    className={[
                      "inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-md)] border px-3 py-2 text-xs font-semibold shadow-[var(--shadow-inset-soft)] transition-all duration-[var(--motion-fast)] ease-[var(--motion-standard)]",
                      ordersView === "completed"
                        ? "border-[color:var(--border-default)] bg-[color:var(--action-primary-bg)] text-[color:var(--text-primary)]"
                        : "border-[color:var(--border-shell)] bg-[color:var(--action-secondary-bg)] text-[color:var(--text-on-dark-muted)] hover:border-[color:var(--border-default)] hover:bg-[color:var(--action-secondary-hover)] hover:text-[color:var(--text-on-dark)]",
                    ].join(" ")}
                  >
                    Completadas
                    <span className="rounded-full bg-[color:var(--surface-muted)] px-2 py-0.5 text-[11px] text-[color:var(--text-on-dark)]">
                      {completedLoading ? "..." : completedTasks.length}
                    </span>
                  </button>
                </div>
              </div>
            )}
          >
            {/* ── Pendientes ─────────────────────────────────────── */}
            {ordersView === "pending" ? (
              loading ? (
                <NoticeBanner tone="info">Cargando tareas…</NoticeBanner>
              ) : tasks.length === 0 ? (
                <GuidedState
                  title="No hay órdenes pendientes"
                  description={
                    isManagerMode
                      ? "Cuando crees una orden de trabajo, aparecerá acá para seguir su estado y completar el registro operativo."
                      : "Cuando te asignen una orden, aparecerá en este espacio con la acción correspondiente."
                  }
                />
              ) : (
                <div className="relative mt-2 space-y-1 pl-6">
                  <div className="pointer-events-none absolute bottom-2 left-[7px] top-2 w-px bg-[color:var(--border-shell)]" aria-hidden />
                  {tasks.map((task) => {
                    const taskId = String(task.tarea_id ?? task.id ?? "");
                    return (
                      <OrderRow
                        key={taskId}
                        task={task}
                        variant="pending"
                        onOpenDetail={() => setDetailTask(task)}
                      />
                    );
                  })}
                </div>
              )
            ) : (
              /* ── Completadas ─────────────────────────────────────── */
              completedLoading ? (
                <NoticeBanner tone="info">Cargando órdenes completadas…</NoticeBanner>
              ) : completedTasks.length === 0 ? (
                <GuidedState
                  title="Todavía no hay órdenes completadas"
                  description="Cuando una orden se finalice, aparecerá en este historial para que el equipo pueda auditar el trabajo cerrado."
                  steps={[
                    { label: "Pendientes bajo control", done: tasks.length === 0 },
                    { label: "Historial operativo", done: false },
                  ]}
                />
              ) : (
                <div className="relative mt-2 space-y-1 pl-6">
                  <div className="pointer-events-none absolute bottom-2 left-[7px] top-2 w-px bg-[color:var(--border-shell)]" aria-hidden />
                  {completedTasks.map((task) => {
                    const taskId = String(task.tarea_id ?? task.id ?? "");
                    return (
                      <OrderRow
                        key={taskId}
                        task={task}
                        variant="completed"
                        onOpenDetail={() => setDetailTask(task)}
                      />
                    );
                  })}
                </div>
              )
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
              className="rounded-[var(--radius-md)] p-1.5 text-[color:var(--text-ink-muted)] transition-colors hover:bg-white/10 hover:text-[color:var(--text-ink)]"
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
          requiresFincaTarget={requiresFincaTarget}
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
        onDelete={() => { if (detailTask) void onDeleteTask(detailTask); }}
      />

      {confirmDialog}
    </div>
  );
};

export default Tareas;
