import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { Cuartel } from "../../features/cuarteles/api";
import {
  fetchCuartelById,
  fetchCuartelesByFinca,
} from "../../features/cuarteles/api";
import { deleteFinca } from "../../features/fincas/api";
import { useFincasStore } from "../../features/fincas/store";
import { getApiErrorMessage } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";

const FincaDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const activeBodegaId = useAuthStore((state) => state.activeBodegaId);
  const fincas = useFincasStore((state) => state.fincas);
  const loadFincas = useFincasStore((state) => state.loadFincas);
  const finca = fincas.find((item) => item.finca_id === id || item.id === id);

  const [cuarteles, setCuarteles] = useState<Cuartel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCuartelId, setExpandedCuartelId] = useState<string | null>(null);
  const [cuartelDetailById, setCuartelDetailById] = useState<Record<string, Cuartel>>({});
  const [cuartelDetailErrorById, setCuartelDetailErrorById] = useState<Record<string, string>>(
    {},
  );
  const [loadingDetailId, setLoadingDetailId] = useState<string | null>(null);
  const [deletingFinca, setDeletingFinca] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fincaNombre = finca?.nombre ?? finca?.nombre_finca ?? finca?.name ?? "Finca";
  const fincaUbicacion = useMemo(() => {
    const detail = finca as Record<string, unknown> | undefined;
    const keys = ["ubicacion_texto", "ubicacion", "ubicacion_finca", "ubicacionFinca"];
    for (const key of keys) {
      const value = detail?.[key];
      if (typeof value === "string" && value.trim()) return value;
    }
    return "Ubicación sin definir";
  }, [finca]);

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    setLoading(true);
    setError(null);

    fetchCuartelesByFinca(id)
      .then((data) => {
        if (!mounted) return;
        setCuarteles(data ?? []);
      })
      .catch(() => {
        if (!mounted) return;
        setError("No se pudieron cargar los cuarteles de la finca.");
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [id]);

  const onToggleCuartelDetail = async (cuartelId: string) => {
    if (!cuartelId) return;
    if (expandedCuartelId === cuartelId) {
      setExpandedCuartelId(null);
      return;
    }

    setExpandedCuartelId(cuartelId);
    if (cuartelDetailById[cuartelId]) return;

    setLoadingDetailId(cuartelId);
    setCuartelDetailErrorById((prev) => ({ ...prev, [cuartelId]: "" }));
    try {
      const detail = await fetchCuartelById(cuartelId);
      setCuartelDetailById((prev) => ({ ...prev, [cuartelId]: detail }));
    } catch (requestError) {
      setCuartelDetailErrorById((prev) => ({
        ...prev,
        [cuartelId]: getApiErrorMessage(requestError),
      }));
    } finally {
      setLoadingDetailId(null);
    }
  };

  const onOpenCuartelTag = async (cuartelId: string) => {
    if (!cuartelId) return;
    setExpandedCuartelId(cuartelId);
    if (cuartelDetailById[cuartelId]) return;

    setLoadingDetailId(cuartelId);
    setCuartelDetailErrorById((prev) => ({ ...prev, [cuartelId]: "" }));
    try {
      const detail = await fetchCuartelById(cuartelId);
      setCuartelDetailById((prev) => ({ ...prev, [cuartelId]: detail }));
    } catch (requestError) {
      setCuartelDetailErrorById((prev) => ({
        ...prev,
        [cuartelId]: getApiErrorMessage(requestError),
      }));
    } finally {
      setLoadingDetailId(null);
    }
  };

  const onDeleteFinca = async () => {
    if (!id) return;
    const ok = window.confirm(`¿Eliminar la finca "${fincaNombre}"?`);
    if (!ok) return;

    setDeletingFinca(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      await deleteFinca(id);
      if (activeBodegaId) {
        await loadFincas(String(activeBodegaId));
      }
      navigate("/fincas", { replace: true });
    } catch (requestError) {
      setActionError(getApiErrorMessage(requestError));
    } finally {
      setDeletingFinca(false);
    }
  };

  if (!id) {
    return (
      <div className="min-h-screen bg-secondary px-6 py-10">
        <div className="mx-auto w-full max-w-6xl rounded-2xl border border-red-200 bg-red-50 p-8 text-sm text-red-700 shadow-lg">
          Finca no encontrada.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary px-6 py-10">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <section className="rounded-2xl bg-primary p-6 shadow-lg">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8B5E34]">
                  Finca
                </p>
                <h1 className="text-3xl font-bold text-text">{fincaNombre}</h1>
                <p className="mt-2 max-w-3xl text-sm text-text-secondary">
                  Desde esta vista podés revisar el contexto general de la finca y seguir con la
                  gestión de cuarteles sin mezclar formularios dentro del detalle.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="rounded-xl border border-[#C9A961]/30 bg-[#FFF9F0] px-4 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8B5E34]">
                    Ubicación
                  </div>
                  <div className="mt-1 text-sm font-semibold text-[#3D1B1F]">{fincaUbicacion}</div>
                </div>
                <div className="rounded-xl border border-[#C9A961]/30 bg-[#FFF9F0] px-4 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8B5E34]">
                    Cuarteles
                  </div>
                  <div className="mt-1 text-sm font-semibold text-[#3D1B1F]">
                    {loading ? "Cargando..." : `${cuarteles.length} registrados`}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                to={`/admin/fincas?edit=${encodeURIComponent(String(id))}`}
                className="rounded-lg border border-[#C9A961]/40 px-3 py-2 text-xs font-semibold text-text transition hover:bg-primary"
              >
                Editar finca
              </Link>
              <Link
                to={`/admin/cuarteles?fincaId=${encodeURIComponent(String(id))}&create=1`}
                className="rounded-lg border border-[#C9A961]/40 px-3 py-2 text-xs font-semibold text-text transition hover:bg-primary"
              >
                Crear cuartel
              </Link>
              <Link
                to="/fincas"
                className="rounded-lg border border-[#C9A961]/40 px-3 py-2 text-xs font-semibold text-text transition hover:bg-primary"
              >
                Volver a fincas
              </Link>
              <button
                type="button"
                onClick={() => void onDeleteFinca()}
                disabled={deletingFinca}
                className="rounded-lg border border-red-300 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deletingFinca ? "Eliminando..." : "Eliminar finca"}
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-2xl bg-primary p-6 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-text">Cuarteles de la finca</h2>
              <p className="text-xs text-text-secondary">
                Primero revisás el listado y después, si hace falta, editás o creás desde la
                administración.
              </p>
            </div>
            <Link
              to={`/admin/cuarteles?fincaId=${encodeURIComponent(String(id))}`}
              className="rounded-lg border border-[#C9A961]/40 px-3 py-2 text-xs font-semibold text-text transition hover:bg-primary"
            >
              Administrar cuarteles
            </Link>
          </div>

          {cuarteles.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {cuarteles.map((cuartel) => {
                const cuartelId = String(cuartel.cuartel_id ?? cuartel.id ?? "");
                const isActive = expandedCuartelId === cuartelId;
                return (
                  <button
                    key={`tag-${cuartelId}`}
                    type="button"
                    onClick={() => void onOpenCuartelTag(cuartelId)}
                    className={[
                      "rounded-full border px-3 py-1 text-xs font-semibold transition",
                      isActive
                        ? "border-[#722F37] bg-[#722F37] text-[#FFF9F0]"
                        : "border-[#C9A961]/50 bg-[#FFF9F0] text-[#722F37] hover:bg-white",
                    ].join(" ")}
                  >
                    {cuartel.codigo_cuartel ?? "Cuartel"}
                  </button>
                );
              })}
            </div>
          ) : null}

          <div className="mt-4">
            {loading ? (
              <div className="text-sm text-[#7A4A50]">Cargando cuarteles…</div>
            ) : error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            ) : cuarteles.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#C9A961]/40 bg-[#FFF9F0] px-4 py-5 text-sm text-[#6B3A3F]">
                No hay cuarteles cargados para esta finca.
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {cuarteles.map((cuartel) => (
                  <article
                    key={cuartel.cuartel_id ?? cuartel.id}
                    className="rounded-xl border border-[#C9A961]/30 bg-[#FFF9F0] p-4"
                  >
                    {(() => {
                      const cuartelId = String(cuartel.cuartel_id ?? cuartel.id ?? "");
                      const isExpanded = expandedCuartelId === cuartelId;
                      const detail = cuartelDetailById[cuartelId];
                      const detailError = cuartelDetailErrorById[cuartelId];
                      const isLoadingDetail = loadingDetailId === cuartelId;
                      return (
                        <>
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-sm font-semibold text-[#3D1B1F]">
                                {cuartel.codigo_cuartel ?? "Cuartel"}
                              </div>
                              <div className="mt-1 text-xs text-[#6B3A3F]">
                                {cuartel.variedad ?? "Variedad sin definir"} ·{" "}
                                {cuartel.superficie_ha ?? "-"} ha
                              </div>
                            </div>
                            <div className="rounded-full border border-[#C9A961]/40 px-2.5 py-1 text-[11px] font-semibold text-[#722F37]">
                              {cuartel.cultivo ?? "vid"}
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => void onToggleCuartelDetail(cuartelId)}
                              className="cursor-pointer rounded border border-[#C9A961]/40 px-2 py-1 text-xs font-semibold text-[#722F37] transition hover:bg-white"
                            >
                              {isExpanded ? "Ocultar detalle" : "Ver detalle"}
                            </button>
                            <Link
                              to={`/admin/cuarteles?edit=${encodeURIComponent(cuartelId)}&fincaId=${encodeURIComponent(String(id))}`}
                              className="rounded border border-[#C9A961]/40 px-2 py-1 text-xs font-semibold text-[#722F37] transition hover:bg-white"
                            >
                              Editar cuartel
                            </Link>
                          </div>

                          {isExpanded ? (
                            <div className="mt-3 rounded-xl border border-[#C9A961]/30 bg-white px-3 py-3 text-xs text-[#6B3A3F]">
                              {isLoadingDetail ? (
                                <div>Cargando detalle...</div>
                              ) : detailError ? (
                                <div className="text-red-700">{detailError}</div>
                              ) : (
                                <div className="grid gap-2">
                                  <div>
                                    <span className="font-semibold text-[#3D1B1F]">Código:</span>{" "}
                                    {detail?.codigo_cuartel ?? "-"}
                                  </div>
                                  <div>
                                    <span className="font-semibold text-[#3D1B1F]">Cultivo:</span>{" "}
                                    {detail?.cultivo ?? "-"}
                                  </div>
                                  <div>
                                    <span className="font-semibold text-[#3D1B1F]">Variedad:</span>{" "}
                                    {detail?.variedad ?? "-"}
                                  </div>
                                  <div>
                                    <span className="font-semibold text-[#3D1B1F]">Superficie:</span>{" "}
                                    {detail?.superficie_ha ?? "-"} ha
                                  </div>
                                  <div>
                                    <span className="font-semibold text-[#3D1B1F]">
                                      Sistema productivo:
                                    </span>{" "}
                                    {detail?.sistema_productivo ?? "-"}
                                  </div>
                                  <div>
                                    <span className="font-semibold text-[#3D1B1F]">
                                      Sistema conducción:
                                    </span>{" "}
                                    {detail?.sistema_conduccion ?? "-"}
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

          {actionError ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {actionError}
            </div>
          ) : null}
          {actionSuccess ? (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {actionSuccess}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
};

export default FincaDetail;
