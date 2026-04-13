import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AppButton,
  AppCard,
  AppInput,
  AppSelect,
  NoticeBanner,
  SectionIntro,
} from "../../components/ui";
import { fetchCampanias, type Campania } from "../../features/campanias/api";
import { fetchCuartelesByFinca, type Cuartel } from "../../features/cuarteles/api";
import { useFincasStore } from "../../features/fincas/store";
import {
  createTrazabilidad,
  type Trazabilidad,
} from "../../features/trazabilidades/api";
import {
  fetchProtocolosExpanded,
  getDefaultProtocoloId,
  type ProtocoloExpanded,
} from "../../features/protocolos/api";
import { getApiErrorMessage } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import { useCampaniaStore } from "../../store/campaniaStore";

function resolveProtocolId(item: ProtocoloExpanded) {
  return String(item.protocolo_id ?? item.id ?? "");
}

function resolveCampaniaId(item: Campania) {
  return String(item.campania_id ?? item.id ?? "");
}

function resolveFincaId(item: { finca_id?: string; id?: string }) {
  return String(item.finca_id ?? item.id ?? "");
}

function resolveFincaName(item: { nombre?: string; nombre_finca?: string; name?: string }) {
  return item.nombre ?? item.nombre_finca ?? item.name ?? "Finca";
}

function resolveCuartelId(item: Cuartel) {
  return String(item.cuartel_id ?? item.id ?? "");
}

export default function NuevaTrazabilidad() {
  const navigate = useNavigate();
  const activeBodegaId = useAuthStore((state) => state.activeBodegaId);
  const bodegas = useAuthStore((state) => state.bodegas);
  const activeCampaniaId = useCampaniaStore((state) => state.activeCampaniaId);
  const loadFincas = useFincasStore((state) => state.loadFincas);
  const fincas = useFincasStore((state) => state.fincas);
  const fincasLoading = useFincasStore((state) => state.loading);

  const [campanias, setCampanias] = useState<Campania[]>([]);
  const [protocolos, setProtocolos] = useState<ProtocoloExpanded[]>([]);
  const [cuarteles, setCuarteles] = useState<Cuartel[]>([]);
  const [loadingContext, setLoadingContext] = useState(true);
  const [loadingCuarteles, setLoadingCuarteles] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    campaniaId: "",
    fincaId: "",
    cuartelId: "",
    protocoloId: "",
    nombreProducto: "",
  });

  const activeBodega = bodegas.find(
    (item) => String(item.bodega_id) === String(activeBodegaId ?? ""),
  );

  useEffect(() => {
    if (!activeBodegaId) {
      setLoadingContext(false);
      return;
    }

    let mounted = true;
    setLoadingContext(true);
    setError(null);

    Promise.all([
      loadFincas(activeBodegaId),
      fetchCampanias(activeBodegaId),
      fetchProtocolosExpanded(),
    ])
      .then(([, loadedCampanias, loadedProtocolos]) => {
        if (!mounted) return;
        const protocolosOrdenados = [...(loadedProtocolos ?? [])].sort((a, b) => {
          const aProcessCount = (a.protocolo_etapa ?? []).reduce(
            (acc, etapa) => acc + (etapa.protocolo_proceso?.length ?? 0),
            0,
          );
          const bProcessCount = (b.protocolo_etapa ?? []).reduce(
            (acc, etapa) => acc + (etapa.protocolo_proceso?.length ?? 0),
            0,
          );
          return bProcessCount - aProcessCount;
        });
        setCampanias(loadedCampanias ?? []);
        setProtocolos(protocolosOrdenados);
        setForm((prev) => ({
          ...prev,
          campaniaId: prev.campaniaId || activeCampaniaId || resolveCampaniaId(loadedCampanias?.[0] ?? { id: "" }),
          protocoloId: prev.protocoloId || getDefaultProtocoloId(protocolosOrdenados),
        }));
      })
      .catch((requestError) => {
        if (!mounted) return;
        setError(getApiErrorMessage(requestError));
      })
      .finally(() => {
        if (!mounted) return;
        setLoadingContext(false);
      });

    return () => {
      mounted = false;
    };
  }, [activeBodegaId, activeCampaniaId, loadFincas]);

  useEffect(() => {
    if (fincas.length === 0) return;
    setForm((prev) => {
      if (prev.fincaId) return prev;
      return {
        ...prev,
        fincaId: resolveFincaId(fincas[0]),
      };
    });
  }, [fincas]);

  useEffect(() => {
    if (!form.fincaId) {
      setCuarteles([]);
      setForm((prev) => ({ ...prev, cuartelId: "" }));
      return;
    }

    let mounted = true;
    setLoadingCuarteles(true);
    fetchCuartelesByFinca(form.fincaId)
      .then((loadedCuarteles) => {
        if (!mounted) return;
        setCuarteles(loadedCuarteles ?? []);
        setForm((prev) => {
          const currentExists = (loadedCuarteles ?? []).some(
            (item) => resolveCuartelId(item) === prev.cuartelId,
          );
          return {
            ...prev,
            cuartelId: currentExists
              ? prev.cuartelId
              : resolveCuartelId(loadedCuarteles?.[0] ?? { id: "" } as Cuartel),
          };
        });
      })
      .catch((requestError) => {
        if (!mounted) return;
        setError(getApiErrorMessage(requestError));
        setCuarteles([]);
      })
      .finally(() => {
        if (!mounted) return;
        setLoadingCuarteles(false);
      });

    return () => {
      mounted = false;
    };
  }, [form.fincaId]);

  const selectedProtocol = useMemo(
    () => protocolos.find((item) => resolveProtocolId(item) === form.protocoloId) ?? null,
    [form.protocoloId, protocolos],
  );
  const selectedFinca = useMemo(
    () => fincas.find((item) => resolveFincaId(item) === form.fincaId) ?? null,
    [fincas, form.fincaId],
  );
  const selectedCuartel = useMemo(
    () => cuarteles.find((item) => resolveCuartelId(item) === form.cuartelId) ?? null,
    [cuarteles, form.cuartelId],
  );
  const selectedCampania = useMemo(
    () => campanias.find((item) => resolveCampaniaId(item) === form.campaniaId) ?? null,
    [campanias, form.campaniaId],
  );

  const protocolStageCount = (selectedProtocol?.protocolo_etapa ?? []).length;
  const protocolProcessCount = (selectedProtocol?.protocolo_etapa ?? []).reduce(
    (acc, etapa) => acc + (etapa.protocolo_proceso?.length ?? 0),
    0,
  );

  const onChange = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!activeBodegaId) {
      setError("Seleccioná una bodega activa antes de crear un proceso.");
      return;
    }
    if (!form.campaniaId || !form.fincaId || !form.cuartelId || !form.protocoloId) {
      setError("Completá campaña, finca, cuartel y protocolo.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const created = await createTrazabilidad({
        bodegaId: String(activeBodegaId),
        campaniaId: form.campaniaId,
        fincaId: form.fincaId,
        cuartelId: form.cuartelId,
        protocoloId: form.protocoloId,
        nombre_producto:
          form.nombreProducto.trim() ||
          `Proceso ${selectedFinca ? resolveFincaName(selectedFinca) : "Finca"}${selectedCuartel?.codigo_cuartel ? ` · ${selectedCuartel.codigo_cuartel}` : ""}`,
      });
      const createdId = String((created as Trazabilidad).trazabilidad_id ?? "");
      navigate(`/trazabilidades/${encodeURIComponent(createdId)}/plan`, { replace: true });
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-secondary px-6 py-10">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <AppCard as="section" tone="default" padding="lg">
          <SectionIntro
            title="Nuevo proceso"
            description="Definí el contexto productivo y generá la trazabilidad inicial para empezar a cargar procesos, evidencias y tareas desde el workspace."
            actions={(
              <AppCard as="div" tone="soft" padding="sm" className="min-w-[220px]">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-secondary)]">
                  Bodega activa
                </div>
                <div className="mt-1 text-sm font-semibold text-[color:var(--text-ink)]">
                  {activeBodega?.nombre ?? "Sin seleccionar"}
                </div>
              </AppCard>
            )}
          />
        </AppCard>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <AppCard as="section" tone="default" padding="lg">
            {!activeBodegaId ? (
              <NoticeBanner tone="danger">
                Seleccioná una bodega activa antes de crear una trazabilidad.
              </NoticeBanner>
            ) : loadingContext ? (
              <NoticeBanner>Cargando contexto…</NoticeBanner>
            ) : (
              <form className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <AppSelect
                    label="Campaña"
                    value={form.campaniaId}
                    onChange={(event) => onChange("campaniaId", event.target.value)}
                  >
                    <option value="">Seleccionar campaña</option>
                    {campanias.map((campania) => (
                      <option key={resolveCampaniaId(campania)} value={resolveCampaniaId(campania)}>
                        {campania.nombre}
                      </option>
                    ))}
                  </AppSelect>

                  <AppSelect
                    label="Finca"
                    value={form.fincaId}
                    onChange={(event) => onChange("fincaId", event.target.value)}
                    description={fincasLoading ? "Cargando fincas…" : undefined}
                  >
                    <option value="">Seleccionar finca</option>
                    {fincas.map((finca) => (
                      <option key={resolveFincaId(finca)} value={resolveFincaId(finca)}>
                        {resolveFincaName(finca)}
                      </option>
                    ))}
                  </AppSelect>

                  <AppSelect
                    label="Cuartel"
                    value={form.cuartelId}
                    onChange={(event) => onChange("cuartelId", event.target.value)}
                    description={loadingCuarteles ? "Cargando cuarteles…" : undefined}
                  >
                    <option value="">Seleccionar cuartel</option>
                    {cuarteles.map((cuartel) => (
                      <option key={resolveCuartelId(cuartel)} value={resolveCuartelId(cuartel)}>
                        {cuartel.codigo_cuartel} · {cuartel.variedad}
                      </option>
                    ))}
                  </AppSelect>

                  <AppSelect
                    label="Protocolo"
                    value={form.protocoloId}
                    onChange={(event) => onChange("protocoloId", event.target.value)}
                  >
                    <option value="">Seleccionar protocolo</option>
                    {protocolos.map((protocolo) => (
                      <option key={resolveProtocolId(protocolo)} value={resolveProtocolId(protocolo)}>
                        {protocolo.nombre ?? protocolo.codigo ?? "Protocolo"}
                      </option>
                    ))}
                  </AppSelect>
                </div>

                <AppInput
                  label="Nombre del proceso"
                  type="text"
                  value={form.nombreProducto}
                  onChange={(event) => onChange("nombreProducto", event.target.value)}
                  placeholder="Ej: Vendimia Malbec C-01"
                  description="Si lo dejás vacío, generamos un nombre automático con finca y cuartel."
                />

                {error ? (
                  <NoticeBanner tone="danger">{error}</NoticeBanner>
                ) : null}

                <div className="flex flex-wrap gap-3">
                  <AppButton
                    type="button"
                    variant="primary"
                    disabled={saving || !activeBodegaId}
                    loading={saving}
                    onClick={() => void handleSubmit()}
                  >
                    {saving ? "Creando proceso..." : "Crear proceso y abrir workspace"}
                  </AppButton>
                  <AppButton
                    type="button"
                    variant="secondary"
                    onClick={() => navigate("/trazabilidades")}
                  >
                    Ver trazabilidades activas
                  </AppButton>
                </div>
              </form>
            )}
          </AppCard>

          <aside className="space-y-4">
            <AppCard
              as="section"
              tone="default"
              padding="lg"
              header={<h2 className="text-lg font-semibold text-[color:var(--text-ink)]">Resumen del proceso</h2>}
            >
              <div className="space-y-3 text-sm text-[color:var(--text-ink-muted)]">
                <AppCard as="div" tone="soft" padding="sm" className="bg-[color:var(--surface-soft)]">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-secondary)]">
                    Contexto elegido
                  </div>
                  <div className="mt-2 space-y-1 text-[color:var(--text-ink)]">
                    <div>Bodega: {activeBodega?.nombre ?? "-"}</div>
                    <div>Campaña: {selectedCampania?.nombre ?? "-"}</div>
                    <div>Finca: {selectedFinca ? resolveFincaName(selectedFinca) : "-"}</div>
                    <div>Cuartel: {selectedCuartel?.codigo_cuartel ?? "-"}</div>
                  </div>
                </AppCard>

                <AppCard as="div" tone="soft" padding="sm" className="bg-[color:var(--surface-soft)]">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-secondary)]">
                    Protocolo
                  </div>
                  <div className="mt-2 text-[color:var(--text-ink)]">
                    <div className="font-semibold">
                      {selectedProtocol?.nombre ?? selectedProtocol?.codigo ?? "Sin seleccionar"}
                    </div>
                    <div className="mt-1 text-xs text-[color:var(--text-ink-muted)]">
                      {protocolStageCount} etapas · {protocolProcessCount} procesos
                    </div>
                  </div>
                </AppCard>
              </div>
            </AppCard>

            <AppCard
              as="section"
              tone="default"
              padding="lg"
              header={<h2 className="text-lg font-semibold text-[color:var(--text-ink)]">Qué pasa al crear</h2>}
            >
              <div className="space-y-2 text-sm text-[color:var(--text-ink-muted)]">
                <div>1. Se crea la trazabilidad para el cuartel y campaña elegidos.</div>
                <div>2. Se generan automáticamente los milestones del protocolo.</div>
                <div>3. Se abre el workspace para empezar a cargar eventos y tareas.</div>
              </div>
            </AppCard>
          </aside>
        </div>
      </div>
    </div>
  );
}
