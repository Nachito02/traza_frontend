import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  AppCard,
  MetricCard,
  NoticeBanner,
  OperationalReadinessCard,
  type OperationalReadinessStep,
  SectionIntro,
} from "../../components/ui";
import { useFincasStore } from "../../features/fincas/store";
import { resolveModuleAccess } from "../../lib/permissions";
import { useAuthStore } from "../../store/authStore";
import { useOperacionStore } from "../../store/operacionStore";
import { useDashboardData } from "./useDashboardData";

const Dashboard = () => {
  const activeBodegaId = useAuthStore((state) => state.activeBodegaId);
  const bodegas = useAuthStore((state) => state.bodegas);
  const user = useAuthStore((state) => state.user);
  const fincas = useFincasStore((state) => state.fincas);
  const fincasLoading = useFincasStore((state) => state.loading);
  const loadFincas = useFincasStore((state) => state.loadFincas);
  const activeProtocoloId = useOperacionStore((state) => state.activeProtocoloId);

  const activeBodega = bodegas.find((bodega) => bodega.bodega_id === String(activeBodegaId));
  const access = resolveModuleAccess(user, activeBodegaId);
  const dailyOrdersPath = access.canAccessOperacion ? "/ordenes" : "/tareas";

  useEffect(() => {
    if (!activeBodegaId) return;
    void loadFincas(activeBodegaId);
  }, [activeBodegaId, loadFincas]);

  const { cuartelesCount, vasijasCount, tareasCount, trazabilidades, campanias, loading, error } =
    useDashboardData(activeBodegaId, fincas);

  const stats = useMemo(() => {
    const enCurso = trazabilidades.filter((item) => item.estado === "en_curso").length;
    const finalizadas = trazabilidades.filter((item) =>
      ["finalizada", "certificada"].includes(item.estado),
    ).length;
    const borrador = trazabilidades.filter((item) => item.estado === "draft").length;
    const campaniasAbiertas = campanias.filter((item) => item.estado === "abierta").length;

    return {
      enCurso,
      finalizadas,
      borrador,
      campaniasAbiertas,
    };
  }, [campanias, trazabilidades]);

  const readinessSteps = useMemo<OperationalReadinessStep[]>(() => {
    const hasBodega = Boolean(activeBodegaId);
    const hasCampania = stats.campaniasAbiertas > 0;
    const hasFincas = fincas.length > 0;
    const hasCuarteles = cuartelesCount > 0;
    const hasProtocol = Boolean(activeProtocoloId);
    const hasVasijas = vasijasCount > 0;

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
        done: hasCampania,
        disabled: !hasBodega,
      },
      {
        key: "finca",
        title: "Primera finca",
        description: "Cargá la unidad productiva donde se origina la uva.",
        actionLabel: "Crear finca",
        to: "/setup/finca",
        done: hasFincas,
        disabled: !hasBodega,
      },
      {
        key: "cuarteles",
        title: "Cuarteles",
        description: "Dividí la finca en cuarteles para asignar órdenes y registrar cosechas.",
        actionLabel: "Crear cuarteles",
        to: "/setup/cuarteles",
        done: hasCuarteles,
        disabled: !hasFincas,
      },
      {
        key: "protocolo",
        title: "Protocolo operativo",
        description: "Seleccioná el protocolo base que define las tareas y registros disponibles.",
        actionLabel: "Seleccionar protocolo",
        to: "/setup/protocolos",
        done: hasProtocol,
        disabled: !hasBodega,
      },
      {
        key: "vasijas",
        title: "Vasijas de bodega",
        description: "Cargá al menos una vasija para registrar recepción, elaboración y movimientos.",
        actionLabel: "Crear vasija",
        to: "/bodega/vasijas/nueva",
        done: hasVasijas,
        disabled: !hasBodega,
      },
    ];
  }, [activeBodegaId, activeProtocoloId, cuartelesCount, fincas.length, stats.campaniasAbiertas, vasijasCount]);

  const showReadinessCard = activeBodegaId && readinessSteps.some((step) => !step.done);

  const metricLinkClass =
    "rounded-[var(--radius-lg)] border border-[color:var(--border-shell)] bg-[color:var(--surface-muted)] p-4 text-[color:var(--text-on-dark)] transition-all duration-[var(--motion-fast)] ease-[var(--motion-standard)] hover:border-[color:var(--border-default)] hover:bg-[color:var(--surface-soft)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)]";
  return (
    <div className="min-h-screen bg-secondary px-6 py-10">
      <div className="mx-auto w-full max-w-6xl">
        {/*
        <AppCard as="section" padding="lg" className="mb-8 bg-[color:var(--surface-hero)] text-[color:var(--text-on-dark)]">
          <SectionIntro
            title={<span className="text-3xl font-bold text-[color:var(--text-on-dark)]">Panel de administracion</span>}
            description="Vista general de la bodega activa, sus recursos y el estado de los procesos."
            className="[&>div>p]:text-[color:var(--text-on-dark-muted)]"
            actions={(
              <>
                <AppButton type="button" variant="secondary" onClick={() => navigate("/ordenes")}>
                  Ir a órdenes
                </AppButton>
                <AppButton type="button" variant="secondary" onClick={() => navigate("/operacion")}>
                  Ir a Registro operativo
                </AppButton>
                <AppButton type="button" variant="secondary" onClick={() => navigate("/progreso")}>
                  Ver progreso
                </AppButton>
              </>
            )}
          />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className={heroMetricClass}>
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--text-accent)]">
                Bodega activa
              </div>
              <div className="mt-1 text-lg font-semibold text-[color:var(--text-ink)]">
                {activeBodega?.nombre ?? "Sin seleccionar"}
              </div>
            </div>
            <div className={heroMetricClass}>
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--text-accent)]">
                Operación
              </div>
              <div className="mt-1 text-lg font-semibold text-[color:var(--text-ink)]">
                {access.canAccessOperacion ? "Disponible" : "Sin acceso"}
              </div>
            </div>
          </div>
        </AppCard>
        */}

        {!activeBodegaId ? (
          <NoticeBanner tone="danger" className="p-6">
            Seleccioná una bodega para ver datos de fincas, cuarteles y operación.
          </NoticeBanner>
        ) : (
          <div className="space-y-6">
            {showReadinessCard ? (
              <OperationalReadinessCard
                steps={readinessSteps}
                description="Tu bodega ya existe. Ahora completá la estructura mínima para que las órdenes y registros tengan contexto."
              />
            ) : null}

            <AppCard
              as="section"
              padding="md"
              header={(
                <SectionIntro
                  title="Recursos principales"
                  description="Accesos rápidos a la estructura base y al trabajo operativo diario."
                />
              )}
            >
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Link to="/contexto" className="block h-full">
                  <MetricCard
                    label="Bodega activa"
                    value={activeBodega?.nombre ?? "Sin seleccionar"}
                    className={metricLinkClass}
                    valueClassName="text-xl"
                  />
                </Link>
                <Link to="/fincas" className="block h-full">
                  <MetricCard label="Fincas" value={fincasLoading ? "…" : fincas.length} className={metricLinkClass} />
                </Link>
                <Link to="/fincas" className="block h-full">
                  <MetricCard label="Cuarteles" value={loading ? "…" : cuartelesCount} className={metricLinkClass} />
                </Link>
                <Link to="/progreso" className="block h-full">
                  <MetricCard label="Procesos" value={loading ? "…" : trazabilidades.length} className={metricLinkClass} />
                </Link>
              </div>
            </AppCard>

            <AppCard
              as="section"
              padding="md"
              header={(
                <SectionIntro
                  title="Seguimiento diario"
                  description="Indicadores rápidos para entrar a trabajar sobre pendientes y recursos de bodega."
                />
              )}
            >
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Link to="/bodega" className="block h-full">
                  <MetricCard label="Vasijas" value={loading ? "…" : vasijasCount} className={metricLinkClass} />
                </Link>
                <Link to={dailyOrdersPath} className="block h-full">
                  <MetricCard label="Órdenes pendientes" value={loading ? "…" : tareasCount} className={metricLinkClass} />
                </Link>
                {access.canAccessOperacion ? (
                  <Link to="/operacion" className="block h-full">
                    <MetricCard label="Registro operativo" value="Disponible" className={metricLinkClass} />
                  </Link>
                ) : null}
              </div>
            </AppCard>

            <AppCard
              as="section"
              padding="md"
              header={(
                <SectionIntro
                  title="Estado de procesos"
                  description="Estado general de los procesos operativos y de las campañas abiertas."
                />
              )}
            >
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Link to="/progreso" className="block h-full">
                  <MetricCard label="En curso" value={stats.enCurso} className={metricLinkClass} />
                </Link>
                <Link to="/progreso" className="block h-full">
                  <MetricCard label="Finalizadas / Certificadas" value={stats.finalizadas} className={metricLinkClass} />
                </Link>
                <Link to="/progreso" className="block h-full">
                  <MetricCard label="Borrador" value={stats.borrador} className={metricLinkClass} />
                </Link>
                <Link to="/admin/campanias" className="block h-full">
                  <MetricCard label="Campañas abiertas" value={stats.campaniasAbiertas} className={metricLinkClass} />
                </Link>
              </div>
            </AppCard>

            {error && (
              <NoticeBanner tone="danger">
                {error}
              </NoticeBanner>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
