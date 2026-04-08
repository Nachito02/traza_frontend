import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  deleteFinca,
  type Finca as FincaDetail,
} from "../../features/fincas/api";
import { useAuthStore } from "../../store/authStore";
import { useFincasStore } from "../../features/fincas/store";
import { getApiErrorMessage } from "../../lib/api";

const Fincas = () => {
  const activeBodegaId = useAuthStore((state) => state.activeBodegaId);
  const fincas = useFincasStore((state) => state.fincas);
  const fincasLoading = useFincasStore((state) => state.loading);
  const fincasError = useFincasStore((state) => state.error);
  const loadFincas = useFincasStore((state) => state.loadFincas);
  const navigate = useNavigate();
  const [fincaActionError, setFincaActionError] = useState<string | null>(null);
  const [fincaActionMessage, setFincaActionMessage] = useState<string | null>(
    null,
  );
  const [deletingFincaId, setDeletingFincaId] = useState<string | null>(null);

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

  const onDeleteFinca = async (fincaId: string, fincaNombre: string) => {
    if (!fincaId) return;
    const ok = window.confirm(`¿Eliminar la finca "${fincaNombre}"?`);
    if (!ok) return;
    setDeletingFincaId(fincaId);
    setFincaActionError(null);
    setFincaActionMessage(null);
    try {
      await deleteFinca(fincaId);
      setFincaActionMessage("Finca eliminada correctamente.");
      await loadFincas(String(activeBodegaId));
    } catch (error) {
      setFincaActionError(getApiErrorMessage(error));
    } finally {
      setDeletingFincaId(null);
    }
  };

  return (
    <div className="min-h-screen bg-secondary px-6 py-10">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text">
            Administracion de fincas
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            Supervisa y gestiona tus fincas.
          </p>
        </div>

        <section className="mb-8 rounded-2xl  bg-primary p-6 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-text">Fincas</h2>
              <p className="text-xs text-text">
                Administración de fincas.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to="/setup/finca"
                className="rounded-lg border border-[#C9A961]/40 px-3 py-2 text-xs font-semibold text-text transition hover:bg-primary"
              >
                Crear finca
              </Link>
            </div>
          </div>

          <div className="mt-4">
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
                    className="cursor-pointer rounded-xl border border-[#C9A961]/30 bg-[#FFF9F0] p-4 transition hover:bg-white"
                    onClick={() =>
                      navigate(`/fincas/${encodeURIComponent(String(finca.finca_id ?? finca.id ?? ""))}`)
                    }
                  >
                    {(() => {
                      const fincaId = String(finca.finca_id ?? finca.id ?? "");
                      const detail = finca as FincaDetail;
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
                              detail ??
                                ({
                                  ubicacion: finca.ubicacion ?? null,
                                } as FincaDetail),
                              [
                                "ubicacion_texto",
                                "ubicacion",
                                "ubicacion_finca",
                                "ubicacionFinca",
                              ],
                            ) === "-"
                              ? "Ubicación sin definir"
                              : pickDetailValue(
                                  detail ??
                                    ({
                                      ubicacion: finca.ubicacion ?? null,
                                    } as FincaDetail),
                                  [
                                    "ubicacion_texto",
                                    "ubicacion",
                                    "ubicacion_finca",
                                    "ubicacionFinca",
                                  ],
                                )}
                          </div>
                          <div className="mt-2 text-[11px] text-[#8B4049]/80">
                            Ver detalles y gestionar cuarteles
                          </div>
                          <div
                            className="mt-3 flex flex-wrap gap-2"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <Link
                              to={`/fincas/${encodeURIComponent(fincaId)}`}
                              className="rounded border border-[#C9A961]/40 px-2 py-1 text-xs font-semibold text-[#722F37] transition hover:bg-white"
                            >
                              Ver detalle
                            </Link>
                            <Link
                              to={`/admin/fincas?edit=${encodeURIComponent(String(finca.finca_id ?? finca.id ?? ""))}`}
                              className="rounded border border-[#C9A961]/40 px-2 py-1 text-xs font-semibold text-[#722F37] transition hover:bg-white"
                            >
                              Editar finca
                            </Link>
                            <button
                              type="button"
                              disabled={deletingFincaId === fincaId}
                              onClick={() =>
                                void onDeleteFinca(
                                  fincaId,
                                  String(
                                    finca.nombre ??
                                      finca.nombre_finca ??
                                      finca.name ??
                                      fincaId,
                                  ),
                                )
                              }
                              className="cursor-pointer rounded border border-red-300 px-2 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {deletingFincaId === fincaId
                                ? "Eliminando..."
                                : "Eliminar finca"}
                            </button>
                          </div>
                        </>
                      );
                    })()}
                  </article>
                ))}
              </div>
            )}
            {fincaActionError ? (
              <div className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {fincaActionError}
              </div>
            ) : null}
            {fincaActionMessage ? (
              <div className="mt-3 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                {fincaActionMessage}
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Fincas;
