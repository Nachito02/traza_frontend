import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppButton, AppCard, GuidedState, NoticeBanner, SectionIntro } from "../../components/ui";
import {
  fetchFincaById,
  type Finca,
} from "../../features/fincas/api";
import { useAuthStore } from "../../store/authStore";
import { useFincasStore } from "../../features/fincas/store";
import { resolveModuleAccess } from "../../lib/permissions";

// ── Sub-componente ─────────────────────────────────────────────────────────

type FincaCardProps = {
  finca: Finca;
  canManage: boolean;
};

function FincaCard({ finca, canManage }: FincaCardProps) {
  const navigate = useNavigate();
  const fincaId = String(finca.finca_id ?? finca.id ?? "");

  const ubicacion = (() => {
    const src = finca as Record<string, unknown>;
    for (const key of ["ubicacion_texto", "ubicacion", "ubicacion_finca", "ubicacionFinca"]) {
      const val = src[key];
      if (typeof val === "string" && val.trim()) return val;
    }
    return null;
  })();

  return (
    <AppCard
      as="article"
      tone="interactive"
      padding="sm"
      className="cursor-pointer bg-[color:var(--surface-soft)] transition-all hover:shadow-[var(--shadow-raised)]"
      onClick={() => navigate(`/fincas/${encodeURIComponent(fincaId)}`)}
    >
      <div className="font-semibold text-[color:var(--text-ink)]">
        {finca.nombre_finca ?? "Finca sin nombre"}
      </div>
      <div className="mt-1 text-xs text-[color:var(--text-ink-muted)]">
        {ubicacion ?? "Ubicación sin definir"}
      </div>

      <div
        className="mt-3 flex flex-wrap gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        <Link to={`/fincas/${encodeURIComponent(fincaId)}`} className="inline-flex">
          <AppButton variant="primary" size="sm">Ver detalle</AppButton>
        </Link>
        {canManage && (
          <Link
            to={`/admin/fincas?edit=${encodeURIComponent(fincaId)}`}
            className="inline-flex"
          >
            <AppButton variant="secondary" size="sm">Editar</AppButton>
          </Link>
        )}
      </div>
    </AppCard>
  );
}

// ── Página ─────────────────────────────────────────────────────────────────

const Fincas = () => {
  const user = useAuthStore((state) => state.user);
  const activeBodegaId = useAuthStore((state) => state.activeBodegaId);
  const fincasFromStore = useFincasStore((state) => state.fincas);
  const fincasLoading = useFincasStore((state) => state.loading);
  const fincasError = useFincasStore((state) => state.error);
  const loadFincas = useFincasStore((state) => state.loadFincas);

  const access = resolveModuleAccess(user, activeBodegaId);
  const canManage = access.canAccessBodega;

  // Fallback: operarios que no pueden listar todas las fincas
  // pero sí pueden leer las que tienen asignadas por perfil.
  const userFincaIds = useMemo(() => {
    const anyUser = user as { fincas?: Array<{ finca_id?: string | number }> } | null;
    return (anyUser?.fincas ?? [])
      .map((f) => String(f.finca_id ?? ""))
      .filter(Boolean);
  }, [user]);

  const [fallbackFincas, setFallbackFincas] = useState<Finca[]>([]);
  const [fallbackLoading, setFallbackLoading] = useState(false);

  const loadFallbackFincas = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;
    setFallbackLoading(true);
    try {
      const results = await Promise.allSettled(ids.map((id) => fetchFincaById(id)));
      setFallbackFincas(
        results
          .filter((r): r is PromiseFulfilledResult<Finca> => r.status === "fulfilled")
          .map((r) => r.value),
      );
    } finally {
      setFallbackLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!activeBodegaId) return;
    void loadFincas(activeBodegaId);
  }, [activeBodegaId, loadFincas]);

  useEffect(() => {
    if (fincasLoading) return;
    if (fincasFromStore.length > 0) return;
    void loadFallbackFincas(userFincaIds);
  }, [fincasLoading, fincasFromStore.length, userFincaIds, loadFallbackFincas]);

  const fincas = fincasFromStore.length > 0 ? fincasFromStore : fallbackFincas;
  const isLoading = fincasLoading || fallbackLoading;

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-secondary px-6 py-10">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <AppCard
          as="section"
          padding="lg"
          header={(
            <SectionIntro
              eyebrow="Campo"
              title="Fincas"
              description={canManage ? "Fincas vinculadas a la bodega activa." : "Fincas asignadas a tu perfil."}
              actions={canManage ? (
                <Link to="/setup/finca">
                  <AppButton variant="primary" size="sm">Crear finca</AppButton>
                </Link>
              ) : undefined}
            />
          )}
        >
          {!activeBodegaId ? (
            <GuidedState
              title="Seleccioná una bodega para ver las fincas"
              description="Las fincas se vinculan a la bodega activa. Elegí el contexto para continuar."
              action={(
                <Link to="/contexto">
                  <AppButton variant="primary" size="sm">Elegir bodega</AppButton>
                </Link>
              )}
            />
          ) : isLoading ? (
            <NoticeBanner>Cargando fincas…</NoticeBanner>
          ) : fincasError ? (
            <NoticeBanner tone="danger">{fincasError}</NoticeBanner>
          ) : fincas.length === 0 ? (
            canManage ? (
              <GuidedState
                title="Todavía no hay fincas cargadas"
                description="Para planificar trabajo de campo y vincular cuarteles, primero cargá la finca base de esta bodega."
                action={(
                  <Link to="/setup/finca">
                    <AppButton variant="primary" size="sm">Crear primera finca</AppButton>
                  </Link>
                )}
              />
            ) : (
              <GuidedState
                title="No tenés fincas asignadas todavía"
                description="Un encargado de bodega debe vincularte a una finca antes de que puedas operar desde acá."
              />
            )
          ) : (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {fincas.map((finca) => (
                <FincaCard
                  key={finca.finca_id ?? finca.id ?? finca.nombre_finca}
                  finca={finca}
                  canManage={canManage}
                />
              ))}
            </div>
          )}
        </AppCard>
      </div>
    </div>
  );
};

export default Fincas;
