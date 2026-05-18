import { useState } from "react";
import { Link } from "react-router-dom";
import {
  AppButton,
  AppCard,
  GuidedState,
  NoticeBanner,
  SectionIntro,
} from "../../components/ui";
import { getMatchedCatalogTaskId } from "./tareas.helpers";
import OrderRow from "./components/OrderRow";
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
    expandedTaskId,
    setExpandedTaskId,
    expandedTaskEntries,
    expandedTaskEntriesLoading,
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
    getEventoTipoForTask,
    refreshTasks,
    onCreate,
    onDeleteTask,
    confirmDialog,
  } = useTareasData(mode);

  const [ordersView, setOrdersView] = useState<"pending" | "completed">("pending");
  const [showCreateForm, setShowCreateForm] = useState(false);

  return (
    <div className={isManagerMode ? "w-full" : "min-h-screen bg-secondary px-6 py-10"}>
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <SectionIntro
          title="Órdenes de trabajo"
          description={
            isManagerMode
              ? "Centro diario para crear, asignar y completar órdenes operativas."
              : "Vista operario: gestión de órdenes asignadas a tu usuario."
          }
          actions={(
            <AppButton
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => void refreshTasks()}
            >
              Refrescar
            </AppButton>
          )}
        />

        {activeBodegaId && timelineTasks.length > 0 ? (
          <AppCard
            as="section"
            tone="default"
            padding="lg"
            header={(
              <div className="flex items-center justify-between gap-3">
                <SectionIntro
                  title="Historial de actividad"
                  description="Todas las tareas ordenadas de más reciente a más antigua."
                />
                <button
                  type="button"
                  onClick={() => setTimelineOpen((v) => !v)}
                  className="shrink-0 rounded-[var(--radius-md)] border border-[color:var(--border-shell)] bg-[color:var(--action-secondary-bg)] px-3 py-1.5 text-xs font-semibold text-[color:var(--text-on-dark-muted)] transition-all duration-[var(--motion-fast)] hover:border-[color:var(--border-default)] hover:text-[color:var(--text-on-dark)]"
                >
                  {timelineOpen ? "Ocultar" : "Mostrar"}
                </button>
              </div>
            )}
          >
            {timelineOpen && (
              <div className="relative mt-2 space-y-1 pl-6">
                <div className="pointer-events-none absolute bottom-2 left-[7px] top-2 w-px bg-[color:var(--border-shell)]" aria-hidden />
                {timelineTasks.map((task) => {
                  const taskId = String(task.tarea_id ?? task.id ?? "");
                  const isExpanded = timelineExpandedId === taskId;
                  const completed = isCompletedTask(task);
                  const pending = !completed;
                  const date = getActivityDate(task);
                  const dateStr = date > 0
                    ? new Date(date).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })
                    : "Sin fecha";
                  const targetLabel = getTaskTargetLabel(task);
                  const entries = timelineEntriesMap[taskId];
                  const isLoading = timelineLoadingMap[taskId] ?? false;
                  const noAsignacion = (task.tarea_asignacion?.length ?? 0) === 0;
                  const estado = normalizeTaskStatus(task.estado ?? "pendiente");

                  return (
                    <div key={taskId} className="relative">
                      <div
                        className={[
                          "absolute -left-6 top-[14px] h-3.5 w-3.5 rounded-full border-2",
                          completed
                            ? "border-[color:var(--feedback-success)] bg-[color:var(--feedback-success)]"
                            : estado === "en_progreso"
                              ? "border-[color:var(--accent-primary)] bg-[color:var(--accent-primary)]"
                              : "border-[color:var(--feedback-warning)] bg-[color:var(--feedback-warning-bg)]",
                        ].join(" ")}
                        aria-hidden
                      />
                      <button
                        type="button"
                        onClick={() => openTimelineTask(taskId, task)}
                        className={[
                          "w-full rounded-[var(--radius-md)] border px-3 py-2.5 text-left transition-all duration-[var(--motion-fast)]",
                          isExpanded
                            ? "rounded-b-none border-b-0 border-[color:var(--border-default)] bg-[color:var(--surface-muted)]"
                            : "border-[color:var(--border-shell)] bg-transparent hover:border-[color:var(--border-default)] hover:bg-[color:var(--surface-muted)]",
                        ].join(" ")}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-[color:var(--text-ink)]">{task.titulo}</p>
                            {targetLabel ? (
                              <p className="mt-0.5 text-[11px] text-[color:var(--text-ink-muted)]">{targetLabel}</p>
                            ) : null}
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-1">
                            <span
                              className={[
                                "rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                                completed
                                  ? "border-[color:var(--feedback-success-border)] bg-[color:var(--feedback-success-bg)] text-[color:var(--feedback-success-text)]"
                                  : estado === "en_progreso"
                                    ? "border-[color:var(--border-default)] bg-[color:var(--surface-muted)] text-[color:var(--text-on-dark)]"
                                    : "border-[color:var(--feedback-warning-border)] bg-[color:var(--feedback-warning-bg)] text-[color:var(--feedback-warning-text)]",
                              ].join(" ")}
                            >
                              {completed ? "Completada" : estado === "en_progreso" ? "En progreso" : "Pendiente"}
                            </span>
                            <span className="text-[11px] text-[color:var(--text-ink-muted)]">{dateStr}</span>
                          </div>
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="rounded-b-[var(--radius-md)] border border-t-0 border-[color:var(--border-default)] bg-[color:var(--surface-muted)] px-3 pb-3 pt-2">
                          {isLoading ? (
                            <p className="text-[11px] text-[color:var(--text-ink-muted)]">Cargando registros…</p>
                          ) : noAsignacion ? (
                            <p className="text-[11px] text-[color:var(--text-ink-muted)]">Sin asignaciones — la tarea todavía no fue tomada.</p>
                          ) : entries === undefined ? (
                            <p className="text-[11px] text-[color:var(--text-ink-muted)]">Sin información disponible.</p>
                          ) : entries.length === 0 ? (
                            <div className="space-y-2">
                              <p className="text-[11px] text-[color:var(--text-ink-muted)]">Sin registros guardados aún.</p>
                              {pending && (
                                <Link
                                  to={Boolean(task.finca_id ?? task.finca?.finca_id) ? `/operacion/campo?tareaId=${taskId}` : "/operacion/recepcion"}
                                  className="text-[11px] font-semibold text-[color:var(--accent-primary)] hover:underline"
                                >
                                  Ir a Registro Operativo →
                                </Link>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <p className="text-[11px] font-semibold text-[color:var(--text-on-dark)]">
                                {entries.length} registro{entries.length !== 1 ? "s" : ""}
                              </p>
                              {entries.map((entry, i) => {
                                const entryContent = (() => {
                                  if (!entry.descripcion) return null;
                                  try {
                                    const json = JSON.parse(entry.descripcion) as unknown;
                                    if (json && typeof json === "object" && !Array.isArray(json)) {
                                      const kvPairs = Object.entries(json as Record<string, unknown>).filter(([, v]) => v !== null && v !== "");
                                      if (kvPairs.length === 0) return null;
                                      return (
                                        <div className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
                                          {kvPairs.map(([k, v]) => (
                                            <div key={k} className="contents">
                                              <span className="capitalize text-[color:var(--text-ink-muted)]">{k.replace(/_/g, " ")}</span>
                                              <span className="text-[color:var(--text-ink)]">{String(v)}</span>
                                            </div>
                                          ))}
                                        </div>
                                      );
                                    }
                                  } catch { /* not JSON */ }
                                  return <p className="mt-1 text-[color:var(--text-ink)]">{entry.descripcion}</p>;
                                })();
                                return (
                                  <div
                                    key={entry.entradaId ?? i}
                                    className="rounded-[var(--radius-sm)] border border-[color:var(--border-shell)] bg-[color:var(--surface-card)] px-2.5 py-2 text-[11px]"
                                  >
                                    <div className="flex items-center justify-between gap-2 text-[color:var(--text-ink-muted)]">
                                      <span>#{i + 1} · {new Date(entry.fecha).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                                      {entry.creadoPor?.nombre && <span>{entry.creadoPor.nombre}</span>}
                                    </div>
                                    {entryContent}
                                  </div>
                                );
                              })}
                              {pending && (
                                <Link
                                  to={Boolean(task.finca_id ?? task.finca?.finca_id) ? `/operacion/campo?tareaId=${taskId}` : "/operacion/recepcion"}
                                  className="mt-1 block text-[11px] font-semibold text-[color:var(--accent-primary)] hover:underline"
                                >
                                  Ir a Registro Operativo →
                                </Link>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </AppCard>
        ) : null}

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
        ) : canRenderManagerFlow ? (
          <AppCard
            as="section"
            tone="default"
            padding={showCreateForm ? "lg" : "md"}
            header={(
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-text">
                    {showCreateForm ? "Nueva orden de trabajo" : "Crear orden"}
                  </h2>
                  <p className="mt-1 text-xs text-text-secondary">
                    {showCreateForm
                      ? `Usuario actual: ${user?.nombre ?? user?.email ?? "Usuario"}`
                      : "Desplegá el formulario solo cuando necesites asignar un nuevo trabajo."}
                  </p>
                </div>
                <AppButton
                  type="button"
                  variant={showCreateForm ? "secondary" : "primary"}
                  size="sm"
                  onClick={() => setShowCreateForm((current) => !current)}
                >
                  {showCreateForm ? "Cerrar formulario" : "Crear orden de trabajo"}
                </AppButton>
              </div>
            )}
          >
            {showCreateForm ? (
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
                onSubmit={() => void onCreate()}
              />
            ) : null}
          </AppCard>
        ) : isManagerMode ? (
          <AppCard
            as="section"
            tone="default"
            padding="lg"
            header={<h2 className="text-lg font-semibold text-text">Sin permisos de encargado</h2>}
          >
            <p className="text-xs text-text-secondary">
              Para asignar tareas necesitás rol de encargado de finca o de bodega.
            </p>
          </AppCard>
        ) : (
         <></>
        )}

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
                    onClick={() => { setOrdersView("pending"); setExpandedTaskId(null); }}
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
                    onClick={() => { setOrdersView("completed"); setExpandedTaskId(null); }}
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
              ) : null}
            </div>
          )}
        >
          <div>
          {ordersView === "pending" ? loading ? (
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
            <div className="space-y-3">
              {tasks.map((task) => {
                const taskId = String(task.tarea_id ?? task.id ?? "");
                const isExpanded = expandedTaskId === taskId;
                const catalogTaskId = getMatchedCatalogTaskId(task.titulo, getEventoTipoForTask(task));
                const targetLabel = getTaskTargetLabel(task);
                return (
                  <AppCard
                    key={taskId}
                    as="article"
                    tone="soft"
                    padding="md"
                    header={(
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-[color:var(--text-ink)]">{task.titulo}</div>
                          <div className="mt-1 text-xs text-[color:var(--text-ink-muted)]">
                            Prioridad: {task.prioridad ?? "media"} · Estado: {task.estado ?? "pendiente"}
                          </div>
                          {task.descripcion && (
                            <div className="mt-1 text-xs text-[color:var(--text-ink)]/80">{task.descripcion}</div>
                          )}
                          {targetLabel ? (
                            <div className="mt-2 inline-flex rounded-full border border-[color:var(--border-shell)] bg-[color:var(--surface-muted)] px-3 py-1 text-[11px] font-semibold text-[color:var(--text-on-dark)]">
                              Destino: {targetLabel}
                            </div>
                          ) : null}
                          {task.fecha_fin && (
                            <div className="mt-1 text-xs text-[color:var(--text-ink-muted)]">Vence: {task.fecha_fin}</div>
                          )}
                        </div>
                        <AppButton
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => setExpandedTaskId(isExpanded ? null : taskId)}
                        >
                          {isExpanded ? "Cerrar" : "Abrir orden de trabajo"}
                        </AppButton>
                      </div>
                    )}
                  >
                    {isExpanded && (() => {
                      const isFincaTask = Boolean(task.finca_id ?? task.finca?.finca_id);
                      const eventoTipo = getEventoTipoForTask(task);
                      const catalogId = catalogTaskId ?? (eventoTipo ? getMatchedCatalogTaskId(task.titulo, eventoTipo) : null);
                      const registroRoute = isFincaTask
                        ? `/operacion/campo?tareaId=${getTaskId(task)}`
                        : catalogId && OPERACION_TASK_ROUTES[catalogId]
                          ? OPERACION_TASK_ROUTES[catalogId]
                          : "/operacion/recepcion";
                      const asignaciones = task.tarea_asignacion ?? [];
                      return (
                        <div className="rounded-[var(--radius-lg)] border border-[color:var(--border-shell)] bg-[color:var(--surface-muted)] p-4 shadow-[var(--shadow-inset-soft)] space-y-3">
                          {asignaciones.length > 0 ? (
                            <div className="space-y-1.5">
                              {asignaciones.map((a) => (
                                <div key={a.tarea_asignacion_id} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px]">
                                  <span className={[
                                    "rounded-full border px-2 py-0.5 font-semibold",
                                    a.estado === "completado"
                                      ? "border-[color:var(--feedback-success-border)] bg-[color:var(--feedback-success-bg)] text-[color:var(--feedback-success-text)]"
                                      : "border-[color:var(--border-shell)] bg-[color:var(--surface-muted)] text-[color:var(--text-on-dark-muted)]",
                                  ].join(" ")}>
                                    {a.estado ?? "pendiente"}
                                  </span>
                                  <span className="text-[color:var(--text-ink-muted)]">Asignada el {new Date(a.assigned_at).toLocaleDateString("es-AR")}</span>
                                  {a.completed_at && (
                                    <span className="text-[color:var(--feedback-success-text)]">
                                      Completada el {new Date(a.completed_at).toLocaleDateString("es-AR")}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[11px] text-[color:var(--text-ink-muted)]">Sin asignaciones todavía.</p>
                          )}
                          <Link to={registroRoute}>
                            <AppButton type="button" variant="secondary" size="sm">
                              Ir a Registro Operativo →
                            </AppButton>
                          </Link>
                        </div>
                      );
                    })()}

                    {canRenderManagerFlow && (
                      <div className="mt-3">
                        <AppButton
                          type="button"
                          variant="danger"
                          size="sm"
                          onClick={() => void onDeleteTask(task)}
                          disabled={deletingTaskId === taskId}
                          loading={deletingTaskId === taskId}
                        >
                          {deletingTaskId === taskId ? "Eliminando..." : "Eliminar tarea"}
                        </AppButton>
                      </div>
                    )}
                  </AppCard>
                );
              })}
            </div>
          ) : completedLoading ? (
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
            <div className="max-h-[32rem] space-y-3 overflow-y-auto pr-1">
              {completedTasks.map((task) => {
                const taskId = String(task.tarea_id ?? task.id ?? "");
                const completedAt = getTaskCompletedDate(task);
                const assigneeCount = task.tarea_asignacion?.length ?? 0;
                return (
                  <AppCard
                    key={taskId}
                    as="article"
                    tone="soft"
                    padding="md"
                    className="border-[color:var(--feedback-success-border)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[color:var(--text-ink)]">
                          {task.titulo}
                        </p>
                        <p className="mt-1 text-xs text-[color:var(--text-ink-muted)]">
                          Cerrada: {formatTaskDate(completedAt)}
                        </p>
                        {task.descripcion ? (
                          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-[color:var(--text-ink)]/75">
                            {task.descripcion}
                          </p>
                        ) : null}
                      </div>
                      <span className="shrink-0 rounded-full border border-[color:var(--feedback-success-border)] bg-[color:var(--feedback-success-bg)] px-3 py-1 text-[11px] font-semibold text-[color:var(--feedback-success-text)]">
                        Completada
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-[color:var(--text-ink-muted)]">
                      <span>Prioridad: {task.prioridad ?? "media"}</span>
                      <span>Asignaciones: {assigneeCount}</span>
                    </div>
                  </AppCard>
                );
              })}
            </div>
          )}
          </div>
        </AppCard>

      </div>
      {confirmDialog}
    </div>
  );
};

export default Tareas;
