import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppCard, GuidedState, NoticeBanner, SectionIntro } from "../../components/ui";
import { fetchLotes, type Lote } from "../../features/lotes/api";
import { getApiErrorMessage } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";

const ORIGEN_LABEL: Record<Lote["origen"], string> = {
  ingreso: "Ingreso",
  corte: "Corte / blend",
};

export default function LotesPage() {
  const activeBodegaId = useAuthStore((state) => state.activeBodegaId);
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeBodegaId) return;
    let mounted = true;
    setLoading(true);
    setError(null);
    fetchLotes(String(activeBodegaId))
      .then((data) => {
        if (mounted) setLotes(data);
      })
      .catch((err) => {
        if (mounted) setError(getApiErrorMessage(err));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [activeBodegaId]);

  return (
    <AppCard
      as="section"
      tone="default"
      padding="lg"
      header={(
        <SectionIntro
          title="Lotes"
          description="Lotes de bodega: los de ingreso agrupan CIU del mismo cuartel; los de corte son el resultado de un blend."
        />
      )}
    >
      {!activeBodegaId ? (
        <NoticeBanner tone="danger">Seleccioná una bodega.</NoticeBanner>
      ) : loading ? (
        <NoticeBanner>Cargando…</NoticeBanner>
      ) : error ? (
        <NoticeBanner tone="danger">{error}</NoticeBanner>
      ) : lotes.length === 0 ? (
        <GuidedState
          title="Todavía no hay lotes"
          description="Los lotes se crean desde el flujo de Ingreso de uva (paso 'Enviar a vasija') o al hacer un corte."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {lotes.map((lote) => (
            <Link
              key={lote.lote_id}
              to={`/operacion/lotes/${lote.lote_id}`}
              className="rounded-[var(--radius-lg)] border border-[color:var(--border-shell)] bg-[color:var(--surface-soft)] p-3 transition-all hover:border-[color:var(--border-default)] hover:shadow-[var(--shadow-soft)]"
            >
              <div className="text-sm font-semibold text-[color:var(--text-ink)]">{lote.codigo}</div>
              <div className="mt-1 text-xs text-[color:var(--text-ink-muted)]">
                {ORIGEN_LABEL[lote.origen]}
                {lote.cuartel ? ` · ${lote.cuartel.codigo_cuartel} · ${lote.cuartel.finca.nombre_finca}` : ""}
                {lote.variedad ? ` · ${lote.variedad}` : ""}
              </div>
              <div className="mt-1 text-[11px] text-[color:var(--text-ink-muted)]">
                {lote.lote_origen_recepcion.length > 0
                  ? `${lote.lote_origen_recepcion.length} CIU`
                  : lote.composicion_hijo.length > 0
                    ? `${lote.composicion_hijo.length} lote(s) padre`
                    : "Sin origen registrado"}
              </div>
            </Link>
          ))}
        </div>
      )}
    </AppCard>
  );
}
