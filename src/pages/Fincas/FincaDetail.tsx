import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AppButton, AppCard, NoticeBanner, SectionIntro } from "../../components/ui";
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
        <div className="mx-auto w-full max-w-6xl">
          <NoticeBanner tone="danger" className="p-8">
            Finca no encontrada.
          </NoticeBanner>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary px-6 py-10">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <AppCard as="section" padding="lg">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <SectionIntro
                title={<span className="text-3xl font-bold text-text">{fincaNombre}</span>}
                description="Desde esta vista podés revisar el contexto general de la finca y seguir con la gestión de cuarteles sin mezclar formularios dentro del detalle."
                className="[&>div>p]:max-w-3xl"
              />
              <div className="flex flex-wrap gap-2">
                <div className="rounded-[var(--radius-xl)] border border-[color:var(--border-default)] bg-[color:var(--surface-soft)] px-4 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-secondary)]">
                    Ubicación
                  </div>
                  <div className="mt-1 text-sm font-semibold text-[color:var(--text-ink)]">{fincaUbicacion}</div>
                </div>
                <div className="rounded-[var(--radius-xl)] border border-[color:var(--border-default)] bg-[color:var(--surface-soft)] px-4 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-secondary)]">
                    Cuarteles
                  </div>
                  <div className="mt-1 text-sm font-semibold text-[color:var(--text-ink)]">
                    {loading ? "Cargando..." : `${cuarteles.length} registrados`}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to={`/admin/fincas?edit=${encodeURIComponent(String(id))}`}>
                <AppButton variant="secondary" size="sm">Editar finca</AppButton>
              </Link>
              <Link to={`/admin/cuarteles?fincaId=${encodeURIComponent(String(id))}&create=1`}>
                <AppButton variant="secondary" size="sm">Crear cuartel</AppButton>
              </Link>
              <Link to="/fincas">
                <AppButton variant="secondary" size="sm">Volver a fincas</AppButton>
              </Link>
              <AppButton
                type="button"
                variant="danger"
                size="sm"
                onClick={() => void onDeleteFinca()}
                disabled={deletingFinca}
              >
                {deletingFinca ? "Eliminando..." : "Eliminar finca"}
              </AppButton>
            </div>
          </div>
        </AppCard>

        <AppCard
          as="section"
          padding="lg"
          header={(
            <SectionIntro
              title="Cuarteles de la finca"
              description="Primero revisás el listado y después, si hace falta, editás o creás desde la administración."
              actions={(
                <Link to={`/admin/cuarteles?fincaId=${encodeURIComponent(String(id))}`}>
                  <AppButton variant="secondary" size="sm">Administrar cuarteles</AppButton>
                </Link>
              )}
            />
          )}
        >

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
                      "rounded-full border px-3 py-1 text-xs font-semibold transition-all duration-[var(--motion-fast)] ease-[var(--motion-standard)]",
                      isActive
                        ? "border-[color:var(--accent-primary)] bg-[color:var(--accent-primary)] text-[color:var(--text-primary)]"
                        : "border-[color:var(--border-shell)] bg-[color:var(--action-secondary-bg)] text-[color:var(--text-on-dark)] hover:border-[color:var(--border-default)] hover:bg-[color:var(--action-secondary-hover)]",
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
              <NoticeBanner>Cargando cuarteles…</NoticeBanner>
            ) : error ? (
              <NoticeBanner tone="danger">
                {error}
              </NoticeBanner>
            ) : cuarteles.length === 0 ? (
              <NoticeBanner>
                No hay cuarteles cargados para esta finca.
              </NoticeBanner>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {cuarteles.map((cuartel) => (
                  <AppCard
                    key={cuartel.cuartel_id ?? cuartel.id}
                    as="article"
                    tone="soft"
                    padding="sm"
                    className="bg-[color:var(--surface-soft)]"
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
                              <div className="text-sm font-semibold text-[color:var(--text-ink)]">
                                {cuartel.codigo_cuartel ?? "Cuartel"}
                              </div>
                              <div className="mt-1 text-xs text-[color:var(--text-accent)]">
                                {cuartel.variedad ?? "Variedad sin definir"} ·{" "}
                                {cuartel.superficie_ha ?? "-"} ha
                              </div>
                            </div>
                            <div className="rounded-full border border-[color:var(--border-default)] px-2.5 py-1 text-[11px] font-semibold text-[color:var(--accent-primary)]">
                              {cuartel.cultivo ?? "vid"}
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => void onToggleCuartelDetail(cuartelId)}
                              className="cursor-pointer rounded-[var(--radius-md)] border border-[color:var(--border-shell)] bg-[color:var(--action-secondary-bg)] px-2 py-1 text-xs font-semibold text-[color:var(--text-on-dark)] transition hover:border-[color:var(--border-default)] hover:bg-[color:var(--action-secondary-hover)]"
                            >
                              {isExpanded ? "Ocultar detalle" : "Ver detalle"}
                            </button>
                            <Link
                              to={`/admin/cuarteles?edit=${encodeURIComponent(cuartelId)}&fincaId=${encodeURIComponent(String(id))}`}
                              className="inline-flex"
                            >
                              <AppButton variant="secondary" size="sm">Editar cuartel</AppButton>
                            </Link>
                          </div>

                          {isExpanded ? (
                            <div className="mt-3 rounded-[var(--radius-lg)] border border-[color:var(--border-shell)] bg-[color:var(--surface-muted)] px-3 py-3 text-xs text-[color:var(--text-on-dark-muted)]">
                              {isLoadingDetail ? (
                                <div>Cargando detalle...</div>
                              ) : detailError ? (
                                <NoticeBanner tone="danger">{detailError}</NoticeBanner>
                              ) : (
                                <div className="grid gap-2">
                                  <div>
                                    <span className="font-semibold text-[color:var(--text-ink)]">Código:</span>{" "}
                                    {detail?.codigo_cuartel ?? "-"}
                                  </div>
                                  <div>
                                    <span className="font-semibold text-[color:var(--text-ink)]">Cultivo:</span>{" "}
                                    {detail?.cultivo ?? "-"}
                                  </div>
                                  <div>
                                    <span className="font-semibold text-[color:var(--text-ink)]">Variedad:</span>{" "}
                                    {detail?.variedad ?? "-"}
                                  </div>
                                  <div>
                                    <span className="font-semibold text-[color:var(--text-ink)]">Sistema de riego:</span>{" "}
                                    {detail?.sistema_riego ?? "-"}
                                  </div>
                                  <div>
                                    <span className="font-semibold text-[color:var(--text-ink)]">Superficie:</span>{" "}
                                    {detail?.superficie_ha ?? "-"} ha
                                  </div>
                                  <div>
                                    <span className="font-semibold text-[color:var(--text-ink)]">
                                      Sistema productivo:
                                    </span>{" "}
                                    {detail?.sistema_productivo ?? "-"}
                                  </div>
                                  <div>
                                    <span className="font-semibold text-[color:var(--text-ink)]">
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
                  </AppCard>
                ))}
              </div>
            )}
          </div>

          {actionError ? (
            <NoticeBanner tone="danger" className="mt-4">
              {actionError}
            </NoticeBanner>
          ) : null}
          {actionSuccess ? (
            <NoticeBanner tone="success" className="mt-4">
              {actionSuccess}
            </NoticeBanner>
          ) : null}
        </AppCard>
      </div>
    </div>
  );
};

export default FincaDetail;
