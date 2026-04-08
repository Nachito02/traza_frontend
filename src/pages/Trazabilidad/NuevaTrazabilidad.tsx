import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
    <div className="min-h-screen bg-gradient-to-br from-[#F9F6F2] via-[#F3E7DA] to-[#EAD8C6] px-6 py-10">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <section className="rounded-3xl bg-white/90 p-8 shadow-lg">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8B5E34]">
                Trazabilidad
              </p>
              <h1 className="mt-2 text-3xl font-bold text-[#3D1B1F]">Nuevo proceso</h1>
              <p className="mt-2 max-w-3xl text-sm text-[#6B3A3F]">
                Definí el contexto productivo y generá la trazabilidad inicial para empezar a
                cargar procesos, evidencias y tareas desde el workspace.
              </p>
            </div>
            <div className="rounded-2xl border border-[#C9A961]/30 bg-[#FFF9F0] px-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8B5E34]">
                Bodega activa
              </div>
              <div className="mt-1 text-sm font-semibold text-[#3D1B1F]">
                {activeBodega?.nombre ?? "Sin seleccionar"}
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-3xl bg-white/90 p-6 shadow-lg">
            {!activeBodegaId ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                Seleccioná una bodega activa antes de crear una trazabilidad.
              </div>
            ) : loadingContext ? (
              <div className="text-sm text-[#6B3A3F]">Cargando contexto…</div>
            ) : (
              <form className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2 text-sm text-[#6B3A3F]">
                    <span className="font-semibold text-[#3D1B1F]">Campaña</span>
                    <select
                      value={form.campaniaId}
                      onChange={(event) => onChange("campaniaId", event.target.value)}
                      className="w-full rounded-xl border border-[#C9A961]/40 bg-white px-3 py-2 text-sm text-[#3D1B1F] outline-none"
                    >
                      <option value="">Seleccionar campaña</option>
                      {campanias.map((campania) => (
                        <option key={resolveCampaniaId(campania)} value={resolveCampaniaId(campania)}>
                          {campania.nombre}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-2 text-sm text-[#6B3A3F]">
                    <span className="font-semibold text-[#3D1B1F]">Finca</span>
                    <select
                      value={form.fincaId}
                      onChange={(event) => onChange("fincaId", event.target.value)}
                      className="w-full rounded-xl border border-[#C9A961]/40 bg-white px-3 py-2 text-sm text-[#3D1B1F] outline-none"
                    >
                      <option value="">Seleccionar finca</option>
                      {fincas.map((finca) => (
                        <option key={resolveFincaId(finca)} value={resolveFincaId(finca)}>
                          {resolveFincaName(finca)}
                        </option>
                      ))}
                    </select>
                    {fincasLoading ? (
                      <p className="text-xs text-[#7A4A50]">Cargando fincas…</p>
                    ) : null}
                  </label>

                  <label className="space-y-2 text-sm text-[#6B3A3F]">
                    <span className="font-semibold text-[#3D1B1F]">Cuartel</span>
                    <select
                      value={form.cuartelId}
                      onChange={(event) => onChange("cuartelId", event.target.value)}
                      className="w-full rounded-xl border border-[#C9A961]/40 bg-white px-3 py-2 text-sm text-[#3D1B1F] outline-none"
                    >
                      <option value="">Seleccionar cuartel</option>
                      {cuarteles.map((cuartel) => (
                        <option key={resolveCuartelId(cuartel)} value={resolveCuartelId(cuartel)}>
                          {cuartel.codigo_cuartel} · {cuartel.variedad}
                        </option>
                      ))}
                    </select>
                    {loadingCuarteles ? (
                      <p className="text-xs text-[#7A4A50]">Cargando cuarteles…</p>
                    ) : null}
                  </label>

                  <label className="space-y-2 text-sm text-[#6B3A3F]">
                    <span className="font-semibold text-[#3D1B1F]">Protocolo</span>
                    <select
                      value={form.protocoloId}
                      onChange={(event) => onChange("protocoloId", event.target.value)}
                      className="w-full rounded-xl border border-[#C9A961]/40 bg-white px-3 py-2 text-sm text-[#3D1B1F] outline-none"
                    >
                      <option value="">Seleccionar protocolo</option>
                      {protocolos.map((protocolo) => (
                        <option key={resolveProtocolId(protocolo)} value={resolveProtocolId(protocolo)}>
                          {protocolo.nombre ?? protocolo.codigo ?? "Protocolo"}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="space-y-2 text-sm text-[#6B3A3F]">
                  <span className="font-semibold text-[#3D1B1F]">Nombre del proceso</span>
                  <input
                    type="text"
                    value={form.nombreProducto}
                    onChange={(event) => onChange("nombreProducto", event.target.value)}
                    placeholder="Ej: Vendimia Malbec C-01"
                    className="w-full rounded-xl border border-[#C9A961]/40 bg-white px-3 py-2 text-sm text-[#3D1B1F] outline-none"
                  />
                  <p className="text-xs text-[#7A4A50]">
                    Si lo dejás vacío, generamos un nombre automático con finca y cuartel.
                  </p>
                </label>

                {error ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {error}
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={saving || !activeBodegaId}
                    onClick={() => void handleSubmit()}
                    className="rounded-lg border border-[#C9A961]/40 bg-[#722F37] px-4 py-2 text-sm font-semibold text-[#FFF9F0] transition hover:bg-[#5D232A] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? "Creando proceso..." : "Crear proceso y abrir workspace"}
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate("/trazabilidades")}
                    className="rounded-lg border border-[#C9A961]/40 px-4 py-2 text-sm font-semibold text-[#722F37] transition hover:bg-[#F8F3EE]"
                  >
                    Ver trazabilidades activas
                  </button>
                </div>
              </form>
            )}
          </section>

          <aside className="space-y-4">
            <section className="rounded-3xl bg-white/90 p-6 shadow-lg">
              <h2 className="text-lg font-semibold text-[#3D1B1F]">Resumen del proceso</h2>
              <div className="mt-4 space-y-3 text-sm text-[#6B3A3F]">
                <div className="rounded-2xl border border-[#C9A961]/30 bg-[#FFF9F0] p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8B5E34]">
                    Contexto elegido
                  </div>
                  <div className="mt-2 space-y-1 text-[#3D1B1F]">
                    <div>Bodega: {activeBodega?.nombre ?? "-"}</div>
                    <div>Campaña: {selectedCampania?.nombre ?? "-"}</div>
                    <div>Finca: {selectedFinca ? resolveFincaName(selectedFinca) : "-"}</div>
                    <div>Cuartel: {selectedCuartel?.codigo_cuartel ?? "-"}</div>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#C9A961]/30 bg-[#FFF9F0] p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8B5E34]">
                    Protocolo
                  </div>
                  <div className="mt-2 text-[#3D1B1F]">
                    <div className="font-semibold">
                      {selectedProtocol?.nombre ?? selectedProtocol?.codigo ?? "Sin seleccionar"}
                    </div>
                    <div className="mt-1 text-xs text-[#7A4A50]">
                      {protocolStageCount} etapas · {protocolProcessCount} procesos
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-3xl bg-white/90 p-6 shadow-lg">
              <h2 className="text-lg font-semibold text-[#3D1B1F]">Qué pasa al crear</h2>
              <div className="mt-4 space-y-2 text-sm text-[#6B3A3F]">
                <div>1. Se crea la trazabilidad para el cuartel y campaña elegidos.</div>
                <div>2. Se generan automáticamente los milestones del protocolo.</div>
                <div>3. Se abre el workspace para empezar a cargar eventos y tareas.</div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
