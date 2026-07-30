import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AppCard,
  AppSelect,
  GuidedState,
  NoticeBanner,
  SectionIntro,
  useAppNotifications,
} from "../../../components/ui";
import {
  fetchComposicionActualVasija,
  listElaboracionResource,
  patchElaboracionResource,
  type ElaboracionEntity,
} from "../../../features/elaboracion/api";
import { VASIJA_TIPOS, VASIJA_USOS, VASIJA_ESTADOS } from "../../../features/elaboracion/vasijaFields";
import { getApiErrorMessage } from "../../../lib/api";

function stringVal(value: unknown, fallback = ""): string {
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "number") return String(value);
  return fallback;
}

function numVal(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function optionLabel(options: readonly { value: string; label: string }[], value: unknown): string {
  const v = stringVal(value);
  if (!v) return "—";
  return options.find((o) => o.value === v)?.label ?? v;
}

function resolveVasijaId(item: ElaboracionEntity): string {
  return stringVal(item.vasija_id ?? item.id_vasija ?? item.id);
}

type VasijaRow = {
  id: string;
  codigo: string;
  tipo: string;
  uso: string;
  etapa: string;
  capacidad: number | null;
  volumen: number | null;
  porcentaje: number;
  lotes: string[];
};

/** Ícono simple de vasija con relleno proporcional al volumen actual sobre la capacidad. */
function TankIcon({ percent, hasData }: { percent: number; hasData: boolean }) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div className="relative h-16 w-11 shrink-0 overflow-hidden rounded-t-[8px] rounded-b-[4px] border-2 border-[color:var(--border-default)] bg-[color:var(--surface-muted)]">
      {hasData ? (
        <div
          className="absolute inset-x-0 bottom-0 bg-[color:var(--color-wine)] transition-all duration-500"
          style={{ height: `${clamped}%` }}
        />
      ) : null}
    </div>
  );
}

type VasijaEstadoPanelProps = {
  bodegaId: string | number | null;
  /** Cambiá este valor (ej. incrementando un contador) para forzar un refetch. */
  refreshKey?: number;
};

/**
 * Vistazo general de "existencias": cuánto vino tiene cada vasija en este momento y en
 * qué etapa está, con acceso rápido para actualizar la etapa sin entrar al detalle.
 */
export default function VasijaEstadoPanel({ bodegaId, refreshKey = 0 }: VasijaEstadoPanelProps) {
  const navigate = useNavigate();
  const { notifySuccess, notifyError } = useAppNotifications();
  const [vasijas, setVasijas] = useState<ElaboracionEntity[]>([]);
  // Volumen real, no una medición manual: sale del ledger de movimientos
  // (VasijaContenido) vía el mismo endpoint que usa el form de trasiego para
  // mostrar "disponible: X l" — así el ícono siempre refleja lo que de verdad
  // se cargó como ingreso/trasiego, sin depender de que alguien haya cargado
  // a mano un registro en "Existencias Vasija" (eso queda para otra cosa:
  // mediciones de laboratorio como grado alcohólico o azúcar residual).
  const [composicionPorVasija, setComposicionPorVasija] = useState<
    Record<string, { volumenDisponibleL: number; lotes: string[] }>
  >({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    if (!bodegaId) {
      setVasijas([]);
      setComposicionPorVasija({});
      return;
    }
    let mounted = true;
    setLoading(true);
    setError(null);
    const bodegaIdStr = String(bodegaId);

    listElaboracionResource("vasijas", { bodegaId: bodegaIdStr })
      .then(async (vasijasData) => {
        if (!mounted) return;
        setVasijas(vasijasData);

        const entries = await Promise.all(
          vasijasData.map(async (v) => {
            const id = resolveVasijaId(v);
            if (!id) return null;
            try {
              const composicion = await fetchComposicionActualVasija(id);
              return [
                id,
                {
                  volumenDisponibleL: composicion.volumen_disponible_l,
                  lotes: composicion.composicion.map((c) => c.lote_codigo),
                },
              ] as const;
            } catch {
              return null;
            }
          }),
        );
        if (!mounted) return;
        setComposicionPorVasija(
          Object.fromEntries(entries.filter((e): e is NonNullable<typeof e> => e !== null)),
        );
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
  }, [bodegaId, refreshKey]);

  const rows = useMemo<VasijaRow[]>(() => {
    return vasijas
      .map((v) => {
        const id = resolveVasijaId(v);
        const composicion = composicionPorVasija[id] ?? null;
        const capacidad = numVal(v.capacidad_litros);
        const volumen = composicion ? composicion.volumenDisponibleL : null;
        const porcentaje =
          capacidad && capacidad > 0 && volumen !== null
            ? Math.max(0, Math.min(100, (volumen / capacidad) * 100))
            : 0;
        return {
          id,
          codigo: stringVal(v.codigo, "Sin código"),
          tipo: optionLabel(VASIJA_TIPOS, v.tipo),
          uso: optionLabel(VASIJA_USOS, v.uso),
          etapa: stringVal(v.etapa),
          capacidad,
          volumen,
          porcentaje,
          lotes: composicion?.lotes ?? [],
        };
      })
      .filter((row) => row.id)
      .sort((a, b) => a.codigo.localeCompare(b.codigo, "es"));
  }, [vasijas, composicionPorVasija]);

  const handleEtapaChange = async (id: string, value: string) => {
    setSavingId(id);
    try {
      await patchElaboracionResource("vasijas", id, { etapa: value });
      setVasijas((prev) =>
        prev.map((v) => (resolveVasijaId(v) === id ? { ...v, etapa: value } : v)),
      );
      notifySuccess({ title: "Etapa actualizada" });
    } catch (err) {
      notifyError({ title: "No se pudo actualizar la etapa", message: getApiErrorMessage(err) });
    } finally {
      setSavingId(null);
    }
  };

  if (!bodegaId) return null;

  return (
    <AppCard
      as="section"
      tone="default"
      padding="lg"
      header={(
        <SectionIntro
          title="Estado de vasijas"
          description="Vistazo rápido de las existencias: cuánto vino tiene cada vasija y en qué etapa está. Tocá una para ver el detalle completo."
        />
      )}
    >
      {loading ? (
        <NoticeBanner>Cargando vasijas…</NoticeBanner>
      ) : error ? (
        <NoticeBanner tone="danger">{error}</NoticeBanner>
      ) : rows.length === 0 ? (
        <GuidedState
          title="Todavía no hay vasijas cargadas"
          description="Creá una vasija en la sección Vasijas para empezar a ver su estado acá."
        />
      ) : (
        <div className="mt-1 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rows.map((row) => (
            <div
              key={row.id}
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/bodega/vasijas/${encodeURIComponent(row.id)}`)}
              onKeyDown={(event) => {
                if (event.key === "Enter") navigate(`/bodega/vasijas/${encodeURIComponent(row.id)}`);
              }}
              className="cursor-pointer rounded-[var(--radius-lg)] border border-[color:var(--border-shell)] bg-[color:var(--surface-soft)] p-3 transition-all duration-[var(--motion-fast)] ease-[var(--motion-standard)] hover:border-[color:var(--border-default)] hover:shadow-[var(--shadow-soft)]"
            >
              <div className="flex gap-3">
                <TankIcon percent={row.porcentaje} hasData={row.volumen !== null} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-[color:var(--text-ink)]">{row.codigo}</div>
                  <div className="truncate text-xs text-[color:var(--text-ink-muted)]">{row.tipo}</div>
                  <div className="mt-1 text-xs">
                    {row.volumen !== null ? (
                      <>
                        <span className="font-semibold text-[color:var(--text-ink)]">
                          {Math.round(row.porcentaje)}%
                        </span>{" "}
                        <span className="text-[color:var(--text-ink-muted)]">
                          · {row.volumen.toLocaleString("es-AR")}
                          {row.capacidad ? ` / ${row.capacidad.toLocaleString("es-AR")}` : ""} l
                        </span>
                      </>
                    ) : (
                      <span className="text-[color:var(--text-ink-muted)]">No se pudo leer el volumen</span>
                    )}
                  </div>
                  {row.lotes.length > 0 ? (
                    <div className="mt-0.5 truncate text-[11px] text-[color:var(--text-ink-muted)]">
                      Lote{row.lotes.length > 1 ? "s" : ""}: {row.lotes.join(", ")}
                    </div>
                  ) : null}
                  {row.uso !== "—" ? (
                    <div className="mt-0.5 truncate text-[11px] text-[color:var(--text-ink-muted)]">
                      Uso: {row.uso}
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="mt-3" onClick={(event) => event.stopPropagation()}>
                <AppSelect
                  uiSize="sm"
                  value={row.etapa}
                  disabled={savingId === row.id}
                  onChange={(event) => void handleEtapaChange(row.id, event.target.value)}
                >
                  <option value="">Etapa: sin definir</option>
                  {VASIJA_ESTADOS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </AppSelect>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppCard>
  );
}
