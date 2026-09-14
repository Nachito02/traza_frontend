import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { LoteGenealogiaNode } from "../../../features/lotes/api";
import { fetchPublicTrazabilidadCuartel, type PublicTrazabilidadCuartel } from "../../../features/public/api";

const ORIGEN_LABEL: Record<LoteGenealogiaNode["origen"], string> = {
  ingreso: "Ingreso",
  corte: "Corte / blend",
};

const COL_WIDTH = 210;
const ROW_HEIGHT = 120;
const NODE_WIDTH = 188;
const NODE_HEIGHT = 74;

type PositionedOrigen = {
  kind: "origen";
  id: string;
  x: number;
  row: number;
  cuartel: NonNullable<LoteGenealogiaNode["cuartel"]>;
  cius: LoteGenealogiaNode["cius"];
};
type PositionedLote = {
  kind: "lote";
  id: string;
  x: number;
  row: number;
  esRaiz: boolean;
  node: LoteGenealogiaNode;
};
type PositionedNode = PositionedOrigen | PositionedLote;
type Edge = { from: PositionedNode; to: PositionedNode; pct: number | null };

/**
 * Cada finca/cuartel de origen es su propia línea (fila 0, arriba), separada del
 * lote que salió de ahí (una fila más abajo) — así se ve como una línea que
 * arranca en el viñedo. Cada corte junta las líneas que le aportan en un mismo
 * punto, una fila más abajo que la más profunda de sus fuentes, hasta el vino final.
 */
function layoutTree(root: LoteGenealogiaNode) {
  const nodes: PositionedNode[] = [];
  const edges: Edge[] = [];
  let nextX = 0;

  function visit(node: LoteGenealogiaNode, esRaiz: boolean): PositionedLote {
    if (node.hijos.length === 0) {
      const x = nextX;
      nextX += 1;
      let loteRow = 0;
      if (node.cuartel) {
        const origen: PositionedOrigen = {
          kind: "origen",
          id: `origen-${node.lote_id}`,
          x,
          row: 0,
          cuartel: node.cuartel,
          cius: node.cius,
        };
        nodes.push(origen);
        loteRow = 1;
        const lote: PositionedLote = { kind: "lote", id: node.lote_id, x, row: loteRow, esRaiz, node };
        nodes.push(lote);
        edges.push({ from: origen, to: lote, pct: null });
        return lote;
      }
      const lote: PositionedLote = { kind: "lote", id: node.lote_id, x, row: loteRow, esRaiz, node };
      nodes.push(lote);
      return lote;
    }

    const hijosPosicionados = node.hijos.map((hijo) => visit(hijo, false));
    const x = hijosPosicionados.reduce((acc, h) => acc + h.x, 0) / hijosPosicionados.length;
    const row = 1 + Math.max(...hijosPosicionados.map((h) => h.row));
    const lote: PositionedLote = { kind: "lote", id: node.lote_id, x, row, esRaiz, node };
    nodes.push(lote);
    for (const hijo of hijosPosicionados) {
      edges.push({ from: hijo, to: lote, pct: hijo.node.porcentaje_en_padre });
    }
    return lote;
  }

  visit(root, true);
  const maxCol = nodes.reduce((acc, n) => Math.max(acc, n.x), 0);
  const maxRow = nodes.reduce((acc, n) => Math.max(acc, n.row), 0);
  return { nodes, edges, maxCol, maxRow };
}

function centerX(n: PositionedNode) {
  return n.x * COL_WIDTH + NODE_WIDTH / 2;
}
function topY(n: PositionedNode) {
  return n.row * ROW_HEIGHT;
}
function bottomY(n: PositionedNode) {
  return n.row * ROW_HEIGHT + NODE_HEIGHT;
}

function EdgePath({ edge }: { edge: Edge }) {
  const x1 = centerX(edge.from);
  const y1 = bottomY(edge.from);
  const x2 = centerX(edge.to);
  const y2 = topY(edge.to);
  const curva = Math.max(24, (y2 - y1) / 2);
  const d = `M ${x1} ${y1} C ${x1} ${y1 + curva}, ${x2} ${y2 - curva}, ${x2} ${y2}`;
  return (
    <>
      <path d={d} fill="none" stroke="var(--border-default)" strokeWidth={1.5} />
      {edge.pct !== null ? (
        <g transform={`translate(${(x1 + x2) / 2}, ${(y1 + y2) / 2})`}>
          <rect x={-18} y={-9} width={36} height={18} rx={9} fill="var(--surface-accent-soft)" stroke="var(--border-default)" />
          <text x={0} y={4} textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--accent-primary)">
            {Math.round(edge.pct)}%
          </text>
        </g>
      ) : null}
    </>
  );
}

/** Label corto para mostrar en las "migas" de navegación del panel. */
function labelDe(n: PositionedNode): string {
  return n.kind === "origen" ? `🌱 ${n.cuartel.finca.nombre_finca}` : n.node.codigo;
}

function BoxShell({
  seleccionado,
  tono,
  style,
  onClick,
  children,
}: {
  seleccionado: boolean;
  tono: "origen" | "lote" | "raiz";
  style: React.CSSProperties;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const base =
    tono === "origen"
      ? "border-dashed border-[color:var(--border-default)] bg-[color:var(--surface-muted)]"
      : tono === "raiz"
        ? "border-[color:var(--accent-primary)] bg-[color:var(--surface-accent-soft)]"
        : "border-[color:var(--border-shell)] bg-[color:var(--surface-soft)]";
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={`absolute flex cursor-pointer flex-col justify-center gap-0.5 rounded-[var(--radius-md)] border px-2.5 py-2 text-left text-xs outline-none transition-shadow ${base} ${
        seleccionado ? "shadow-[0_0_0_2px_var(--accent-primary)]" : ""
      }`}
      style={style}
    >
      {children}
    </div>
  );
}

function OrigenBox({ positioned, seleccionado, onSelect }: { positioned: PositionedOrigen; seleccionado: boolean; onSelect: () => void }) {
  const style: React.CSSProperties = {
    left: positioned.x * COL_WIDTH,
    top: positioned.row * ROW_HEIGHT,
    width: NODE_WIDTH,
    minHeight: NODE_HEIGHT,
  };
  return (
    <BoxShell seleccionado={seleccionado} tono="origen" style={style} onClick={onSelect}>
      <Link
        to={`/trazabilidad/${positioned.cuartel.cuartel_id}`}
        onClick={(e) => e.stopPropagation()}
        target="_blank"
        rel="noopener noreferrer"
        title="Ver la vista pública de este cuartel"
        className="truncate font-semibold text-[color:var(--accent-primary)] hover:underline"
      >
        🌱 {positioned.cuartel.finca.nombre_finca}
      </Link>
      <div className="text-[color:var(--text-ink-muted)]">Cuartel {positioned.cuartel.codigo_cuartel}</div>
      {positioned.cius.length > 0 ? (
        <div className="truncate text-[color:var(--text-ink-muted)]">
          CIU: {positioned.cius.map((c) => c.codigo_ciu).join(", ")}
        </div>
      ) : null}
    </BoxShell>
  );
}

function LoteBox({ positioned, seleccionado, onSelect }: { positioned: PositionedLote; seleccionado: boolean; onSelect: () => void }) {
  const { node, esRaiz } = positioned;
  const style: React.CSSProperties = {
    left: positioned.x * COL_WIDTH,
    top: positioned.row * ROW_HEIGHT,
    width: NODE_WIDTH,
    minHeight: NODE_HEIGHT,
  };
  return (
    <BoxShell seleccionado={seleccionado} tono={esRaiz ? "raiz" : "lote"} style={style} onClick={onSelect}>
      <div className="flex items-center gap-1.5">
        {esRaiz ? <span title="Vino final">🍷</span> : null}
        <Link
          to={`/lote/${node.lote_id}`}
          onClick={(e) => e.stopPropagation()}
          target="_blank"
          rel="noopener noreferrer"
          title="Ver la vista pública de este lote"
          className="truncate font-semibold text-[color:var(--accent-primary)] hover:underline"
        >
          {node.codigo}
        </Link>
      </div>
      <div className="text-[color:var(--text-ink-muted)]">{ORIGEN_LABEL[node.origen]}</div>
    </BoxShell>
  );
}

function fmtCorta(fecha: string) {
  return new Date(fecha).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

/** Todo lo demás que pasó en ese cuartel (no solo lo que terminó en este lote), para seguir la pista. */
function TimelineCuartel({ datos }: { datos: PublicTrazabilidadCuartel | "loading" | "error" }) {
  if (datos === "loading") return <p className="text-xs text-[color:var(--text-ink-muted)]">Cargando…</p>;
  if (datos === "error") return <p className="text-xs text-[color:var(--feedback-danger-text)]">No se pudo cargar.</p>;

  type Item = { fecha: string; el: React.ReactNode };
  const items: Item[] = [
    ...datos.remitos_uva.map((r) => ({
      fecha: r.salida_finca,
      el: (
        <>
          <span className="font-semibold text-[color:var(--feedback-success-text)]">🚛 Remito</span>{" "}
          {fmtCorta(r.salida_finca)}
          {r.kg_declarados ? ` · ${r.kg_declarados.toLocaleString("es-AR")} kg` : ""}
        </>
      ),
    })),
    ...datos.cius.map((c) => ({
      fecha: c.emitido_at,
      el: (
        <>
          <span className="font-semibold text-[color:var(--accent-primary)]">📋 CIU {c.codigo_ciu}</span>{" "}
          {fmtCorta(c.emitido_at)}
        </>
      ),
    })),
    ...datos.tareas.map((t) => ({
      fecha: t.updated_at || t.created_at,
      el: (
        <>
          <span className="font-semibold text-[color:var(--feedback-neutral-text)]">🌿 {t.titulo}</span>{" "}
          {fmtCorta(t.updated_at || t.created_at)}
        </>
      ),
    })),
  ].sort((a, b) => (a.fecha < b.fecha ? 1 : -1));

  if (items.length === 0) {
    return <p className="text-xs text-[color:var(--text-ink-muted)]">Sin más movimientos registrados en este cuartel.</p>;
  }

  return (
    <ul className="max-h-56 space-y-1 overflow-auto">
      {items.map((item, i) => (
        <li
          key={i}
          className="rounded-[var(--radius-sm)] border border-[color:var(--border-shell)] bg-[color:var(--surface-soft)] px-2.5 py-1.5 text-xs text-[color:var(--text-ink-muted)]"
        >
          {item.el}
        </li>
      ))}
    </ul>
  );
}

/** Diagrama de flujo: un carril por cada finca/cuartel de origen, convergiendo en cada corte hasta el vino final. */
export default function LoteGenealogiaDiagram({ nodo }: { nodo: LoteGenealogiaNode }) {
  const { nodes, edges, maxCol, maxRow } = layoutTree(nodo);
  const width = (maxCol + 1) * COL_WIDTH;
  const height = (maxRow + 1) * ROW_HEIGHT;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [datosPorCuartel, setDatosPorCuartel] = useState<
    Record<string, PublicTrazabilidadCuartel | "loading" | "error">
  >({});

  // A qué nodo apunta cada uno (su "siguiente"), y qué nodos apuntan a cada uno (sus "anteriores") — para poder ir saltando de caja en caja desde el panel.
  const { siguientePorId, anterioresPorId } = useMemo(() => {
    const siguiente = new Map<string, PositionedNode>();
    const anteriores = new Map<string, PositionedNode[]>();
    for (const edge of edges) {
      siguiente.set(edge.from.id, edge.to);
      const arr = anteriores.get(edge.to.id) ?? [];
      arr.push(edge.from);
      anteriores.set(edge.to.id, arr);
    }
    return { siguientePorId: siguiente, anterioresPorId: anteriores };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodo]);

  const seleccionado = nodes.find((n) => n.id === selectedId) ?? null;

  useEffect(() => {
    if (seleccionado?.kind !== "origen") return;
    const cuartelId = seleccionado.cuartel.cuartel_id;
    if (datosPorCuartel[cuartelId]) return;
    setDatosPorCuartel((prev) => ({ ...prev, [cuartelId]: "loading" }));
    fetchPublicTrazabilidadCuartel(cuartelId)
      .then((data) => setDatosPorCuartel((prev) => ({ ...prev, [cuartelId]: data })))
      .catch(() => setDatosPorCuartel((prev) => ({ ...prev, [cuartelId]: "error" })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seleccionado]);

  const siguiente = seleccionado ? siguientePorId.get(seleccionado.id) : undefined;
  const anteriores = seleccionado ? (anterioresPorId.get(seleccionado.id) ?? []) : [];

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <div className="relative" style={{ width, height: height - (ROW_HEIGHT - NODE_HEIGHT) }}>
          <svg width={width} height={height} className="pointer-events-none absolute left-0 top-0">
            {edges.map((edge, i) => (
              <EdgePath key={i} edge={edge} />
            ))}
          </svg>
          {nodes.map((positioned) =>
            positioned.kind === "origen" ? (
              <OrigenBox
                key={positioned.id}
                positioned={positioned}
                seleccionado={selectedId === positioned.id}
                onSelect={() => setSelectedId(positioned.id)}
              />
            ) : (
              <LoteBox
                key={positioned.id}
                positioned={positioned}
                seleccionado={selectedId === positioned.id}
                onSelect={() => setSelectedId(positioned.id)}
              />
            ),
          )}
        </div>
      </div>

      {seleccionado ? (
        <div className="rounded-[var(--radius-lg)] border border-[color:var(--border-shell)] bg-[color:var(--surface-soft)] p-3">
          {seleccionado.kind === "origen" ? (
            <>
              <div className="mb-2 flex items-center justify-between gap-2">
                <Link
                  to={`/trazabilidad/${seleccionado.cuartel.cuartel_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-[color:var(--accent-primary)] hover:underline"
                >
                  🌱 {seleccionado.cuartel.finca.nombre_finca} · Cuartel {seleccionado.cuartel.codigo_cuartel} →
                </Link>
              </div>
              <TimelineCuartel datos={datosPorCuartel[seleccionado.cuartel.cuartel_id] ?? "loading"} />
            </>
          ) : (
            <div className="mb-2 flex items-center gap-2">
              {seleccionado.esRaiz ? <span title="Vino final">🍷</span> : null}
              <Link
                to={`/lote/${seleccionado.node.lote_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-[color:var(--accent-primary)] hover:underline"
              >
                {seleccionado.node.codigo} →
              </Link>
              <span className="text-xs text-[color:var(--text-ink-muted)]">
                {ORIGEN_LABEL[seleccionado.node.origen]}
              </span>
            </div>
          )}

          {/* Vecinos — para seguir navegando de caja en caja sin volver al diagrama */}
          {anteriores.length > 0 || siguiente ? (
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-[color:var(--border-shell)] pt-2">
              {anteriores.length > 0 ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[color:var(--text-ink-muted)]">
                    Viene de
                  </span>
                  {anteriores.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setSelectedId(a.id)}
                      className="rounded-full border border-[color:var(--border-default)] bg-[color:var(--surface-accent-soft)] px-2 py-0.5 text-[11px] font-semibold text-[color:var(--accent-primary)] hover:underline"
                    >
                      {labelDe(a)}
                    </button>
                  ))}
                </div>
              ) : null}
              {siguiente ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[color:var(--text-ink-muted)]">
                    Sigue en
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedId(siguiente.id)}
                    className="rounded-full border border-[color:var(--border-default)] bg-[color:var(--surface-accent-soft)] px-2 py-0.5 text-[11px] font-semibold text-[color:var(--accent-primary)] hover:underline"
                  >
                    {labelDe(siguiente)}
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : (
        <p className="text-xs text-[color:var(--text-ink-muted)]">Tocá una caja del diagrama para ver el detalle.</p>
      )}
    </div>
  );
}
