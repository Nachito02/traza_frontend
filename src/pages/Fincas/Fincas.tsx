import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppButton, AppCard, GuidedState, NoticeBanner, SectionIntro } from "../../components/ui";
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
      <div className="mx-auto w-full max-w-6xl space-y-8">
        <SectionIntro
          title="Administración de fincas"
          description="Supervisa y gestiona tus fincas."
        />

        <AppCard
          as="section"
          padding="lg"
          header={(
            <SectionIntro
              title="Fincas"
              description="Administración de fincas."
              actions={(
                <Link to="/setup/finca">
                  <AppButton variant="secondary" size="sm">Crear finca</AppButton>
                </Link>
              )}
            />
          )}
        >

          <div className="mt-4">
            {!activeBodegaId ? (
              <GuidedState
                title="Seleccioná una bodega para administrar fincas"
                description="Las fincas se vinculan a la bodega activa. Elegí el contexto para ver, editar o cargar nuevas fincas."
                action={(
                  <Link to="/contexto">
                    <AppButton variant="primary" size="sm">Elegir bodega</AppButton>
                  </Link>
                )}
                steps={[
                  { label: "Bodega activa", done: false },
                  { label: "Fincas disponibles", done: false },
                ]}
              />
            ) : fincasLoading ? (
              <NoticeBanner>Cargando fincas…</NoticeBanner>
            ) : fincasError ? (
              <NoticeBanner tone="danger">{fincasError}</NoticeBanner>
            ) : fincas.length === 0 ? (
              <GuidedState
                title="Todavía no hay fincas cargadas"
                description="Para planificar trabajo de campo y vincular cuarteles, primero cargá la finca base de esta bodega."
                action={(
                  <Link to="/setup/finca">
                    <AppButton variant="primary" size="sm">Crear primera finca</AppButton>
                  </Link>
                )}
                steps={[
                  { label: "Bodega activa", done: true },
                  { label: "Primera finca", done: false },
                ]}
              />
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {fincas.map((finca) => (
                  <AppCard
                    key={finca.finca_id ?? finca.id ?? finca.nombre}
                    as="article"
                    tone="interactive"
                    padding="sm"
                    className="cursor-pointer bg-[color:var(--surface-soft)]"
                    onClick={() =>
                      navigate(`/fincas/${encodeURIComponent(String(finca.finca_id ?? finca.id ?? ""))}`)
                    }
                  >
                    {(() => {
                      const fincaId = String(finca.finca_id ?? finca.id ?? "");
                      const detail = finca as FincaDetail;
                      return (
                        <>
                          <div className="text-sm font-semibold text-[color:var(--text-ink)]">
                            {finca.nombre ??
                              finca.nombre_finca ??
                              finca.name ??
                              "Finca sin nombre"}
                          </div>
                          <div className="mt-1 text-xs text-[color:var(--text-ink-muted)]">
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
                          <div className="mt-2 text-[11px] text-[color:var(--text-accent)]/80">
                            Ver detalles y gestionar cuarteles
                          </div>
                          <div
                            className="mt-3 flex flex-wrap gap-2"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <Link
                              to={`/fincas/${encodeURIComponent(fincaId)}`}
                              className="inline-flex"
                            >
                              <AppButton variant="secondary" size="sm">Ver detalle</AppButton>
                            </Link>
                            <Link
                              to={`/admin/fincas?edit=${encodeURIComponent(String(finca.finca_id ?? finca.id ?? ""))}`}
                              className="inline-flex"
                            >
                              <AppButton variant="secondary" size="sm">Editar finca</AppButton>
                            </Link>
                            <AppButton
                              type="button"
                              variant="danger"
                              size="sm"
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
                            >
                              {deletingFincaId === fincaId
                                ? "Eliminando..."
                                : "Eliminar finca"}
                            </AppButton>
                          </div>
                        </>
                      );
                    })()}
                  </AppCard>
                ))}
              </div>
            )}
            {fincaActionError ? (
              <NoticeBanner tone="danger" className="mt-3">
                {fincaActionError}
              </NoticeBanner>
            ) : null}
            {fincaActionMessage ? (
              <NoticeBanner tone="success" className="mt-3">
                {fincaActionMessage}
              </NoticeBanner>
            ) : null}
          </div>
        </AppCard>
      </div>
    </div>
  );
};

export default Fincas;
