import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ClipboardPenLine,
  ListTodo,
  Map,
  TrendingUp,
  Warehouse,
} from "lucide-react";
import {
  AppCard,
  GuidedState,
  NoticeBanner,
  OperationalReadinessCard,
  SectionIntro,
  type OperationalReadinessStep,
} from "../../components/ui";
import type { Tarea } from "../../features/encargos/api";
import { useFincasStore } from "../../features/fincas/store";
import { resolveModuleAccess } from "../../lib/permissions";
import { useAuthStore } from "../../store/authStore";
import OrderRow from "../Tareas/components/OrderRow";
import TaskDetailModal from "../Tareas/components/TaskDetailModal";
import { isCompletedTask } from "../Tareas/tareas.helpers";
import { useDashboardData } from "./useDashboardData";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

type ActionTileProps = {
  to: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: React.ReactNode;
  accent?: boolean;
};

function ActionTile({ to, icon, title, description, badge, accent = false }: ActionTileProps) {
  return (
    <Link
      to={to}
      className={[
        "group relative overflow-hidden rounded-[var(--radius-xl)] border p-6 transition-all duration-[var(--motion-base)] ease-[var(--motion-standard)]",
        "hover:-translate-y-0.5 hover:shadow-[var(--shadow-raised)]",
        accent
          ? "border-[color:var(--border-default)] bg-[color:var(--surface-base)]"
          : "border-[color:var(--border-shell)] bg-[color:var(--surface-base)] hover:border-[color:var(--border-default)]",
      ].join(" ")}
    >
      {/* Top accent line */}
      {accent ? (
        <div className="absolute inset-x-0 top-0 h-[2px] bg-[color:var(--accent-primary)]" />
      ) : null}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div
          className={[
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-lg)] border",
            accent
              ? "border-[color:var(--border-default)] bg-[color:var(--surface-accent-soft)] text-[color:var(--accent-primary)]"
              : "border-[color:var(--border-shell)] bg-[color:var(--surface-soft)] text-[color:var(--text-ink-muted)]",
          ].join(" ")}
        >
          {icon}
        </div>
        {badge !== undefined && badge !== null ? (
          <div
            className={[
              "rounded-full px-3 py-1 text-sm font-bold",
              accent
                ? "bg-[color:var(--surface-accent-soft)] text-[color:var(--accent-primary)]"
                : "bg-[color:var(--surface-muted)] text-[color:var(--text-ink)]",
            ].join(" ")}
          >
            {badge}
          </div>
        ) : null}
      </div>

      {/* Body */}
      <div className="mt-5">
        <h2 className="text-lg font-semibold text-[color:var(--text-ink)]">{title}</h2>
        <p className="mt-1 text-sm leading-relaxed text-[color:var(--text-ink-muted)]">{description}</p>
      </div>

      {/* CTA */}
      <div
        className={[
          "mt-5 flex items-center gap-1.5 text-xs font-semibold transition-colors",
          accent
            ? "text-[color:var(--accent-primary)]"
            : "text-[color:var(--text-ink-muted)] group-hover:text-[color:var(--text-ink)]",
        ].join(" ")}
      >
        Abrir
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
      </div>
    </Link>
  );
}

type ContextTileProps = {
  to: string;
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
};

function ContextTile({ to, icon, label, value }: ContextTileProps) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-3 rounded-[var(--radius-lg)] border border-[color:var(--border-shell)] bg-[color:var(--surface-soft)] px-4 py-3 transition-all duration-[var(--motion-fast)] hover:border-[color:var(--border-default)] hover:bg-[color:var(--surface-base)]"
    >
      <span className="shrink-0 text-[color:var(--text-ink-muted)] group-hover:text-[color:var(--accent-primary)]">
        {icon}
      </span>
      <div className="min-w-0">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--text-ink-muted)]">
          {label}
        </div>
        <div className="mt-0.5 truncate text-sm font-semibold text-[color:var(--text-ink)]">
          {value}
        </div>
      </div>
    </Link>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

const Dashboard = () => {
  const activeBodegaId = useAuthStore((state) => state.activeBodegaId);
  const bodegas = useAuthStore((state) => state.bodegas);
  const user = useAuthStore((state) => state.user);
  const fincas = useFincasStore((state) => state.fincas);
  const fincasLoading = useFincasStore((state) => state.loading);
  const loadFincas = useFincasStore((state) => state.loadFincas);

  const activeBodega = bodegas.find((b) => b.bodega_id === String(activeBodegaId));
  const access = resolveModuleAccess(user, activeBodegaId);
  const dailyOrdersPath = access.canAccessOperacion ? "/ordenes" : "/tareas";

  const nombreUsuario = useMemo(() => {
    const nombre = (user as { nombre?: string } | null)?.nombre;
    if (nombre) return nombre;
    const email = (user as { email?: string } | null)?.email ?? "";
    return email.split("@")[0] ?? "operario";
  }, [user]);

  useEffect(() => {
    if (!activeBodegaId) return;
    void loadFincas(activeBodegaId);
  }, [activeBodegaId, loadFincas]);

  const isManager = access.isAdminSistema || (access.canAccessBodega && !access.isFincaOnly);
  const [dashboardRefreshKey, setDashboardRefreshKey] = useState(0);

  const { cuartelesCount, vasijasCount, tareasCount, tasks, trazabilidades, campanias, loading, error } =
    useDashboardData(activeBodegaId, fincas, isManager, dashboardRefreshKey);

  const [selectedTask, setSelectedTask] = useState<Tarea | null>(null);

  const stats = useMemo(() => {
    const enCurso = trazabilidades.filter((t) => t.estado === "en_curso").length;
    const campaniasAbiertas = campanias.filter((c) => c.estado === "abierta").length;
    return { enCurso, campaniasAbiertas };
  }, [campanias, trazabilidades]);

  const readinessSteps = useMemo<OperationalReadinessStep[]>(() => {
    const hasBodega = Boolean(activeBodegaId);
    return [
      {
        key: "bodega",
        title: "Bodega activa",
        description: "Confirmá el contexto de trabajo antes de cargar estructura u operación.",
        actionLabel: "Elegir bodega",
        to: "/contexto",
        done: hasBodega,
      },
      {
        key: "campania",
        title: "Campaña activa",
        description: "La campaña ordena los registros por temporada y evita mezclar datos operativos.",
        actionLabel: "Configurar campaña",
        to: "/setup/campania",
        done: stats.campaniasAbiertas > 0,
        disabled: !hasBodega,
      },
      {
        key: "finca",
        title: "Primera finca",
        description: "Cargá la unidad productiva donde se origina la uva.",
        actionLabel: "Crear finca",
        to: "/setup/finca",
        done: fincas.length > 0,
        disabled: !hasBodega,
      },
      {
        key: "cuarteles",
        title: "Cuarteles",
        description: "Dividí la finca en cuarteles para asignar órdenes y registrar cosechas.",
        actionLabel: "Crear cuarteles",
        to: "/setup/cuarteles",
        done: cuartelesCount > 0,
        disabled: fincas.length === 0,
      },
      {
        key: "vasijas",
        title: "Vasijas de bodega",
        description: "Cargá al menos una vasija para registrar recepción, elaboración y movimientos.",
        actionLabel: "Crear vasija",
        to: "/bodega/vasijas/nueva",
        done: vasijasCount > 0,
        disabled: !hasBodega,
      },
    ];
  }, [activeBodegaId, cuartelesCount, fincas.length, stats.campaniasAbiertas, vasijasCount]);

  const canSeeSetup = access.isAdminSistema || access.canAccessBodega;
  const showReadinessCard = canSeeSetup && activeBodegaId && readinessSteps.some((s) => !s.done);

  return (
    <div className="min-h-screen bg-secondary px-6 py-10">
      <div className="mx-auto w-full max-w-6xl space-y-8">

        {/* ── Saludo ──────────────────────────────────────────────── */}
        <div>
          <p className="text-sm text-[color:var(--text-ink-muted)]">{getGreeting()},</p>
          <h1 className="text-3xl font-bold text-[color:var(--text-ink)] capitalize">
            {nombreUsuario}
          </h1>
          {activeBodega ? (
            <p className="mt-1.5 text-xs text-[color:var(--text-ink-muted)]">
              Bodega activa:{" "}
              <Link to="/contexto" className="font-semibold text-[color:var(--accent-primary)] hover:underline">
                {activeBodega.nombre}
              </Link>
            </p>
          ) : null}
        </div>

        {/* ── Sin bodega ───────────────────────────────────────────── */}
        {!activeBodegaId ? (
          <GuidedState
            title="Seleccioná una bodega para empezar"
            description="El dashboard y las funciones operativas dependen de tener una bodega activa. Elegí el contexto para continuar."
            action={(
              <Link to="/contexto">
                <button
                  type="button"
                  className="inline-flex cursor-pointer items-center gap-2 rounded-[var(--radius-md)] border border-[color:var(--border-default)] bg-[color:var(--action-primary-bg)] px-4 py-2 text-sm font-semibold text-[color:var(--action-primary-text)] transition-all hover:bg-[color:var(--action-primary-hover)]"
                >
                  Elegir bodega
                </button>
              </Link>
            )}
          />
        ) : (
          <div className="space-y-6">

            {/* ── Setup checklist (solo si hay pasos incompletos) ─── */}
            {showReadinessCard ? (
              <OperationalReadinessCard
                steps={readinessSteps}
                description="Completá la estructura mínima para que las órdenes y registros tengan contexto."
              />
            ) : null}

            {/* ── Tiles de acción principales ─────────────────────── */}
            <div className={[
              "grid gap-4",
              access.canAccessOperacion ? "md:grid-cols-3" : "md:grid-cols-1 max-w-lg",
            ].join(" ")}>
              {access.canAccessOperacion ? (
                <ActionTile
                  to="/operacion/registro"
                  icon={<ClipboardPenLine className="h-5 w-5" />}
                  title="Registrar actividad"
                  description="Cargá una labor o tarea de campo con su personal, insumos y costos en un solo paso."
                  accent
                />
              ) : null}
              <ActionTile
                to={dailyOrdersPath}
                icon={<ListTodo className="h-5 w-5" />}
                title="Órdenes de trabajo"
                description="Creá, asigná y completá órdenes operativas. Centro diario de trabajo del equipo."
                badge={loading ? "…" : tareasCount > 0 ? `${tareasCount} pendiente${tareasCount !== 1 ? "s" : ""}` : "Al día"}
                accent={!access.canAccessOperacion}
              />
              {access.canAccessOperacion ? (
                <ActionTile
                  to="/operacion"
                  icon={<Warehouse className="h-5 w-5" />}
                  title="Registro operativo"
                  description="Ingresá recepción de uva, operaciones de vasija, cortes y fraccionamiento."
                />
              ) : null}
            </div>

            {/* ── Tareas ───────────────────────────────────────────── */}
            {activeBodegaId && !loading && tasks.length > 0 && (
              <AppCard
                as="section"
                tone="default"
                padding="lg"
                header={
                  <SectionIntro
                    title={isManager ? "Tareas del equipo" : "Mis tareas"}
                    description={
                      isManager
                        ? `${tareasCount} tarea${tareasCount !== 1 ? "s" : ""} en curso en la bodega activa`
                        : `Tenés ${tareasCount} tarea${tareasCount !== 1 ? "s" : ""} pendiente${tareasCount !== 1 ? "s" : ""} asignada${tareasCount !== 1 ? "s" : ""}`
                    }
                    actions={
                      <Link
                        to={dailyOrdersPath}
                        className="text-sm font-medium text-[color:var(--accent-primary)] hover:underline"
                      >
                        Ver todas →
                      </Link>
                    }
                  />
                }
              >
                <div className="relative mt-2 space-y-1 pl-6">
                  <div className="pointer-events-none absolute bottom-2 left-[7px] top-2 w-px bg-[color:var(--border-shell)]" aria-hidden />
                  {tasks.slice(0, 8).map((task) => (
                    <OrderRow
                      key={String(task.tarea_id ?? task.id ?? "")}
                      task={task}
                      variant={isCompletedTask(task) ? "completed" : "pending"}
                      onOpenDetail={() => setSelectedTask(task)}
                    />
                  ))}
                  {tasks.length > 8 && (
                    <Link
                      to={dailyOrdersPath}
                      className="block pt-1 text-center text-sm text-[color:var(--text-ink-muted)] hover:text-[color:var(--accent-primary)]"
                    >
                      + {tasks.length - 8} más — ver todas
                    </Link>
                  )}
                </div>
              </AppCard>
            )}

            {selectedTask && (
              <TaskDetailModal
                task={selectedTask}
                onClose={() => setSelectedTask(null)}
                onCompleted={() => setDashboardRefreshKey((k) => k + 1)}
              />
            )}

            {/* ── Contexto rápido ──────────────────────────────────── */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <ContextTile
                to="/fincas"
                icon={<Map className="h-4 w-4" />}
                label="Fincas"
                value={fincasLoading ? "…" : `${fincas.length} registrada${fincas.length !== 1 ? "s" : ""}`}
              />
              <ContextTile
                to="/bodega"
                icon={<Warehouse className="h-4 w-4" />}
                label="Vasijas"
                value={loading ? "…" : `${vasijasCount} en bodega`}
              />
              <ContextTile
                to="/admin/campanias"
                icon={<ListTodo className="h-4 w-4" />}
                label="Campaña"
                value={
                  loading
                    ? "…"
                    : stats.campaniasAbiertas > 0
                      ? `${stats.campaniasAbiertas} abierta${stats.campaniasAbiertas !== 1 ? "s" : ""}`
                      : "Sin campaña activa"
                }
              />
              {access.canAccessBodega ? (
                <ContextTile
                  to="/progreso"
                  icon={<TrendingUp className="h-4 w-4" />}
                  label="Procesos en curso"
                  value={loading ? "…" : `${stats.enCurso} activo${stats.enCurso !== 1 ? "s" : ""}`}
                />
              ) : null}
            </div>

            {error ? (
              <NoticeBanner tone="danger">{error}</NoticeBanner>
            ) : null}
          </div>
        )}

      </div>
    </div>
  );
};

export default Dashboard;
