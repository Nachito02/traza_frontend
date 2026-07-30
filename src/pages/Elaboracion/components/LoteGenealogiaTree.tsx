import { Link } from "react-router-dom";
import type { LoteGenealogiaNode } from "../../../features/lotes/api";

const ORIGEN_LABEL: Record<LoteGenealogiaNode["origen"], string> = {
  ingreso: "Ingreso",
  corte: "Corte / blend",
};

function Nodo({ nodo, esRaiz }: { nodo: LoteGenealogiaNode; esRaiz: boolean }) {
  return (
    <li>
      <div className="flex flex-wrap items-center gap-2 rounded-[var(--radius-md)] border border-[color:var(--border-shell)] bg-[color:var(--surface-soft)] px-3 py-2 text-sm">
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
            {nodo.cuartel.codigo_cuartel} · {nodo.cuartel.finca.nombre_finca}
          </span>
        ) : null}
        {nodo.cius.length > 0 ? (
          <span className="text-xs text-[color:var(--text-ink-muted)]">
            CIU: {nodo.cius.map((c) => c.codigo_ciu).join(", ")}
          </span>
        ) : null}
      </div>
      {nodo.hijos.length > 0 ? (
        <ul className="mt-1.5 space-y-1.5 border-l border-[color:var(--border-shell)] pl-4">
          {nodo.hijos.map((hijo) => (
            <Nodo key={hijo.lote_id} nodo={hijo} esRaiz={false} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

/** Árbol de genealogía de un lote: de qué lotes viene (recursivo, hasta los CIU de origen). */
export default function LoteGenealogiaTree({ nodo }: { nodo: LoteGenealogiaNode }) {
  return (
    <ul className="space-y-1.5">
      <Nodo nodo={nodo} esRaiz />
    </ul>
  );
}
