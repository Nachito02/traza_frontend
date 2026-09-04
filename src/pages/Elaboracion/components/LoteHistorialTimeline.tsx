import { useState } from "react";
import { Link } from "react-router-dom";
import type { LoteHistorialEvento } from "../../../features/lotes/api";
import { fetchPublicTrazabilidadCuartel, type PublicTrazabilidadCuartel } from "../../../features/public/api";

const TIPO_OPERACION_LABEL: Record<string, string> = {
  ingreso: "Ingreso",
  fermentacion: "Fermentación",
  trasiego: "Trasiego",
  descube: "Descube",
  correccion: "Corrección",
  corte_parcial: "Corte parcial",
};

type Tono = "success" | "warning" | "neutral" | "accent";

const TONE_CLASSES: Record<Tono, { card: string; iconBox: string; label: string }> = {
  success: {
    card: "border-[color:var(--feedback-success-border)] bg-[color:var(--feedback-success-bg)]",
    iconBox: "border-[color:var(--feedback-success-border)] bg-[color:var(--feedback-success-bg)]",
    label: "text-[color:var(--feedback-success-text)]",
  },
  warning: {
    card: "border-[color:var(--feedback-warning-border)] bg-[color:var(--feedback-warning-bg)]",
    iconBox: "border-[color:var(--feedback-warning-border)] bg-[color:var(--feedback-warning-bg)]",
    label: "text-[color:var(--feedback-warning-text)]",
  },
  neutral: {
    card: "border-[color:var(--feedback-neutral-border)] bg-[color:var(--feedback-neutral-bg)]",
    iconBox: "border-[color:var(--feedback-neutral-border)] bg-[color:var(--feedback-neutral-bg)]",
    label: "text-[color:var(--feedback-neutral-text)]",
  },
  accent: {
    card: "border-[color:var(--border-default)] bg-[color:var(--surface-accent-soft)]",
    iconBox: "border-[color:var(--border-default)] bg-[color:var(--surface-accent-soft)]",
    label: "text-[color:var(--accent-primary)]",
  },
};

export type HistorialCuartel = { cuartel_id: string; codigo_cuartel: string; finca: { nombre_finca: string } };

function fmt(fecha: string) {
  return new Date(fecha).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtCorta(fecha: string) {
  return new Date(fecha).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-[color:var(--border-default)] bg-[color:var(--surface-accent-soft)] px-2 py-0.5 text-[11px] font-semibold text-[color:var(--accent-primary)]">
      {children}
    </span>
  );
}

function EventCard({
  icon,
  label,
  tono,
  fecha,
  children,
}: {
  icon: string;
  label: string;
  tono: Tono;
  fecha: string;
  children?: React.ReactNode;
}) {
  const cls = TONE_CLASSES[tono];
  return (
    <li className={`flex gap-3 rounded-[var(--radius-lg)] border px-3.5 py-3 ${cls.card}`}>
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] border text-base ${cls.iconBox}`}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className={`text-[10px] font-bold uppercase tracking-[0.16em] ${cls.label}`}>{label}</span>
          <span className="text-xs text-[color:var(--text-ink-muted)]">{fmt(fecha)}</span>
        </div>
        {children ? <div className="mt-1.5 text-sm text-[color:var(--text-ink)]">{children}</div> : null}
      </div>
    </li>
  );
}

/** Lo que pasó en la finca/cuartel antes de este ingreso — colapsado por default, se trae al desplegar. */
function CampoExpandible({ cuartel }: { cuartel: HistorialCuartel }) {
  const [abierto, setAbierto] = useState(false);
  const [datos, setDatos] = useState<PublicTrazabilidadCuartel | "loading" | "error" | null>(null);

  const toggle = () => {
    setAbierto((v) => !v);
    if (!datos) {
      setDatos("loading");
      fetchPublicTrazabilidadCuartel(cuartel.cuartel_id)
        .then(setDatos)
        .catch(() => setDatos("error"));
    }
  };

  type Item = { fecha: string; el: React.ReactNode };
  const items: Item[] =
    datos && datos !== "loading" && datos !== "error"
      ? [
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
        ].sort((a, b) => (a.fecha < b.fecha ? 1 : -1))
      : [];

  return (
    <div className="mt-2 border-t border-[color:var(--border-shell)] pt-2">
      <button
        type="button"
        onClick={toggle}
        className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-[color:var(--border-default)] bg-[color:var(--surface-muted)] px-2.5 py-1 text-xs font-semibold text-[color:var(--text-ink)] transition-colors hover:border-[color:var(--accent-primary)] hover:text-[color:var(--accent-primary)]"
      >
        🌱 {cuartel.finca.nombre_finca}
        <span className="font-normal text-[color:var(--text-ink-muted)]">· Cuartel {cuartel.codigo_cuartel}</span>
        <span>{abierto ? "▴" : "▾"}</span>
      </button>
      {abierto ? (
        <div className="mt-2">
          {datos === "loading" ? (
            <p className="text-xs text-[color:var(--text-ink-muted)]">Cargando…</p>
          ) : datos === "error" ? (
            <p className="text-xs text-[color:var(--feedback-danger-text)]">No se pudo cargar.</p>
          ) : items.length === 0 ? (
            <p className="text-xs text-[color:var(--text-ink-muted)]">Sin más movimientos registrados en este cuartel.</p>
          ) : (
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
          )}
          <Link
            to={`/trazabilidad/${cuartel.cuartel_id}`}
            className="mt-1.5 inline-block text-xs font-semibold text-[color:var(--accent-primary)] hover:underline"
          >
            Ver página completa del cuartel →
          </Link>
        </div>
      ) : null}
    </div>
  );
}

function Evento({ evento, cuartel }: { evento: LoteHistorialEvento; cuartel: HistorialCuartel | null }) {
  if (evento.kind === "origen_ingreso") {
    return (
      <EventCard icon="🍇" label="Ingreso a bodega" tono="success" fecha={evento.fecha}>
        <ul className="space-y-0.5">
          {evento.recepciones.map((r, i) => (
            <li key={i} className="text-xs text-[color:var(--text-ink-muted)]">
              CIU {r.codigo_ciu ?? "—"} · {fmt(r.fecha_hora)}
              {r.kg_pesados ? ` · ${r.kg_pesados.toLocaleString("es-AR")} kg` : ""}
            </li>
          ))}
        </ul>
        {cuartel ? <CampoExpandible cuartel={cuartel} /> : null}
      </EventCard>
    );
  }

  if (evento.kind === "origen_corte") {
    return (
      <EventCard icon="🔀" label="Corte de origen" tono="warning" fecha={evento.fecha}>
        <div className="flex flex-wrap items-center gap-1.5">
          {evento.objetivo ? (
            <span className="text-xs text-[color:var(--text-ink-muted)]">{evento.objetivo} ·</span>
          ) : null}
          {evento.componentes.map((c) => (
            <Link
              key={c.lote_id}
              to={`/operacion/lotes/${c.lote_id}`}
              title="Ver el historial de este lote de origen"
              className="rounded-full border border-[color:var(--border-default)] bg-[color:var(--surface-accent-soft)] px-2 py-0.5 text-[11px] font-semibold text-[color:var(--accent-primary)] hover:underline"
            >
              {c.lote_codigo} · {Math.round(c.porcentaje)}%
            </Link>
          ))}
        </div>
      </EventCard>
    );
  }

  if (evento.kind === "movimiento_vasija") {
    return (
      <EventCard
        icon="🛢️"
        label={TIPO_OPERACION_LABEL[evento.tipo_operacion ?? ""] ?? "Movimiento en vasija"}
        tono="neutral"
        fecha={evento.fecha}
      >
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[color:var(--text-ink-muted)]">
          <span>
            Vasija <span className="font-medium text-[color:var(--text-ink)]">{evento.vasija_codigo}</span>
          </span>
          <span>{evento.volumen_l.toLocaleString("es-AR")} l</span>
          {evento.responsable ? <span>{evento.responsable}</span> : null}
          <span>{evento.cerrado ? "Ya salió de esta vasija" : "Activo en esta vasija"}</span>
          {evento.observaciones ? <span className="w-full">{evento.observaciones}</span> : null}
        </div>
      </EventCard>
    );
  }

  return (
    <EventCard icon="🔗" label="Usado como componente de un corte" tono="accent" fecha={evento.fecha}>
      <span className="text-xs text-[color:var(--text-ink-muted)]">
        Aportó <Chip>{Math.round(evento.porcentaje)}%</Chip> al lote{" "}
        <span className="font-medium text-[color:var(--text-ink)]">{evento.lote_resultado_codigo}</span>
      </span>
    </EventCard>
  );
}

/** Línea de tiempo de todo lo que le pasó a un lote: origen, movimientos entre vasijas, y si se usó como componente de otro corte. */
export default function LoteHistorialTimeline({
  eventos,
  cuartel = null,
}: {
  eventos: LoteHistorialEvento[];
  /** Cuartel de origen del lote — si se pasa, el evento "Ingreso a bodega" deja desplegar qué pasó antes ahí. */
  cuartel?: HistorialCuartel | null;
}) {
  if (eventos.length === 0) {
    return <p className="text-sm text-[color:var(--text-ink-muted)]">Todavía no hay eventos registrados para este lote.</p>;
  }
  return (
    <ul className="max-h-96 space-y-2 overflow-auto pr-1">
      {eventos.map((evento, i) => (
        <Evento key={i} evento={evento} cuartel={cuartel} />
      ))}
    </ul>
  );
}
