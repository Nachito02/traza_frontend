import { useEffect, useMemo, useState } from "react";
import { AppButton, AppCard, NoticeBanner, useAppNotifications } from "../../../components/ui";
import {
  crearLote,
  descargarLoteCiusExport,
  fetchLotes,
  fetchRecepcionesParaLote,
  type Lote,
  type RecepcionPendienteLote,
} from "../../../features/lotes/api";
import { getApiErrorMessage } from "../../../lib/api";
import { useCampaniaStore } from "../../../store/campaniaStore";

type LoteSelectorPanelProps = {
  bodegaId: string;
  onLoteReady: (lote: { lote_id: string; codigo: string }) => void;
  /** Se dispara cuando el usuario elige seguir al paso de enviar a vasija. */
  onContinuarAVasija: () => void;
};

type GrupoCuartel = {
  cuartelId: string;
  cuartelCodigo: string;
  fincaNombre: string;
  pendientes: RecepcionPendienteLote[];
  sinCiu: RecepcionPendienteLote[];
  enLote: RecepcionPendienteLote[];
};

/** `recepciones` ya viene ordenada de más reciente a más vieja, así que el orden de
 * inserción en el Map ya refleja "el cuartel con actividad más reciente primero". */
function agruparPorCuartel(recepciones: RecepcionPendienteLote[]): GrupoCuartel[] {
  const grupos = new Map<string, GrupoCuartel>();
  for (const r of recepciones) {
    const cuartelId = r.remito_uva.cuartel_id;
    let grupo = grupos.get(cuartelId);
    if (!grupo) {
      grupo = {
        cuartelId,
        cuartelCodigo: r.remito_uva.cuartel?.codigo_cuartel ?? "?",
        fincaNombre: r.remito_uva.finca?.nombre_finca ?? "?",
        pendientes: [],
        sinCiu: [],
        enLote: [],
      };
      grupos.set(cuartelId, grupo);
    }
    if (r.lote_origen_recepcion) {
      grupo.enLote.push(r);
    } else if (r.ciu) {
      grupo.pendientes.push(r);
    } else {
      grupo.sinCiu.push(r);
    }
  }
  return Array.from(grupos.values());
}

function formatFecha(fecha: string) {
  return new Date(fecha).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Arma un Lote de bodega: junta 1+ recepciones/CIU en un lote. Muestra TODOS los
 * ingresos cargados (más recientes primero, agrupados por cuartel) y deja
 * seleccionar cualquier combinación de una sola vez — si mezclan cuarteles, el
 * backend lo rechaza con un mensaje claro (esa es la única regla real, no hace
 * falta pre-restringir la UI). No depende de "el ingreso actual del wizard": ese
 * contexto se pierde apenas se navega manualmente entre pasos, así que este panel
 * siempre trabaja a nivel bodega, con la lista completa fresca en cada visita.
 * Una vez creado el lote, ofrece descargar el .txt para el INV ahí mismo, antes de
 * pasar al siguiente paso (elegir a qué vasija va).
 */
export default function LoteSelectorPanel({ bodegaId, onLoteReady, onContinuarAVasija }: LoteSelectorPanelProps) {
  const activeCampaniaId = useCampaniaStore((state) => state.activeCampaniaId);
  const { notifyError, notifySuccess } = useAppNotifications();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recepciones, setRecepciones] = useState<RecepcionPendienteLote[]>([]);
  const [lotesArmados, setLotesArmados] = useState<Lote[]>([]);
  const [seleccionadas, setSeleccionadas] = useState<Set<string>>(new Set());
  const [loteCreado, setLoteCreado] = useState<Lote | null>(null);
  const [creando, setCreando] = useState(false);
  const [descargando, setDescargando] = useState(false);

  useEffect(() => {
    if (!bodegaId) return;
    let mounted = true;
    setLoading(true);
    setError(null);

    Promise.all([fetchRecepcionesParaLote({ bodegaId }), fetchLotes(bodegaId)])
      .then(([recs, lotes]) => {
        if (!mounted) return;
        setRecepciones(recs);
        // Se muestran todos, no solo los que nunca recibieron nada — un lote puede
        // repartirse entre varias vasijas a lo largo de más de una visita a este panel.
        setLotesArmados(lotes);
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
  }, [bodegaId]);

  const grupos = useMemo(() => agruparPorCuartel(recepciones), [recepciones]);

  const toggle = (id: string) => {
    setSeleccionadas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirmar = async () => {
    if (!activeCampaniaId) {
      notifyError({ title: "Elegí una campaña activa arriba para poder armar el lote" });
      return;
    }
    if (seleccionadas.size === 0) {
      notifyError({ title: "Elegí al menos un ingreso para armar el lote" });
      return;
    }
    setCreando(true);
    try {
      const lote = await crearLote({
        bodegaId,
        campaniaId: activeCampaniaId,
        recepcionBodegaIds: Array.from(seleccionadas),
      });
      notifySuccess({ title: "Lote creado", message: lote.codigo });
      onLoteReady({ lote_id: lote.lote_id, codigo: lote.codigo });
      setLoteCreado(lote);
    } catch (err) {
      notifyError({ title: "No se pudo crear el lote", message: getApiErrorMessage(err) });
    } finally {
      setCreando(false);
    }
  };

  const handleDescargar = async (lote: Lote) => {
    setDescargando(true);
    try {
      await descargarLoteCiusExport(lote.lote_id, lote.codigo);
    } catch (err) {
      notifyError({ title: "No se pudo generar el archivo", message: getApiErrorMessage(err) });
    } finally {
      setDescargando(false);
    }
  };

  const handleUsarLote = (lote: Lote) => {
    onLoteReady({ lote_id: lote.lote_id, codigo: lote.codigo });
    setLoteCreado(lote);
  };

  if (loading) {
    return (
      <AppCard padding="lg">
        <NoticeBanner>Buscando ingresos cargados…</NoticeBanner>
      </AppCard>
    );
  }
  if (error) {
    return (
      <AppCard padding="lg">
        <NoticeBanner tone="danger">{error}</NoticeBanner>
      </AppCard>
    );
  }

  if (loteCreado) {
    return (
      <AppCard padding="lg" header={<h3 className="text-base font-semibold">Lote de bodega</h3>}>
        <NoticeBanner tone="success">
          Lote <strong>{loteCreado.codigo}</strong> armado con {loteCreado.lote_origen_recepcion.length}{" "}
          recepción(es).
        </NoticeBanner>
        <div className="mt-3 flex flex-wrap gap-2">
          <AppButton
            type="button"
            variant="secondary"
            loading={descargando}
            onClick={() => void handleDescargar(loteCreado)}
          >
            Generar archivo para el INV
          </AppButton>
          <AppButton type="button" variant="primary" onClick={onContinuarAVasija}>
            Continuar a vasija
          </AppButton>
        </div>
      </AppCard>
    );
  }

  return (
    <div className="space-y-3">
      {lotesArmados.length > 0 ? (
        <AppCard padding="lg" header={<h3 className="text-base font-semibold">Lotes ya armados</h3>}>
          <ul className="space-y-2">
            {lotesArmados.map((lote) => (
              <li
                key={lote.lote_id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-md)] border border-[color:var(--border-shell)] bg-[color:var(--surface-soft)] px-3 py-2 text-sm"
              >
                <span>
                  <span className="font-medium text-[color:var(--text-ink)]">{lote.codigo}</span>{" "}
                  <span className="text-[color:var(--text-ink-muted)]">
                    · {lote.lote_origen_recepcion.length} recepción(es)
                    {lote.variedad ? ` · ${lote.variedad}` : ""}
                    {lote._count.vasija_contenido > 0 ? " · ya tiene volumen en vasija" : " · sin enviar a vasija"}
                  </span>
                </span>
                <AppButton type="button" variant="secondary" size="sm" onClick={() => handleUsarLote(lote)}>
                  Usar este lote
                </AppButton>
              </li>
            ))}
          </ul>
        </AppCard>
      ) : null}

    <AppCard padding="lg" header={<h3 className="text-base font-semibold">Armar lote de bodega</h3>}>
      <p className="text-sm text-[color:var(--text-ink-muted)]">
        Todos los ingresos cargados, más recientes primero y agrupados por cuartel. Elegí los que
        quieras — tienen que ser del mismo cuartel para poder armar el lote.
      </p>

      {!activeCampaniaId ? (
        <NoticeBanner tone="warning" className="mt-3">
          No hay una campaña activa seleccionada arriba — hace falta para generar el código del lote.
        </NoticeBanner>
      ) : null}

      {grupos.length === 0 ? (
        <NoticeBanner className="mt-3">Todavía no hay ningún ingreso cargado.</NoticeBanner>
      ) : null}

      <div className="mt-3 space-y-3">
        {grupos.map((grupo) => (
          <details
            key={grupo.cuartelId}
            open
            className="rounded-[var(--radius-md)] border border-[color:var(--border-shell)] bg-[color:var(--surface-soft)] px-3 py-2"
          >
            <summary className="cursor-pointer text-sm font-semibold text-[color:var(--text-ink)]">
              {grupo.cuartelCodigo} · {grupo.fincaNombre}
            </summary>

            <ul className="mt-2 space-y-2">
              {grupo.pendientes.map((r) => {
                const checked = seleccionadas.has(r.recepcion_bodega_id);
                return (
                  <li
                    key={r.recepcion_bodega_id}
                    className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[color:var(--border-shell)] bg-[color:var(--surface-card)] px-3 py-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(r.recepcion_bodega_id)}
                      className="h-4 w-4"
                    />
                    <span className="flex-1">
                      <span className="font-medium text-[color:var(--text-ink)]">
                        CIU {r.ciu?.codigo_ciu ?? "—"}
                      </span>{" "}
                      <span className="text-[color:var(--text-ink-muted)]">
                        · {formatFecha(r.fecha_hora)}
                        {r.kg_pesados ? ` · ${r.kg_pesados} kg` : ""}
                      </span>
                    </span>
                  </li>
                );
              })}

              {grupo.sinCiu.map((r) => (
                <li
                  key={r.recepcion_bodega_id}
                  className="flex items-center gap-3 rounded-[var(--radius-md)] border border-dashed border-[color:var(--border-shell)] px-3 py-2 text-sm opacity-60"
                >
                  <input type="checkbox" checked={false} disabled className="h-4 w-4" />
                  <span className="flex-1">
                    <span className="text-[color:var(--text-ink-muted)]">
                      {formatFecha(r.fecha_hora)}
                      {r.kg_pesados ? ` · ${r.kg_pesados} kg` : ""} · falta registrar el CIU
                    </span>
                  </span>
                </li>
              ))}

              {grupo.pendientes.length === 0 && grupo.sinCiu.length === 0 ? (
                <li className="text-xs text-[color:var(--text-ink-muted)]">
                  Sin ingresos pendientes en este cuartel.
                </li>
              ) : null}
            </ul>

            {grupo.enLote.length > 0 ? (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-[color:var(--text-ink-muted)]">
                  {grupo.enLote.length} ya en un lote
                </summary>
                <ul className="mt-1 space-y-1">
                  {grupo.enLote.map((r) => (
                    <li
                      key={r.recepcion_bodega_id}
                      className="rounded-[var(--radius-md)] bg-[color:var(--surface-muted)] px-3 py-1.5 text-xs text-[color:var(--text-ink-muted)]"
                    >
                      {formatFecha(r.fecha_hora)} · CIU {r.ciu?.codigo_ciu ?? "—"} · lote{" "}
                      {r.lote_origen_recepcion?.lote.codigo ?? "?"}
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </details>
        ))}
      </div>

      <div className="mt-4">
        <AppButton type="button" variant="primary" loading={creando} onClick={() => void handleConfirmar()}>
          Confirmar lote ({seleccionadas.size})
        </AppButton>
      </div>
      </AppCard>
    </div>
  );
}
