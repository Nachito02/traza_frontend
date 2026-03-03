import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { createCuartel } from "../../features/cuarteles/api";
import { fetchFincaById, type Finca as FincaDetail } from "../../features/fincas/api";
import { useAuthStore } from "../../store/authStore";
import { useFincasStore } from "../../features/fincas/store";
import { getApiErrorMessage } from "../../lib/api";

const Fincas = () => {
  const activeBodegaId = useAuthStore((state) => state.activeBodegaId);
  const fincas = useFincasStore((state) => state.fincas);
  const fincasLoading = useFincasStore((state) => state.loading);
  const fincasError = useFincasStore((state) => state.error);
  const loadFincas = useFincasStore((state) => state.loadFincas);
  const [showCuartelForm, setShowCuartelForm] = useState(false);
  const [savingCuartel, setSavingCuartel] = useState(false);
  const [cuartelMessage, setCuartelMessage] = useState<string | null>(null);
  const [cuartelError, setCuartelError] = useState<string | null>(null);
  const [expandedFincaId, setExpandedFincaId] = useState<string | null>(null);
  const [loadingDetailId, setLoadingDetailId] = useState<string | null>(null);
  const [fincaDetailById, setFincaDetailById] = useState<Record<string, FincaDetail>>({});
  const [fincaDetailErrorById, setFincaDetailErrorById] = useState<Record<string, string>>(
    {},
  );
  const [cuartelForm, setCuartelForm] = useState({
    fincaId: "",
    codigo_cuartel: "",
    superficie_ha: "",
    cultivo: "Vid",
    variedad: "",
    sistema_productivo: "",
    sistema_conduccion: "",
  });

  const pickDetailValue = (detail: FincaDetail | undefined, keys: string[]) => {
    if (!detail) return "-";
    const source = detail as Record<string, unknown>;
    for (const key of keys) {
      const value = source[key];
      if (typeof value === "string" && value.trim()) return value;
      if (typeof value === "number") return String(value);
    }
    return "-";
  };

  useEffect(() => {
    if (!activeBodegaId) return;
    void loadFincas(activeBodegaId);
  }, [activeBodegaId, loadFincas]);

  useEffect(() => {
    if (cuartelForm.fincaId || fincas.length === 0) return;
    setCuartelForm((prev) => ({
      ...prev,
      fincaId: String(fincas[0].finca_id ?? fincas[0].id ?? ""),
    }));
  }, [cuartelForm.fincaId, fincas]);

  useEffect(() => {
    const idsToFetch = fincas
      .map((finca) => String(finca.finca_id ?? finca.id ?? ""))
      .filter((id) => id && !fincaDetailById[id]);
    if (idsToFetch.length === 0) return;

    let mounted = true;
    Promise.all(
      idsToFetch.map(async (fincaId) => {
        try {
          const detail = await fetchFincaById(fincaId);
          return { fincaId, detail };
        } catch {
          return null;
        }
      }),
    ).then((results) => {
      if (!mounted) return;
      const nextEntries = results.filter(Boolean) as Array<{ fincaId: string; detail: FincaDetail }>;
      if (nextEntries.length === 0) return;
      setFincaDetailById((prev) => ({
        ...prev,
        ...Object.fromEntries(nextEntries.map((entry) => [entry.fincaId, entry.detail])),
      }));
    });

    return () => {
      mounted = false;
    };
  }, [fincaDetailById, fincas]);

  const fincaOptions = useMemo(
    () =>
      fincas.map((finca) => ({
        id: String(finca.finca_id ?? finca.id ?? ""),
        label: finca.nombre ?? finca.nombre_finca ?? finca.name ?? "(Sin nombre)",
      })),
    [fincas],
  );

  const onSubmitCuartel = async () => {
    if (!cuartelForm.fincaId) {
      setCuartelError("Seleccioná una finca.");
      return;
    }
    if (!cuartelForm.codigo_cuartel.trim()) {
      setCuartelError("El código de cuartel es obligatorio.");
      return;
    }
    if (!cuartelForm.variedad.trim()) {
      setCuartelError("La variedad es obligatoria.");
      return;
    }
    if (!cuartelForm.superficie_ha || Number.isNaN(Number(cuartelForm.superficie_ha))) {
      setCuartelError("Ingresá una superficie válida.");
      return;
    }

    setSavingCuartel(true);
    setCuartelError(null);
    setCuartelMessage(null);
    try {
      await createCuartel({
        fincaId: cuartelForm.fincaId,
        codigo_cuartel: cuartelForm.codigo_cuartel.trim(),
        superficie_ha: Number(cuartelForm.superficie_ha),
        cultivo: cuartelForm.cultivo.trim() || "Vid",
        variedad: cuartelForm.variedad.trim(),
        sistema_productivo: cuartelForm.sistema_productivo.trim() || null,
        sistema_conduccion: cuartelForm.sistema_conduccion.trim() || null,
      });
      setCuartelMessage("Cuartel creado correctamente.");
      setCuartelForm((prev) => ({
        ...prev,
        codigo_cuartel: "",
        superficie_ha: "",
        variedad: "",
        sistema_productivo: "",
        sistema_conduccion: "",
      }));
    } catch (error) {
      setCuartelError(getApiErrorMessage(error));
    } finally {
      setSavingCuartel(false);
    }
  };

  const onToggleFincaDetail = async (fincaId: string) => {
    if (!fincaId) return;
    if (expandedFincaId === fincaId) {
      setExpandedFincaId(null);
      return;
    }
    setExpandedFincaId(fincaId);
    if (fincaDetailById[fincaId]) return;

    setLoadingDetailId(fincaId);
    setFincaDetailErrorById((prev) => ({ ...prev, [fincaId]: "" }));
    try {
      const detail = await fetchFincaById(fincaId);
      setFincaDetailById((prev) => ({ ...prev, [fincaId]: detail }));
    } catch (error) {
      setFincaDetailErrorById((prev) => ({
        ...prev,
        [fincaId]: getApiErrorMessage(error),
      }));
    } finally {
      setLoadingDetailId(null);
    }
  };

  return (
    <div className="min-h-screen bg-secondary px-6 py-10">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text">Administracion de fincas</h1>
          <p className="mt-2 text-sm text-text-secondary">
            Supervisa y gestiona tus fincas.
          </p>
        </div>

        <section className="mb-8 rounded-2xl  bg-primary/30 p-6 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-text">Fincas</h2>
              <p className="text-xs text-text">
                Primero definí la finca para poder cargar campañas, cuarteles y
                protocolos.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowCuartelForm((prev) => !prev);
                  setCuartelError(null);
                  setCuartelMessage(null);
                }}
                className="rounded-lg border border-[#C9A961]/40 px-3 py-2 text-xs font-semibold text-text transition hover:bg-primary"
              >
                {showCuartelForm ? "Ocultar alta cuartel" : "Crear cuartel"}
              </button>
              <Link
                to="/setup/finca"
                className="rounded-lg border border-[#C9A961]/40 px-3 py-2 text-xs font-semibold text-text transition hover:bg-primary"
              >
                Crear finca
              </Link>
            </div>
          </div>

          <div className="mt-4">
            {showCuartelForm ? (
              <div className="mb-4 rounded-xl border border-[#C9A961]/30 bg-[#FFF9F0] p-4">
                <h3 className="text-sm font-semibold text-[#3D1B1F]">Alta de cuartel</h3>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs text-[#722F37]">Finca</label>
                    <select
                      value={cuartelForm.fincaId}
                      onChange={(event) =>
                        setCuartelForm((prev) => ({ ...prev, fincaId: event.target.value }))
                      }
                      className="w-full rounded border border-[#C9A961]/40 px-3 py-2 text-sm text-[#3D1B1F]"
                    >
                      <option value="">Seleccionar finca</option>
                      {fincaOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-[#722F37]">Código cuartel</label>
                    <input
                      value={cuartelForm.codigo_cuartel}
                      onChange={(event) =>
                        setCuartelForm((prev) => ({
                          ...prev,
                          codigo_cuartel: event.target.value,
                        }))
                      }
                      className="w-full rounded border border-[#C9A961]/40 px-3 py-2 text-sm text-[#3D1B1F]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-[#722F37]">Superficie (ha)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={cuartelForm.superficie_ha}
                      onChange={(event) =>
                        setCuartelForm((prev) => ({
                          ...prev,
                          superficie_ha: event.target.value,
                        }))
                      }
                      className="w-full rounded border border-[#C9A961]/40 px-3 py-2 text-sm text-[#3D1B1F]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-[#722F37]">Cultivo</label>
                    <input
                      value={cuartelForm.cultivo}
                      onChange={(event) =>
                        setCuartelForm((prev) => ({ ...prev, cultivo: event.target.value }))
                      }
                      className="w-full rounded border border-[#C9A961]/40 px-3 py-2 text-sm text-[#3D1B1F]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-[#722F37]">Variedad</label>
                    <input
                      value={cuartelForm.variedad}
                      onChange={(event) =>
                        setCuartelForm((prev) => ({ ...prev, variedad: event.target.value }))
                      }
                      className="w-full rounded border border-[#C9A961]/40 px-3 py-2 text-sm text-[#3D1B1F]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-[#722F37]">Sistema productivo</label>
                    <input
                      value={cuartelForm.sistema_productivo}
                      onChange={(event) =>
                        setCuartelForm((prev) => ({
                          ...prev,
                          sistema_productivo: event.target.value,
                        }))
                      }
                      className="w-full rounded border border-[#C9A961]/40 px-3 py-2 text-sm text-[#3D1B1F]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-[#722F37]">Sistema conducción</label>
                    <input
                      value={cuartelForm.sistema_conduccion}
                      onChange={(event) =>
                        setCuartelForm((prev) => ({
                          ...prev,
                          sistema_conduccion: event.target.value,
                        }))
                      }
                      className="w-full rounded border border-[#C9A961]/40 px-3 py-2 text-sm text-[#3D1B1F]"
                    />
                  </div>
                </div>

                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => void onSubmitCuartel()}
                    disabled={savingCuartel}
                    className="rounded border border-[#C9A961]/50 px-3 py-2 text-xs font-semibold text-[#722F37] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingCuartel ? "Guardando..." : "Guardar cuartel"}
                  </button>
                </div>
                {cuartelError ? (
                  <div className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    {cuartelError}
                  </div>
                ) : null}
                {cuartelMessage ? (
                  <div className="mt-3 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                    {cuartelMessage}
                  </div>
                ) : null}
              </div>
            ) : null}

            {!activeBodegaId ? (
              <div className="text-xs text-[#7A4A50]">
                Seleccioná una bodega para ver las fincas.
              </div>
            ) : fincasLoading ? (
              <div className="text-xs text-[#7A4A50]">Cargando fincas…</div>
            ) : fincasError ? (
              <div className="text-xs text-red-700">{fincasError}</div>
            ) : fincas.length === 0 ? (
              <div className="text-xs text-text-secondary">
                No hay fincas cargadas.
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {fincas.map((finca) => (
                  <article
                    key={finca.finca_id ?? finca.id ?? finca.nombre}
                    className="rounded-xl border border-[#C9A961]/30 bg-[#FFF9F0] p-4"
                  >
                    {(() => {
                      const fincaId = String(finca.finca_id ?? finca.id ?? "");
                      const isExpanded = expandedFincaId === fincaId;
                      const detail = fincaDetailById[fincaId];
                      const detailError = fincaDetailErrorById[fincaId];
                      const isLoadingDetail = loadingDetailId === fincaId;
                      return (
                        <>
                    <div className="text-sm font-semibold text-[#3D1B1F]">
                      {finca.nombre ??
                        finca.nombre_finca ??
                        finca.name ??
                        "Finca sin nombre"}
                    </div>
                    <div className="mt-1 text-xs text-[#7A4A50]">
                      {pickDetailValue(
                        detail ?? ({
                          ubicacion: finca.ubicacion ?? null,
                        } as FincaDetail),
                        ["ubicacion_texto", "ubicacion", "ubicacion_finca", "ubicacionFinca"],
                      ) === "-"
                        ? "Ubicación sin definir"
                        : pickDetailValue(
                            detail ?? ({
                              ubicacion: finca.ubicacion ?? null,
                            } as FincaDetail),
                            ["ubicacion_texto", "ubicacion", "ubicacion_finca", "ubicacionFinca"],
                          )}
                    </div>
                    <div className="mt-2 text-[11px] text-[#8B4049]/80">
                      Ver detalles y gestionar cuarteles
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link
                        to={`/fincas/${finca.finca_id ?? finca.id}`}
                        className="rounded border border-[#C9A961]/40 px-2 py-1 text-xs font-semibold text-[#722F37] transition hover:bg-white"
                      >
                        Ver cuarteles
                      </Link>
                      <Link
                        to={`/admin/fincas?edit=${encodeURIComponent(String(finca.finca_id ?? finca.id ?? ""))}`}
                        className="rounded border border-[#C9A961]/40 px-2 py-1 text-xs font-semibold text-[#722F37] transition hover:bg-white"
                      >
                        Editar finca
                      </Link>
                      <button
                        type="button"
                        onClick={() => void onToggleFincaDetail(fincaId)}
                        className="cursor-pointer rounded border border-[#C9A961]/40 px-2 py-1 text-xs font-semibold text-[#722F37] transition hover:bg-white"
                      >
                        {isExpanded ? "Ocultar detalle" : "Ver detalle"}
                      </button>
                    </div>
                    {isExpanded ? (
                      <div className="mt-3 rounded border border-[#C9A961]/30 bg-white px-3 py-2 text-xs text-[#6B3A3F]">
                        {isLoadingDetail ? (
                          <div>Cargando detalle...</div>
                        ) : detailError ? (
                          <div className="text-red-700">{detailError}</div>
                        ) : (
                          <div className="grid gap-1">
                            <div>
                              <span className="font-semibold text-[#3D1B1F]">RUT:</span>{" "}
                              {pickDetailValue(detail, ["rut", "rut_finca", "rutFinca"])}
                            </div>
                            <div>
                              <span className="font-semibold text-[#3D1B1F]">RENSPA:</span>{" "}
                              {pickDetailValue(detail, ["renspa", "renspa_finca", "renspaFinca"])}
                            </div>
                            <div>
                              <span className="font-semibold text-[#3D1B1F]">Catastro:</span>{" "}
                              {pickDetailValue(detail, ["catastro", "catastro_finca", "catastroFinca"])}
                            </div>
                            <div>
                              <span className="font-semibold text-[#3D1B1F]">Ubicación:</span>{" "}
                              {pickDetailValue(detail, [
                                "ubicacion_texto",
                                "ubicacion",
                                "ubicacion_finca",
                                "ubicacionFinca",
                              ])}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : null}
                        </>
                      );
                    })()}
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

      </div>
    </div>
  );
};

export default Fincas;
