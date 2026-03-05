import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { Cuartel } from "../../features/cuarteles/api";
import {
  fetchCuartelById,
  fetchCuartelesByFinca,
  patchCuartel,
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
  const [editingCuartelId, setEditingCuartelId] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingFinca, setDeletingFinca] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    codigo_cuartel: "",
    superficie_ha: "",
    cultivo: "",
    variedad: "",
    sistema_productivo: "",
    sistema_conduccion: "",
  });

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

  const onStartEdit = async (cuartelId: string) => {
    if (!cuartelId) return;
    setEditError(null);
    setEditSuccess(null);
    setLoadingDetailId(cuartelId);
    try {
      const detail = await fetchCuartelById(cuartelId);
      setEditingCuartelId(cuartelId);
      setEditForm({
        codigo_cuartel: detail.codigo_cuartel ?? "",
        superficie_ha:
          detail.superficie_ha === undefined || detail.superficie_ha === null
            ? ""
            : String(detail.superficie_ha),
        cultivo: detail.cultivo ?? "",
        variedad: detail.variedad ?? "",
        sistema_productivo: detail.sistema_productivo ?? "",
        sistema_conduccion: detail.sistema_conduccion ?? "",
      });
    } catch (requestError) {
      setEditError(getApiErrorMessage(requestError));
    } finally {
      setLoadingDetailId(null);
    }
  };

  const onSaveEdit = async () => {
    if (!editingCuartelId) return;
    if (!editForm.codigo_cuartel.trim() || !editForm.variedad.trim()) {
      setEditError("Código y variedad son obligatorios.");
      return;
    }
    if (!editForm.superficie_ha || Number.isNaN(Number(editForm.superficie_ha))) {
      setEditError("Superficie válida requerida.");
      return;
    }

    setSavingEdit(true);
    setEditError(null);
    setEditSuccess(null);
    try {
      const updated = await patchCuartel(editingCuartelId, {
        codigo_cuartel: editForm.codigo_cuartel.trim(),
        superficie_ha: Number(editForm.superficie_ha),
        cultivo: editForm.cultivo.trim() || "vid",
        variedad: editForm.variedad.trim(),
        sistema_productivo: editForm.sistema_productivo.trim() || null,
        sistema_conduccion: editForm.sistema_conduccion.trim() || null,
      });

      setCuarteles((prev) =>
        prev.map((item) => {
          const currentId = String(item.cuartel_id ?? item.id ?? "");
          if (currentId !== editingCuartelId) return item;
          return {
            ...item,
            ...updated,
          };
        }),
      );
      setCuartelDetailById((prev) => ({
        ...prev,
        [editingCuartelId]: updated,
      }));
      setEditSuccess("Cuartel actualizado.");
      setEditingCuartelId(null);
    } catch (requestError) {
      setEditError(getApiErrorMessage(requestError));
    } finally {
      setSavingEdit(false);
    }
  };

  const onDeleteFinca = async () => {
    if (!id) return;
    const fincaNombre = finca?.nombre ?? finca?.nombre_finca ?? finca?.name ?? id;
    const ok = window.confirm(`¿Eliminar la finca "${fincaNombre}"?`);
    if (!ok) return;

    setDeletingFinca(true);
    setEditError(null);
    setEditSuccess(null);
    try {
      await deleteFinca(id);
      if (activeBodegaId) {
        await loadFincas(String(activeBodegaId));
      }
      navigate("/fincas", { replace: true });
    } catch (requestError) {
      setEditError(getApiErrorMessage(requestError));
    } finally {
      setDeletingFinca(false);
    }
  };

  if (!id) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F9F6F2] via-[#F3E7DA] to-[#EAD8C6] px-6 py-10">
        <div className="mx-auto w-full max-w-4xl rounded-2xl bg-white/90 p-8 text-sm text-red-700 shadow-lg">
          Finca no encontrada.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F9F6F2] via-[#F3E7DA] to-[#EAD8C6] px-6 py-10">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <div className="rounded-2xl bg-white/90 p-8 shadow-lg">
          <h1 className="text-2xl text-[#3D1B1F]">
            {finca?.nombre ?? finca?.nombre_finca ?? finca?.name ?? "Finca"}
          </h1>
          <p className="mt-2 text-sm text-[#6B3A3F]">
            Desde esta vista gestionás cuarteles y el contexto base para iniciar trazabilidades.
          </p>
          <div className="mt-4 flex gap-2">
            <Link
              to={`/admin/fincas?edit=${encodeURIComponent(String(id))}`}
              className="rounded-lg border border-[#C9A961]/40 px-3 py-2 text-xs font-semibold text-[#722F37] transition hover:border-[#C9A961] hover:bg-[#F8F3EE]"
            >
              Editar finca
            </Link>
            <button
              type="button"
              onClick={() => void onDeleteFinca()}
              disabled={deletingFinca}
              className="rounded-lg border border-red-300 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {deletingFinca ? "Eliminando..." : "Eliminar finca"}
            </button>
            <Link
              to="/setup/cuarteles"
              className="rounded-lg border border-[#C9A961]/40 px-3 py-2 text-xs font-semibold text-[#722F37] transition hover:border-[#C9A961] hover:bg-[#F8F3EE]"
            >
              Crear cuartel
            </Link>
            <Link
              to="/fincas"
              className="rounded-lg border border-[#C9A961]/40 px-3 py-2 text-xs font-semibold text-[#722F37] transition hover:border-[#C9A961] hover:bg-[#F8F3EE]"
            >
              Volver a fincas
            </Link>
          </div>
        </div>

        <div className="rounded-2xl bg-white/90 p-8 shadow-lg">
          <h2 className="text-lg font-semibold text-[#3D1B1F]">Cuarteles de la finca</h2>
          {cuarteles.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
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

          {loading ? (
            <div className="mt-3 text-sm text-[#7A4A50]">Cargando cuarteles…</div>
          ) : error ? (
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : cuarteles.length === 0 ? (
            <div className="mt-3 text-sm text-[#6B3A3F]">No hay cuarteles cargados para esta finca.</div>
          ) : (
            <div className="mt-3 grid gap-2">
              {cuarteles.map((cuartel) => (
                <div
                  key={cuartel.cuartel_id ?? cuartel.id}
                  className="rounded-xl border border-[#C9A961]/30 bg-[#FFF9F0] px-4 py-3"
                >
                  {(() => {
                    const cuartelId = String(cuartel.cuartel_id ?? cuartel.id ?? "");
                    const isExpanded = expandedCuartelId === cuartelId;
                    const detail = cuartelDetailById[cuartelId];
                    const detailError = cuartelDetailErrorById[cuartelId];
                    const isLoadingDetail = loadingDetailId === cuartelId;
                    return (
                      <>
                  <div className="text-sm font-semibold text-[#3D1B1F]">
                    {cuartel.codigo_cuartel ?? "Cuartel"}
                  </div>
                  <div className="text-xs text-[#6B3A3F]">
                    Variedad: {cuartel.variedad ?? "-"} · Superficie: {cuartel.superficie_ha ?? "-"} ha
                  </div>
                  <div className="mt-2">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void onToggleCuartelDetail(cuartelId)}
                        className="cursor-pointer rounded border border-[#C9A961]/40 px-2 py-1 text-xs font-semibold text-[#722F37] transition hover:bg-white"
                      >
                        {isExpanded ? "Ocultar detalle" : "Ver detalle"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void onStartEdit(cuartelId)}
                        className="cursor-pointer rounded border border-[#C9A961]/40 px-2 py-1 text-xs font-semibold text-[#722F37] transition hover:bg-white"
                      >
                        Editar
                      </button>
                    </div>
                  </div>
                  {editingCuartelId === cuartelId ? (
                    <div className="mt-2 rounded border border-[#C9A961]/30 bg-white px-3 py-2 text-xs text-[#6B3A3F]">
                      <div className="grid gap-2 md:grid-cols-2">
                        <input
                          value={editForm.codigo_cuartel}
                          onChange={(event) =>
                            setEditForm((prev) => ({
                              ...prev,
                              codigo_cuartel: event.target.value,
                            }))
                          }
                          placeholder="Código"
                          className="rounded border border-[#C9A961]/40 px-2 py-1 text-xs text-[#3D1B1F]"
                        />
                        <input
                          type="number"
                          step="0.01"
                          value={editForm.superficie_ha}
                          onChange={(event) =>
                            setEditForm((prev) => ({
                              ...prev,
                              superficie_ha: event.target.value,
                            }))
                          }
                          placeholder="Superficie ha"
                          className="rounded border border-[#C9A961]/40 px-2 py-1 text-xs text-[#3D1B1F]"
                        />
                        <input
                          value={editForm.cultivo}
                          onChange={(event) =>
                            setEditForm((prev) => ({
                              ...prev,
                              cultivo: event.target.value,
                            }))
                          }
                          placeholder="Cultivo"
                          className="rounded border border-[#C9A961]/40 px-2 py-1 text-xs text-[#3D1B1F]"
                        />
                        <input
                          value={editForm.variedad}
                          onChange={(event) =>
                            setEditForm((prev) => ({
                              ...prev,
                              variedad: event.target.value,
                            }))
                          }
                          placeholder="Variedad"
                          className="rounded border border-[#C9A961]/40 px-2 py-1 text-xs text-[#3D1B1F]"
                        />
                        <input
                          value={editForm.sistema_productivo}
                          onChange={(event) =>
                            setEditForm((prev) => ({
                              ...prev,
                              sistema_productivo: event.target.value,
                            }))
                          }
                          placeholder="Sistema productivo"
                          className="rounded border border-[#C9A961]/40 px-2 py-1 text-xs text-[#3D1B1F]"
                        />
                        <input
                          value={editForm.sistema_conduccion}
                          onChange={(event) =>
                            setEditForm((prev) => ({
                              ...prev,
                              sistema_conduccion: event.target.value,
                            }))
                          }
                          placeholder="Sistema conducción"
                          className="rounded border border-[#C9A961]/40 px-2 py-1 text-xs text-[#3D1B1F]"
                        />
                      </div>
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => void onSaveEdit()}
                          disabled={savingEdit}
                          className="cursor-pointer rounded border border-[#C9A961]/50 px-2 py-1 text-xs font-semibold text-[#722F37] transition hover:bg-[#FFF9F0] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {savingEdit ? "Guardando..." : "Guardar"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCuartelId(null);
                            setEditError(null);
                          }}
                          className="cursor-pointer rounded border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : null}
                  {isExpanded ? (
                    <div className="mt-2 rounded border border-[#C9A961]/30 bg-white px-3 py-2 text-xs text-[#6B3A3F]">
                      {isLoadingDetail ? (
                        <div>Cargando detalle...</div>
                      ) : detailError ? (
                        <div className="text-red-700">{detailError}</div>
                      ) : (
                        <div className="grid gap-1">
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
                            <span className="font-semibold text-[#3D1B1F]">Sistema productivo:</span>{" "}
                            {detail?.sistema_productivo ?? "-"}
                          </div>
                          <div>
                            <span className="font-semibold text-[#3D1B1F]">Sistema conducción:</span>{" "}
                            {detail?.sistema_conduccion ?? "-"}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : null}
                      </>
                    );
                  })()}
                </div>
              ))}
            </div>
          )}
          {editError ? (
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {editError}
            </div>
          ) : null}
          {editSuccess ? (
            <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {editSuccess}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default FincaDetail;
