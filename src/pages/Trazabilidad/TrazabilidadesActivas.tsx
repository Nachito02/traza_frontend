import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AppButton, AppCard, NoticeBanner, SectionIntro } from "../../components/ui";
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
        <SectionIntro
          title="Trazabilidades activas"
          description="Estado draft y en curso para la bodega activa."
          actions={(
            <Link to="/trazabilidades/nueva">
              <AppButton variant="primary">Nuevo proceso</AppButton>
            </Link>
          )}
        />

        {!activeBodegaId ? (
          <NoticeBanner tone="danger" className="p-6">
            Seleccioná una bodega para ver las trazabilidades activas.
          </NoticeBanner>
        ) : loading ? (
          <NoticeBanner className="p-6">
            Cargando trazabilidades…
          </NoticeBanner>
        ) : error ? (
          <NoticeBanner tone="danger" className="p-6">
            {error}
          </NoticeBanner>
        ) : activas.length === 0 ? (
          <NoticeBanner className="p-6">
            <div>No hay trazabilidades activas.</div>
            <div className="mt-3">
              <Link to="/trazabilidades/nueva">
                <AppButton variant="secondary" size="sm">Crear el primer proceso</AppButton>
              </Link>
            </div>
          </NoticeBanner>
        ) : (
          <div className="grid gap-3">
            {activas.map((item) => (
              <AppCard
                key={item.trazabilidad_id}
                as="article"
                tone="soft"
                padding="sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-[color:var(--text-ink)]">
                      {item.nombre_producto?.trim() || "Trazabilidad sin nombre"}
                    </div>
                    <div className="mt-1 text-xs text-[color:var(--text-ink-muted)]">
                      Campaña{" "}
                      {campaniaLabelById[item.campania_id] ?? item.campania_id} · Protocolo{" "}
                      {protocoloLabelById[item.protocolo_id] ?? item.protocolo_id}
                    </div>
                    <div className="mt-1 text-xs text-[color:var(--accent-primary)]">
                      {item.finca_id
                        ? `Finca ${fincaLabelById[item.finca_id] ?? item.finca_id}`
                        : "Multi-finca"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-[color:var(--border-default)] bg-[color:var(--surface-soft)] px-2 py-1 text-xs font-semibold text-[color:var(--accent-primary)]">
                      {item.estado}
                    </span>
                    <Link
                      to={`${planBasePath}/${item.trazabilidad_id}/plan`}
                      className="inline-flex"
                    >
                      <AppButton variant="secondary" size="sm">Abrir plan</AppButton>
                    </Link>
                  </div>
                </div>
              </AppCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TrazabilidadesActivas;
