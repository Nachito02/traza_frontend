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
  const activeBodega = bodegas.find((bodega) => bodega.bodega_id === String(activeBodegaId));

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
      fetchCampanias(activeBodegaId),
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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold text-text">Resumen operativo</h1>
              <p className="mt-2 text-sm text-text-secondary">
                Datos del usuario autenticado y su bodega activa.
              </p>
            </div>
            <Link
              to="/trazabilidades"
              className="rounded-lg border border-[#C9A961]/40 px-3 py-2 text-xs font-semibold text-text transition hover:bg-primary"
            >
              Ver procesos y etapas
            </Link>
          </div>
        </div>

        {!activeBodegaId ? (
          <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-6 text-sm text-red-200">
            Seleccioná una bodega para ver datos de fincas, cuarteles y trazabilidades.
          </div>
        ) : (
          <div className="space-y-6">
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Link to="/contexto" className="rounded-2xl border border-white/10 bg-primary/30 p-4 transition hover:bg-primary/40">
                <p className="text-xs uppercase tracking-[0.12em] text-text-secondary">
                  Bodega activa
                </p>
                <p className="mt-3 text-xl font-bold text-text">
                  {activeBodega?.nombre ?? "Sin seleccionar"}
                </p>
              </Link>
              <Link to="/fincas" className="rounded-2xl border border-white/10 bg-primary/30 p-4 transition hover:bg-primary/40">
                <p className="text-xs uppercase tracking-[0.12em] text-text-secondary">
                  Fincas
                </p>
                <p className="mt-3 text-3xl font-bold text-text">
                  {fincasLoading ? "…" : fincas.length}
                </p>
              </Link>
              <Link to="/admin/cuarteles" className="rounded-2xl border border-white/10 bg-primary/30 p-4 transition hover:bg-primary/40">
                <p className="text-xs uppercase tracking-[0.12em] text-text-secondary">
                  Cuarteles
                </p>
                <p className="mt-3 text-3xl font-bold text-text">
                  {loading ? "…" : cuartelesCount}
                </p>
              </Link>
              <Link to="/trazabilidades" className="rounded-2xl border border-white/10 bg-primary/30 p-4 transition hover:bg-primary/40">
                <p className="text-xs uppercase tracking-[0.12em] text-text-secondary">
                  Trazabilidades
                </p>
                <p className="mt-3 text-3xl font-bold text-text">
                  {loading ? "…" : trazabilidades.length}
                </p>
              </Link>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Link to="/trazabilidades" className="rounded-2xl border border-white/10 bg-primary/20 p-4 transition hover:bg-primary/30">
                <p className="text-xs text-text-secondary">En curso</p>
                <p className="mt-2 text-2xl font-semibold text-text">{stats.enCurso}</p>
              </Link>
              <Link to="/trazabilidades" className="rounded-2xl border border-white/10 bg-primary/20 p-4 transition hover:bg-primary/30">
                <p className="text-xs text-text-secondary">Finalizadas / Certificadas</p>
                <p className="mt-2 text-2xl font-semibold text-text">{stats.finalizadas}</p>
              </Link>
              <Link to="/trazabilidades" className="rounded-2xl border border-white/10 bg-primary/20 p-4 transition hover:bg-primary/30">
                <p className="text-xs text-text-secondary">Borrador</p>
                <p className="mt-2 text-2xl font-semibold text-text">{stats.borrador}</p>
              </Link>
              <Link to="/admin/campanias" className="rounded-2xl border border-white/10 bg-primary/20 p-4 transition hover:bg-primary/30">
                <p className="text-xs text-text-secondary">Campañas abiertas</p>
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
