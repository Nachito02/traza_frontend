import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchCampanias, type Campania } from "../../features/campanias/api";
import { fetchCuartelesByFinca } from "../../features/cuarteles/api";
import { useFincasStore } from "../../features/fincas/store";
import {
  fetchTrazabilidades,
  type Trazabilidad,
} from "../../features/trazabilidades/api";
import { useAuthStore } from "../../store/authStore";

const Dashboard = () => {
  const activeBodegaId = useAuthStore((state) => state.activeBodegaId);
  const bodegas = useAuthStore((state) => state.bodegas);
  const fincas = useFincasStore((state) => state.fincas);
  const fincasLoading = useFincasStore((state) => state.loading);
  const loadFincas = useFincasStore((state) => state.loadFincas);

  const [cuartelesCount, setCuartelesCount] = useState(0);
  const [trazabilidades, setTrazabilidades] = useState<Trazabilidad[]>([]);
  const [campanias, setCampanias] = useState<Campania[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeBodegaId) return;
    void loadFincas(activeBodegaId);
  }, [activeBodegaId, loadFincas]);

  useEffect(() => {
    if (!activeBodegaId) {
      setCuartelesCount(0);
      setTrazabilidades([]);
      setCampanias([]);
      return;
    }

    let mounted = true;
    setLoading(true);
    setError(null);

    Promise.all([
      fetchTrazabilidades(activeBodegaId),
      fetchCampanias(),
      Promise.all(
        fincas
          .map((finca) => finca.finca_id ?? finca.id)
          .filter(Boolean)
          .map((fincaId) => fetchCuartelesByFinca(String(fincaId))),
      ),
    ])
      .then(([trazabilidadesData, campaniasData, cuartelesLists]) => {
        if (!mounted) return;
        setTrazabilidades(trazabilidadesData ?? []);
        setCampanias(campaniasData ?? []);
        const totalCuarteles = (cuartelesLists ?? []).reduce(
          (acc, list) => acc + (list?.length ?? 0),
          0,
        );
        setCuartelesCount(totalCuarteles);
      })
      .catch(() => {
        if (!mounted) return;
        setError("No se pudieron cargar todos los indicadores.");
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [activeBodegaId, fincas]);

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
          <h1 className="text-3xl font-bold text-text">Resumen operativo</h1>
          <p className="mt-2 text-sm text-text-secondary">
            Datos del usuario autenticado y su bodega activa.
          </p>
        </div>

        {!activeBodegaId ? (
          <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-6 text-sm text-red-200">
            Seleccioná una bodega para ver datos de fincas, cuarteles y productos.
          </div>
        ) : (
          <div className="space-y-6">
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <article className="rounded-2xl border border-white/10 bg-primary/30 p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-text-secondary">
                  Bodegas asignadas
                </p>
                <p className="mt-3 text-3xl font-bold text-text">{bodegas.length}</p>
              </article>
              <article className="rounded-2xl border border-white/10 bg-primary/30 p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-text-secondary">
                  Fincas
                </p>
                <p className="mt-3 text-3xl font-bold text-text">
                  {fincasLoading ? "…" : fincas.length}
                </p>
              </article>
              <article className="rounded-2xl border border-white/10 bg-primary/30 p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-text-secondary">
                  Cuarteles
                </p>
                <p className="mt-3 text-3xl font-bold text-text">
                  {loading ? "…" : cuartelesCount}
                </p>
              </article>
              <article className="rounded-2xl border border-white/10 bg-primary/30 p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-text-secondary">
                  Productos
                </p>
                <p className="mt-3 text-3xl font-bold text-text">
                  {loading ? "…" : trazabilidades.length}
                </p>
              </article>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <article className="rounded-2xl border border-white/10 bg-primary/20 p-4">
                <p className="text-xs text-text-secondary">En curso</p>
                <p className="mt-2 text-2xl font-semibold text-text">{stats.enCurso}</p>
              </article>
              <article className="rounded-2xl border border-white/10 bg-primary/20 p-4">
                <p className="text-xs text-text-secondary">Finalizadas / Certificadas</p>
                <p className="mt-2 text-2xl font-semibold text-text">{stats.finalizadas}</p>
              </article>
              <article className="rounded-2xl border border-white/10 bg-primary/20 p-4">
                <p className="text-xs text-text-secondary">Borrador</p>
                <p className="mt-2 text-2xl font-semibold text-text">{stats.borrador}</p>
              </article>
              <article className="rounded-2xl border border-white/10 bg-primary/20 p-4">
                <p className="text-xs text-text-secondary">Campañas abiertas</p>
                <p className="mt-2 text-2xl font-semibold text-text">{stats.campaniasAbiertas}</p>
              </article>
            </section>

            {error && (
              <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">
                {error}
              </div>
            )}

            <section className="rounded-2xl border border-white/10 bg-primary/25 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-text">Fincas de la bodega activa</h2>
                  <p className="text-xs text-text-secondary">
                    Cargadas para este usuario y contexto.
                  </p>
                </div>
                <Link
                  to="/setup/finca"
                  className="rounded-lg border border-[#C9A961]/40 px-3 py-2 text-xs font-semibold text-text transition hover:bg-primary"
                >
                  Crear finca
                </Link>
              </div>

              <div className="mt-4">
                {fincas.length === 0 ? (
                  <p className="text-sm text-text-secondary">No hay fincas cargadas todavía.</p>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {fincas.slice(0, 6).map((finca) => (
                      <Link
                        key={finca.finca_id ?? finca.id ?? finca.nombre ?? finca.name}
                        to={`/fincas/${finca.finca_id ?? finca.id}`}
                        className="rounded-xl border border-[#C9A961]/30 bg-[#FFF9F0] p-4 transition hover:border-[#C9A961] hover:shadow-md"
                      >
                        <div className="text-sm font-semibold text-[#3D1B1F]">
                          {finca.nombre ?? finca.nombre_finca ?? finca.name ?? "Finca sin nombre"}
                        </div>
                        <div className="mt-1 text-xs text-[#7A4A50]">
                          {finca.ubicacion ?? "Ubicación sin definir"}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
