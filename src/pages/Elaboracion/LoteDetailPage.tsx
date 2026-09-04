import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AppButton,
  AppCard,
  AppInput,
  AppModal,
  AppTextarea,
  NoticeBanner,
  SectionIntro,
  useAppNotifications,
} from "../../components/ui";
import {
  deleteLote,
  descargarLoteCiusExport,
  fetchImpactoBorradoLote,
  fetchLote,
  fetchLoteGenealogia,
  fetchLoteHistorial,
  updateLote,
  type CiuContribucion,
  type ImpactoBorradoLote,
  type Lote,
  type LoteGenealogiaNode,
  type LoteHistorialEvento,
} from "../../features/lotes/api";
import { getApiErrorMessage } from "../../lib/api";
import LoteGenealogiaDiagram from "./components/LoteGenealogiaDiagram";
import LoteGenealogiaTree from "./components/LoteGenealogiaTree";
import LoteHistorialTimeline from "./components/LoteHistorialTimeline";

const ORIGEN_LABEL: Record<Lote["origen"], string> = {
  ingreso: "Ingreso",
  corte: "Corte / blend",
};

export default function LoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { notifyError, notifySuccess } = useAppNotifications();
  const [lote, setLote] = useState<Lote | null>(null);
  const [genealogia, setGenealogia] = useState<LoteGenealogiaNode | null>(null);
  const [cius, setCius] = useState<CiuContribucion[]>([]);
  const [historial, setHistorial] = useState<LoteHistorialEvento[]>([]);
  const [vistaGenealogia, setVistaGenealogia] = useState<"diagrama" | "lista">("diagrama");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportando, setExportando] = useState(false);

  const [editing, setEditing] = useState(false);
  const [editValues, setEditValues] = useState({ codigo: "", variedad: "", observaciones: "" });
  const [guardando, setGuardando] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [impacto, setImpacto] = useState<ImpactoBorradoLote | null>(null);
  const [impactoLoading, setImpactoLoading] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    setLoading(true);
    setError(null);
    Promise.all([fetchLote(id), fetchLoteGenealogia(id), fetchLoteHistorial(id)])
      .then(([loteData, genealogiaData, historialData]) => {
        if (!mounted) return;
        setLote(loteData);
        setGenealogia(genealogiaData.genealogia);
        setCius(genealogiaData.cius);
        setHistorial(historialData);
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
  }, [id]);

  const handleExport = async () => {
    if (!lote) return;
    setExportando(true);
    try {
      await descargarLoteCiusExport(lote.lote_id, lote.codigo);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setExportando(false);
    }
  };

  const startEdit = () => {
    if (!lote) return;
    setEditValues({
      codigo: lote.codigo,
      variedad: lote.variedad ?? "",
      observaciones: lote.observaciones ?? "",
    });
    setEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!lote) return;
    setGuardando(true);
    try {
      const updated = await updateLote(lote.lote_id, {
        codigo: editValues.codigo,
        variedad: editValues.variedad,
        observaciones: editValues.observaciones,
      });
      setLote(updated);
      setEditing(false);
      notifySuccess({ title: "Lote actualizado" });
    } catch (err) {
      notifyError({ title: "No se pudo guardar", message: getApiErrorMessage(err) });
    } finally {
      setGuardando(false);
    }
  };

  const openDeleteConfirm = () => {
    if (!lote) return;
    setConfirmDelete(true);
    setImpacto(null);
    setImpactoLoading(true);
    fetchImpactoBorradoLote(lote.lote_id)
      .then(setImpacto)
      .catch(() => setImpacto(null))
      .finally(() => setImpactoLoading(false));
  };

  const handleConfirmDelete = async () => {
    if (!lote) return;
    setEliminando(true);
    try {
      await deleteLote(lote.lote_id);
      notifySuccess({ title: "Lote eliminado" });
      navigate("/operacion/lotes");
    } catch (err) {
      notifyError({ title: "No se pudo eliminar", message: getApiErrorMessage(err) });
      setEliminando(false);
    }
  };

  if (!id) {
    return (
      <div className="min-h-screen bg-secondary px-6 py-10">
        <div className="mx-auto w-full max-w-4xl">
          <NoticeBanner tone="danger">Lote no encontrado.</NoticeBanner>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary px-6 py-10">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/operacion/lotes">
            <AppButton variant="ghost" size="sm">← Volver a lotes</AppButton>
          </Link>
        </div>

        {loading ? (
          <NoticeBanner>Cargando…</NoticeBanner>
        ) : error ? (
          <NoticeBanner tone="danger">{error}</NoticeBanner>
        ) : lote ? (
          <>
            <AppCard as="section" tone="default" padding="lg">
              <SectionIntro
                title={lote.codigo}
                description={[
                  ORIGEN_LABEL[lote.origen],
                  lote.cuartel ? `${lote.cuartel.codigo_cuartel} · ${lote.cuartel.finca.nombre_finca}` : null,
                  lote.variedad,
                  lote.campania?.nombre,
                ]
                  .filter(Boolean)
                  .join(" · ")}
                actions={(
                  <div className="flex flex-wrap gap-2">
                    <AppButton variant="primary" size="sm" loading={exportando} onClick={() => void handleExport()}>
                      Exportar CIU (para INV)
                    </AppButton>
                    <AppButton variant="secondary" size="sm" onClick={startEdit}>
                      Editar
                    </AppButton>
                    <AppButton variant="danger" size="sm" onClick={openDeleteConfirm}>
                      Eliminar
                    </AppButton>
                  </div>
                )}
              />
              {lote.observaciones ? (
                <p className="mt-3 text-sm text-[color:var(--text-ink-muted)]">{lote.observaciones}</p>
              ) : null}
            </AppCard>

            <AppCard
              as="section"
              tone="default"
              padding="lg"
              header={(
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-base font-semibold">Genealogía</h3>
                  <div className="flex gap-2">
                    <AppButton
                      type="button"
                      variant={vistaGenealogia === "diagrama" ? "primary" : "secondary"}
                      size="sm"
                      onClick={() => setVistaGenealogia("diagrama")}
                    >
                      Diagrama
                    </AppButton>
                    <AppButton
                      type="button"
                      variant={vistaGenealogia === "lista" ? "primary" : "secondary"}
                      size="sm"
                      onClick={() => setVistaGenealogia("lista")}
                    >
                      Lista
                    </AppButton>
                  </div>
                </div>
              )}
            >
              <p className="mb-3 text-xs text-[color:var(--text-ink-muted)]">
                De arriba hacia abajo: la finca y el cuartel de origen (con su CIU), bajando corte a corte
                hasta este vino. El % es el aporte de cada lote a lo que se armó con él.
              </p>
              {genealogia ? (
                vistaGenealogia === "diagrama" ? (
                  <LoteGenealogiaDiagram nodo={genealogia} />
                ) : (
                  <LoteGenealogiaTree nodo={genealogia} />
                )
              ) : null}
            </AppCard>

            <AppCard
              as="section"
              tone="default"
              padding="lg"
              header={<h3 className="text-base font-semibold">Historial</h3>}
            >
              <p className="mb-3 text-xs text-[color:var(--text-ink-muted)]">
                Todo lo que le pasó a este lote: origen, movimientos entre vasijas, y si se usó como
                componente de otro corte.
              </p>
              <LoteHistorialTimeline eventos={historial} cuartel={lote.cuartel} />
            </AppCard>

            <AppCard
              as="section"
              tone="default"
              padding="lg"
              header={<h3 className="text-base font-semibold">CIU de origen</h3>}
            >
              {cius.length === 0 ? (
                <p className="text-sm text-[color:var(--text-ink-muted)]">Sin CIU asociados todavía.</p>
              ) : (
                <ul className="space-y-1.5">
                  {cius.map((c) => (
                    <li
                      key={c.ciu_id}
                      className="flex items-center justify-between rounded-[var(--radius-md)] border border-[color:var(--border-shell)] bg-[color:var(--surface-soft)] px-3 py-2 text-sm"
                    >
                      <span className="font-medium text-[color:var(--text-ink)]">CIU {c.codigo_ciu}</span>
                      <span className="text-xs text-[color:var(--text-ink-muted)]">
                        vía {c.lote_codigo} · {c.porcentaje_efectivo.toFixed(1)}% del producto
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </AppCard>
          </>
        ) : null}
      </div>

      <AppModal
        opened={editing}
        onClose={() => setEditing(false)}
        title="Editar lote"
        size="sm"
        footer={(
          <div className="flex justify-end gap-2">
            <AppButton type="button" variant="secondary" size="sm" onClick={() => setEditing(false)}>
              Cancelar
            </AppButton>
            <AppButton type="button" variant="primary" size="sm" loading={guardando} onClick={() => void handleSaveEdit()}>
              Guardar
            </AppButton>
          </div>
        )}
      >
        <div className="space-y-3">
          <AppInput
            label="Código"
            value={editValues.codigo}
            onChange={(e) => setEditValues((v) => ({ ...v, codigo: e.target.value }))}
          />
          <AppInput
            label="Variedad"
            value={editValues.variedad}
            onChange={(e) => setEditValues((v) => ({ ...v, variedad: e.target.value }))}
          />
          <AppTextarea
            label="Observaciones"
            value={editValues.observaciones}
            onChange={(e) => setEditValues((v) => ({ ...v, observaciones: e.target.value }))}
          />
        </div>
      </AppModal>

      <AppModal
        opened={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="¿Eliminar este lote?"
        size="sm"
        footer={(
          <div className="flex justify-end gap-2">
            <AppButton type="button" variant="secondary" size="sm" onClick={() => setConfirmDelete(false)}>
              Cancelar
            </AppButton>
            <AppButton
              type="button"
              variant="danger"
              size="sm"
              loading={eliminando}
              disabled={impactoLoading || Boolean(impacto && impacto.usadoComoComponenteDe.length > 0)}
              onClick={() => void handleConfirmDelete()}
            >
              Eliminar
            </AppButton>
          </div>
        )}
      >
        <div className="space-y-2">
          {impactoLoading ? (
            <p className="text-xs text-[color:var(--text-ink-muted)]">Revisando qué más se ve afectado…</p>
          ) : impacto ? (
            impacto.usadoComoComponenteDe.length > 0 ? (
              <NoticeBanner tone="danger">
                No se puede eliminar: este lote ya se usó como componente del blend{" "}
                {impacto.usadoComoComponenteDe.map((l) => l.codigo).join(", ")}. Corregí ese corte primero.
              </NoticeBanner>
            ) : (
              <NoticeBanner tone="warning">
                <ul className="list-disc space-y-1 pl-4">
                  {impacto.recepcionesOrigen > 0 ? (
                    <li>
                      {impacto.recepcionesOrigen} recepción(es) quedan liberadas (vuelven a estar disponibles para
                      armar otro lote).
                    </li>
                  ) : null}
                  {impacto.vasijaContenido.map((v, i) => (
                    <li key={i}>
                      Se borra el registro de {v.volumen_l} l en la vasija {v.vasija_codigo}
                      {v.activo ? " (activo ahora)" : " (histórico)"}.
                    </li>
                  ))}
                  {impacto.recepcionesOrigen === 0 && impacto.vasijaContenido.length === 0 ? (
                    <li>No hay nada más asociado a este lote.</li>
                  ) : null}
                </ul>
              </NoticeBanner>
            )
          ) : null}
          <p className="text-xs text-[color:var(--text-ink-muted)]">Esta acción no se puede deshacer.</p>
        </div>
      </AppModal>
    </div>
  );
}
