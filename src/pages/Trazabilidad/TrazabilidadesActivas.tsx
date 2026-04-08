import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchCampanias } from "../../features/campanias/api";
import { useFincasStore } from "../../features/fincas/store";
import { fetchProtocolos } from "../../features/protocolos/api";
import {
  fetchTrazabilidades,
  type Trazabilidad,
} from "../../features/trazabilidades/api";
import { getApiErrorMessage } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";

const ACTIVE_STATES = new Set(["draft", "en_curso"]);

type TrazabilidadesActivasProps = {
  planBasePath?: string;
  embedded?: boolean;
};

const TrazabilidadesActivas = ({ planBasePath = "/trazabilidades", embedded = false }: TrazabilidadesActivasProps = {}) => {
  const activeBodegaId = useAuthStore((state) => state.activeBodegaId);
  const loadFincas = useFincasStore((state) => state.loadFincas);
  const fincas = useFincasStore((state) => state.fincas);
  const [trazabilidades, setTrazabilidades] = useState<Trazabilidad[]>([]);
  const [campaniaLabelById, setCampaniaLabelById] = useState<Record<string, string>>({});
  const [protocoloLabelById, setProtocoloLabelById] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeBodegaId) return;
    void loadFincas(activeBodegaId);
  }, [activeBodegaId, loadFincas]);

  useEffect(() => {
    if (!activeBodegaId) {
      setTrazabilidades([]);
      setLoading(false);
      return;
    }

    let mounted = true;
    setLoading(true);
    setError(null);
    Promise.all([
      fetchTrazabilidades(activeBodegaId),
      fetchCampanias(),
      fetchProtocolos(),
    ])
      .then(([trazabilidadesData, campanias, protocolos]) => {
        if (!mounted) return;
        setTrazabilidades(trazabilidadesData ?? []);
        setCampaniaLabelById(
          Object.fromEntries(
            (campanias ?? []).map((item) => [
              String(item.campania_id ?? item.id ?? ""),
              item.nombre,
            ]),
          ),
        );
        setProtocoloLabelById(
          Object.fromEntries(
            (protocolos ?? []).map((item) => [
              String(item.protocolo_id ?? item.id ?? ""),
              item.nombre ?? item.codigo ?? "Protocolo",
            ]),
          ),
        );
      })
      .catch((e) => {
        if (!mounted) return;
        setError(getApiErrorMessage(e));
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [activeBodegaId]);

  const fincaLabelById = useMemo(
    () =>
      Object.fromEntries(
        fincas.map((item) => [
          String(item.finca_id ?? item.id ?? ""),
          item.nombre ?? item.nombre_finca ?? item.name ?? "Finca",
        ]),
      ),
    [fincas],
  );

  const activas = useMemo(
    () =>
      trazabilidades.filter((item) =>
        ACTIVE_STATES.has(String(item.estado ?? "").toLowerCase()),
      ),
    [trazabilidades],
  );

  return (
    <div className={embedded ? "w-full" : "min-h-screen bg-secondary px-6 py-10"}>
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-text">Trazabilidades activas</h1>
          <p className="mt-2 text-sm text-text-secondary">
            Estado draft y en curso para la bodega activa.
          </p>
        </div>
        <div className="flex justify-end">
          <Link
            to="/trazabilidades/nueva"
            className="rounded-lg border border-[#C9A961]/40 bg-[#722F37] px-4 py-2 text-sm font-semibold text-[#FFF9F0] transition hover:bg-[#5D232A]"
          >
            Nuevo proceso
          </Link>
        </div>

        {!activeBodegaId ? (
          <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-6 text-sm text-red-200">
            Seleccioná una bodega para ver las trazabilidades activas.
          </div>
        ) : loading ? (
          <div className="rounded-2xl border border-white/10 bg-primary/25 p-6 text-sm text-text-secondary">
            Cargando trazabilidades…
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-300 bg-red-50 p-6 text-sm text-red-700">
            {error}
          </div>
        ) : activas.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-primary/25 p-6 text-sm text-text-secondary">
            <div>No hay trazabilidades activas.</div>
            <Link
              to="/trazabilidades/nueva"
              className="mt-3 inline-flex rounded-lg border border-[#C9A961]/40 px-3 py-2 text-xs font-semibold text-[#722F37] transition hover:bg-[#F8F3EE]"
            >
              Crear el primer proceso
            </Link>
          </div>
        ) : (
          <div className="grid gap-3">
            {activas.map((item) => (
              <article
                key={item.trazabilidad_id}
                className="rounded-xl border border-[#C9A961]/30 bg-[#FFF9F0] p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-[#3D1B1F]">
                      {item.nombre_producto?.trim() || "Trazabilidad sin nombre"}
                    </div>
                    <div className="mt-1 text-xs text-[#7A4A50]">
                      Campaña{" "}
                      {campaniaLabelById[item.campania_id] ?? item.campania_id} · Protocolo{" "}
                      {protocoloLabelById[item.protocolo_id] ?? item.protocolo_id}
                    </div>
                    <div className="mt-1 text-xs text-[#8B4049]">
                      {item.finca_id
                        ? `Finca ${fincaLabelById[item.finca_id] ?? item.finca_id}`
                        : "Multi-finca"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-[#EED9BC] px-2 py-1 text-xs font-semibold text-[#5A2D32]">
                      {item.estado}
                    </span>
                    <Link
                      to={`${planBasePath}/${item.trazabilidad_id}/plan`}
                      className="rounded-lg border border-[#C9A961]/40 px-3 py-2 text-xs font-semibold text-[#722F37] transition hover:bg-[#F8F3EE]"
                    >
                      Abrir plan
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TrazabilidadesActivas;
