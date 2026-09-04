import { Link } from "react-router-dom";
import type { LoteGenealogiaNode } from "../../../features/lotes/api";

const ORIGEN_LABEL: Record<LoteGenealogiaNode["origen"], string> = {
  ingreso: "Ingreso",
  corte: "Corte / blend",
};

/**
 * Se renderiza primero lo que aporta (los `hijos`, que en los datos son los lotes
 * padre) y recién después la caja del nodo actual — así el árbol se lee de arriba
 * hacia abajo como "finca/cuartel de origen → ... → vino final", en vez de al revés.
 */
function Nodo({ nodo, esRaiz }: { nodo: LoteGenealogiaNode; esRaiz: boolean }) {
  const tieneOrigen = nodo.hijos.length > 0;
  return (
    <li className="space-y-1.5">
      {tieneOrigen ? (
        <>
          <ul className="space-y-1.5 border-l border-[color:var(--border-shell)] pl-4">
            {nodo.hijos.map((hijo) => (
              <Nodo key={hijo.lote_id} nodo={hijo} esRaiz={false} />
            ))}
          </ul>
          <div className="pl-4 text-xs text-[color:var(--text-ink-muted)]" aria-hidden>
            ↓
          </div>
        </>
      ) : null}

      <div
        className={`flex flex-wrap items-center gap-2 rounded-[var(--radius-md)] border px-3 py-2 text-sm ${
          esRaiz
            ? "border-[color:var(--accent-primary)] bg-[color:var(--surface-accent-soft)]"
            : "border-[color:var(--border-shell)] bg-[color:var(--surface-soft)]"
        }`}
      >
        {esRaiz ? <span title="Vino final">🍷</span> : null}
        <Link
          to={`/operacion/lotes/${nodo.lote_id}`}
          className="font-semibold text-[color:var(--accent-primary)] hover:underline"
        >
          {nodo.codigo}
        </Link>
        <span className="text-xs text-[color:var(--text-ink-muted)]">{ORIGEN_LABEL[nodo.origen]}</span>
        {!esRaiz && nodo.porcentaje_en_padre !== null ? (
          <span className="rounded-full border border-[color:var(--border-default)] bg-[color:var(--surface-accent-soft)] px-2 py-0.5 text-[11px] font-semibold text-[color:var(--accent-primary)]">
            {Math.round(nodo.porcentaje_en_padre)}%
          </span>
        ) : null}
        {nodo.cuartel ? (
          <span className="text-xs text-[color:var(--text-ink-muted)]">
            🌱 {nodo.cuartel.finca.nombre_finca} · Cuartel {nodo.cuartel.codigo_cuartel}
          </span>
        ) : null}
        {nodo.cius.length > 0 ? (
          <span className="text-xs text-[color:var(--text-ink-muted)]">
            CIU: {nodo.cius.map((c) => c.codigo_ciu).join(", ")}
          </span>
        ) : null}
      </div>
    </li>
  );
}

/**
 * Árbol de genealogía de un lote: arranca en la finca y el cuartel de origen (y su
 * CIU) y va bajando corte a corte hasta este vino, con el % que aportó cada uno.
 */
export default function LoteGenealogiaTree({ nodo }: { nodo: LoteGenealogiaNode }) {
  return (
    <ul className="space-y-1.5">
      <Nodo nodo={nodo} esRaiz />
    </ul>
  );
}
