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

  const actionLinkClass =
    "cursor-pointer rounded-lg border border-[#C9A961]/40 bg-white px-4 py-2 text-sm font-semibold text-[#722F37] transition duration-150 hover:border-[#C9A961]/70 hover:bg-[#FFF9F0] hover:text-[#5D232A]";

  return (
    <div className="min-h-screen bg-secondary px-6 py-10">
      <div className="mx-auto w-full max-w-6xl">
        <section className="mb-8 rounded-2xl bg-primary p-6 shadow-lg">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-text">Resumen operativo</h1>
              <p className="mt-2 text-sm text-text-secondary">
                Vista general de la bodega activa, sus recursos y el estado de los procesos.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-[#C9A961]/30 bg-[#FFF9F0] px-4 py-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7A4A50]">
                    Bodega activa
                  </div>
                  <div className="mt-1 text-lg font-semibold text-[#3D1B1F]">
                    {activeBodega?.nombre ?? "Sin seleccionar"}
                  </div>
                </div>
                <div className="rounded-xl border border-[#C9A961]/30 bg-[#FFF9F0] px-4 py-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7A4A50]">
                    Operación
                  </div>
                  <div className="mt-1 text-lg font-semibold text-[#3D1B1F]">
                    {access.canAccessOperacion ? "Disponible" : "Sin acceso"}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => navigate("/trazabilidades/nueva")}
                className={actionLinkClass}
              >
                Nuevo proceso
              </button>
              <button
                type="button"
                onClick={() => navigate("/trazabilidades")}
                className={actionLinkClass}
              >
                Ver procesos y etapas
              </button>
              <button
                type="button"
                onClick={() => navigate("/operacion")}
                className={actionLinkClass}
              >
                Ir a Operación
              </button>
            </div>
          </div>
        </section>

        {!activeBodegaId ? (
          <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-6 text-sm text-red-200">
            Seleccioná una bodega para ver datos de fincas, cuarteles y trazabilidades.
          </div>
        ) : (
          <div className="space-y-6">
            <section className="rounded-2xl bg-primary p-5 shadow-lg">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-text">Recursos principales</h2>
                <p className="text-xs text-text-secondary">
                  Accesos rápidos a la estructura base y a la trazabilidad activa.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Link to="/contexto" className="rounded-xl border border-[#C9A961]/30 bg-[#FFF9F0] p-4 transition hover:bg-white">
                  <p className="text-xs uppercase tracking-[0.12em] text-[#7A4A50]">
                    Bodega activa
                  </p>
                  <p className="mt-3 text-xl font-bold text-[#3D1B1F]">
                    {activeBodega?.nombre ?? "Sin seleccionar"}
                  </p>
                </Link>
                <Link to="/fincas" className="rounded-xl border border-[#C9A961]/30 bg-[#FFF9F0] p-4 transition hover:bg-white">
                  <p className="text-xs uppercase tracking-[0.12em] text-[#7A4A50]">
                    Fincas
                  </p>
                  <p className="mt-3 text-3xl font-bold text-[#3D1B1F]">
                    {fincasLoading ? "…" : fincas.length}
                  </p>
                </Link>
                <Link to="/fincas" className="rounded-xl border border-[#C9A961]/30 bg-[#FFF9F0] p-4 transition hover:bg-white">
                  <p className="text-xs uppercase tracking-[0.12em] text-[#7A4A50]">
                    Cuarteles
                  </p>
                  <p className="mt-3 text-3xl font-bold text-[#3D1B1F]">
                    {loading ? "…" : cuartelesCount}
                  </p>
                </Link>
                <Link to="/trazabilidades" className="rounded-xl border border-[#C9A961]/30 bg-[#FFF9F0] p-4 transition hover:bg-white">
                  <p className="text-xs uppercase tracking-[0.12em] text-[#7A4A50]">
                    Trazabilidades
                  </p>
                  <p className="mt-3 text-3xl font-bold text-[#3D1B1F]">
                    {loading ? "…" : trazabilidades.length}
                  </p>
                </Link>
              </div>
            </section>

            <section className="rounded-2xl bg-primary p-5 shadow-lg">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-text">Seguimiento diario</h2>
                <p className="text-xs text-text-secondary">
                  Indicadores rápidos para entrar a trabajar sobre pendientes y recursos de bodega.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Link to="/bodega" className="rounded-xl border border-[#C9A961]/30 bg-[#FFF9F0] p-4 transition hover:bg-white">
                  <p className="text-xs uppercase tracking-[0.12em] text-[#7A4A50]">Vasijas</p>
                  <p className="mt-2 text-2xl font-semibold text-[#3D1B1F]">{loading ? "…" : vasijasCount}</p>
                </Link>
                <Link to="/tareas" className="rounded-xl border border-[#C9A961]/30 bg-[#FFF9F0] p-4 transition hover:bg-white">
                  <p className="text-xs uppercase tracking-[0.12em] text-[#7A4A50]">Mis tareas pendientes</p>
                  <p className="mt-2 text-2xl font-semibold text-[#3D1B1F]">{loading ? "…" : tareasCount}</p>
                </Link>
                {access.canAccessOperacion ? (
                  <Link to="/operacion" className="rounded-xl border border-[#C9A961]/30 bg-[#FFF9F0] p-4 transition hover:bg-white">
                    <p className="text-xs uppercase tracking-[0.12em] text-[#7A4A50]">Operación</p>
                    <p className="mt-2 text-2xl font-semibold text-[#3D1B1F]">Disponible</p>
                  </Link>
                ) : null}
              </div>
            </section>

            <section className="rounded-2xl bg-primary p-5 shadow-lg">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-text">Estado de procesos</h2>
                <p className="text-xs text-text-secondary">
                  Estado general de las trazabilidades y de las campañas abiertas.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Link to="/trazabilidades" className="rounded-xl border border-[#C9A961]/30 bg-[#FFF9F0] p-4 transition hover:bg-white ">
                  <p className="text-xs uppercase tracking-[0.12em] text-[#7A4A50]">En curso</p>
                  <p className="mt-2 text-2xl font-semibold text-[#3D1B1F]">{stats.enCurso}</p>
                </Link>
                <Link to="/trazabilidades" className="rounded-xl border border-[#C9A961]/30 bg-[#FFF9F0] p-4 transition hover:bg-white ">
                  <p className="text-xs uppercase tracking-[0.12em] text-[#7A4A50]">Finalizadas / Certificadas</p>
                  <p className="mt-2 text-2xl font-semibold text-[#3D1B1F]">{stats.finalizadas}</p>
                </Link>
                <Link to="/trazabilidades" className="rounded-xl border border-[#C9A961]/30 bg-[#FFF9F0] p-4 transition hover:bg-white ">
                  <p className="text-xs uppercase tracking-[0.12em] text-[#7A4A50]">Borrador</p>
                  <p className="mt-2 text-2xl font-semibold text-[#3D1B1F]">{stats.borrador}</p>
                </Link>
                <Link to="/admin/campanias" className="rounded-xl border border-[#C9A961]/30 bg-[#FFF9F0] p-4 transition hover:bg-white ">
                  <p className="text-xs uppercase tracking-[0.12em] text-[#7A4A50]">Campañas abiertas</p>
                  <p className="mt-2 text-2xl font-semibold text-[#3D1B1F]">{stats.campaniasAbiertas}</p>
                </Link>
              </div>
            </section>

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
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
