import { useEffect, useState } from "react";
import { NoticeBanner } from "../../../components/ui";
import { fetchComposicionActualVasija, type ComposicionActualVasija } from "../../../features/elaboracion/api";
import { getApiErrorMessage } from "../../../lib/api";

type VasijaComposicionPanelProps = {
  vasijaId: string;
  /** Se dispara con el volumen disponible cada vez que se (re)carga, para validar en el form contenedor. */
  onLoaded?: (volumenDisponibleL: number) => void;
};

/** Panel de solo lectura: qué hay hoy en una vasija y cuánto volumen queda disponible para sacar. */
export default function VasijaComposicionPanel({ vasijaId, onLoaded }: VasijaComposicionPanelProps) {
  const [data, setData] = useState<ComposicionActualVasija | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!vasijaId) {
      setData(null);
      return;
    }
    let mounted = true;
    setLoading(true);
    setError(null);
    fetchComposicionActualVasija(vasijaId)
      .then((result) => {
        if (!mounted) return;
        setData(result);
        onLoaded?.(result.volumen_disponible_l);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vasijaId]);

  if (!vasijaId) return null;

  if (loading) {
    return <NoticeBanner>Consultando volumen disponible…</NoticeBanner>;
  }
  if (error) {
    return <NoticeBanner tone="danger">{error}</NoticeBanner>;
  }
  if (!data) return null;

  return (
    <div className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-accent-soft)] px-3 py-2 text-xs">
      <div className="font-semibold text-[color:var(--text-ink)]">
        Disponible en {data.codigo}: {data.volumen_disponible_l.toLocaleString("es-AR")} l
      </div>
      {data.composicion.length === 0 ? (
        <p className="mt-1 text-[color:var(--text-ink-muted)]">Sin composición registrada todavía.</p>
      ) : (
        <ul className="mt-1 space-y-0.5">
          {data.composicion.map((row) => (
            <li key={row.vasija_contenido_id} className="text-[color:var(--text-ink-muted)]">
              <span className="font-medium text-[color:var(--text-ink)]">{row.lote_codigo}</span>{" "}
              · {row.volumen_l.toLocaleString("es-AR")} l ({Math.round(row.porcentaje)}%)
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
