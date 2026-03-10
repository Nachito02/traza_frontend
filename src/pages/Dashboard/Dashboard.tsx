import { useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useFincasStore } from "../../features/fincas/store";
import { resolveModuleAccess } from "../../lib/permissions";
import { useAuthStore } from "../../store/authStore";
import { useDashboardData } from "./useDashboardData";

const Dashboard = () => {
  const activeBodegaId = useAuthStore((state) => state.activeBodegaId);
  const bodegas = useAuthStore((state) => state.bodegas);
  const user = useAuthStore((state) => state.user);
  const fincas = useFincasStore((state) => state.fincas);
  const fincasLoading = useFincasStore((state) => state.loading);
  const loadFincas = useFincasStore((state) => state.loadFincas);

  const navigate = useNavigate();
  const activeBodega = bodegas.find((bodega) => bodega.bodega_id === String(activeBodegaId));
  const access = resolveModuleAccess(user, activeBodegaId);

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

  return (
    <div className="min-h-screen bg-secondary px-6 py-10">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold text-text">Resumen operativo</h1>
              <p className="mt-2 text-sm text-text-secondary ">
                Datos del usuario autenticado y su bodega activa.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/trazabilidades")}
              className="rounded-lg border border-gold/40 bg-cream px-4 py-2 text-sm font-semibold text-wine transition hover:border-gold hover:bg-[#F8F3EE]"
            >
              Ver procesos y etapas
            </button>
          </div>
        </div>

        {!activeBodegaId ? (
          <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-6 text-sm text-red-200">
            Seleccioná una bodega para ver datos de fincas, cuarteles y trazabilidades.
          </div>
        ) : (
          <div className="space-y-6">
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Link to="/contexto" className="rounded-2xl border border-white/10 bg-primary p-4 transition hover:bg-secondary">
                <p className="text-xs uppercase tracking-[0.12em] text-text">
                  Bodega activa
                </p>
                <p className="mt-3 text-xl font-bold text-text">
                  {activeBodega?.nombre ?? "Sin seleccionar"}
                </p>
              </Link>
              <Link to="/fincas" className="rounded-2xl border border-white/10 bg-primary p-4 transition hover:bg-secondary">
                <p className="text-xs uppercase tracking-[0.12em] text-text">
                  Fincas
                </p>
                <p className="mt-3 text-3xl font-bold text-text">
                  {fincasLoading ? "…" : fincas.length}
                </p>
              </Link>
              <Link to="/fincas" className="rounded-2xl border border-white/10 bg-primary p-4 transition hover:bg-secondary">
                <p className="text-xs uppercase tracking-[0.12em] text-text">
                  Cuarteles
                </p>
                <p className="mt-3 text-3xl font-bold text-text">
                  {loading ? "…" : cuartelesCount}
                </p>
              </Link>
              <Link to="/trazabilidades" className="rounded-2xl border border-white/10 bg-primary p-4 transition hover:bg-secondary">
                <p className="text-xs uppercase tracking-[0.12em] text-text">
                  Trazabilidades
                </p>
                <p className="mt-3 text-3xl font-bold text-text">
                  {loading ? "…" : trazabilidades.length}
                </p>
              </Link>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Link to="/bodega" className="rounded-2xl border border-white/10 bg-primary p-4 transition hover:bg-secondary">
                <p className="text-xs uppercase tracking-[0.12em] text-text">Vasijas</p>
                <p className="mt-2 text-2xl font-semibold text-text">{loading ? "…" : vasijasCount}</p>
              </Link>
              <Link to="/tareas" className="rounded-2xl border border-white/10 bg-primary p-4 transition hover:bg-secondary">
                <p className="text-xs uppercase tracking-[0.12em] text-text">Mis tareas pendientes</p>
                <p className="mt-2 text-2xl font-semibold text-text">{loading ? "…" : tareasCount}</p>
              </Link>
              {access.canAccessOperacion ? (
                <Link to="/operacion" className="rounded-2xl border border-white/10 bg-primary p-4 transition hover:bg-secondary">
                  <p className="text-xs uppercase tracking-[0.12em] text-text">Operación</p>
                  <p className="mt-2 text-2xl font-semibold text-text">Disponible</p>
                </Link>
              ) : null}
            </section>

            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Link to="/trazabilidades" className="rounded-2xl border border-white/10 bg-primary p-4 transition hover:bg-secondary ">
                <p className="text-xs uppercase tracking-[0.12em] text-text">En curso</p>
                <p className="mt-2 text-2xl font-semibold text-text">{stats.enCurso}</p>
              </Link>
              <Link to="/trazabilidades" className="rounded-2xl border border-white/10 bg-primary p-4 transition hover:bg-secondary ">
                <p className="text-xs uppercase tracking-[0.12em] text-text">Finalizadas / Certificadas</p>
                <p className="mt-2 text-2xl font-semibold text-text">{stats.finalizadas}</p>
              </Link>
              <Link to="/trazabilidades" className="rounded-2xl border border-white/10 bg-primary p-4 transition hover:bg-secondary ">
                <p className="text-xs uppercase tracking-[0.12em] text-text">Borrador</p>
                <p className="mt-2 text-2xl font-semibold text-text">{stats.borrador}</p>
              </Link>
              <Link to="/admin/campanias" className="rounded-2xl border border-white/10 bg-primary p-4 transition hover:bg-secondary ">
                <p className="text-xs uppercase tracking-[0.12em] text-text">Campañas abiertas</p>
                <p className="mt-2 text-2xl font-semibold text-text">{stats.campaniasAbiertas}</p>
              </Link>
            </section>

            {error && (
              <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">
                {error}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
