import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AppButton,
  AppCard,
  AppInput,
  AppModal,
  MetricCard,
  NoticeBanner,
  SectionIntro,
  useAppNotifications,
} from "../../components/ui";
import { getApiErrorMessage } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import {
  fetchAlertas,
  fetchExistencias,
  fetchMovimientos,
  registrarAjuste,
  registrarIngreso,
  type Alertas,
  type Existencia,
  type MovimientoStock,
} from "../../features/inventario/api";

function money(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 }).format(n);
}

export default function InventarioPage() {
  const { notifySuccess, notifyError } = useAppNotifications();
  const bodegaId = useAuthStore((state) => state.activeBodegaId);

  const [existencias, setExistencias] = useState<Existencia[]>([]);
  const [alertas, setAlertas] = useState<Alertas | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal de movimiento (ingreso / ajuste)
  const [modal, setModal] = useState<{ insumo: Existencia; tipo: "ingreso" | "ajuste" } | null>(null);
  const [cantidad, setCantidad] = useState("");
  const [costo, setCosto] = useState("");
  const [motivo, setMotivo] = useState("");
  const [saving, setSaving] = useState(false);

  // Movimientos por insumo
  const [movInsumo, setMovInsumo] = useState<Existencia | null>(null);
  const [movimientos, setMovimientos] = useState<MovimientoStock[]>([]);

  const load = useCallback(async () => {
    if (!bodegaId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [ex, al] = await Promise.all([fetchExistencias(bodegaId), fetchAlertas(bodegaId)]);
      setExistencias(ex);
      setAlertas(al);
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [bodegaId]);

  useEffect(() => {
    void load();
  }, [load]);

  const openModal = (insumo: Existencia, tipo: "ingreso" | "ajuste") => {
    setModal({ insumo, tipo });
    setCantidad("");
    setCosto(insumo.costo_unitario ?? "");
    setMotivo("");
  };

  const handleMov = async () => {
    if (!bodegaId || !modal) return;
    const n = Number(cantidad);
    if (!Number.isFinite(n) || n === 0) {
      notifyError({ title: "Cantidad inválida" });
      return;
    }
    setSaving(true);
    try {
      if (modal.tipo === "ingreso") {
        if (n <= 0) {
          notifyError({ title: "El ingreso debe ser mayor a 0" });
          setSaving(false);
          return;
        }
        await registrarIngreso({
          bodegaId,
          insumoId: modal.insumo.insumo_id,
          cantidad: n,
          costo_unitario: costo.trim() ? Number(costo) : null,
          motivo: motivo.trim() || undefined,
        });
      } else {
        await registrarAjuste({
          bodegaId,
          insumoId: modal.insumo.insumo_id,
          cantidad: n, // delta con signo
          motivo: motivo.trim() || undefined,
        });
      }
      notifySuccess({ title: modal.tipo === "ingreso" ? "Ingreso registrado" : "Ajuste registrado" });
      setModal(null);
      await load();
    } catch (e) {
      notifyError({ title: "Error", message: getApiErrorMessage(e) });
    } finally {
      setSaving(false);
    }
  };

  const openMovimientos = async (insumo: Existencia) => {
    if (!bodegaId) return;
    setMovInsumo(insumo);
    try {
      setMovimientos(await fetchMovimientos(insumo.insumo_id, bodegaId));
    } catch (e) {
      notifyError({ title: "Error", message: getApiErrorMessage(e) });
    }
  };

  if (!bodegaId) {
    return (
      <div className="min-h-screen bg-secondary px-6 py-10">
        <div className="mx-auto w-full max-w-6xl space-y-4">
          <SectionIntro title="Inventario" />
          <NoticeBanner tone="warning">Seleccioná una bodega para ver el inventario.</NoticeBanner>
        </div>
      </div>
    );
  }

  const valorTotal = existencias.reduce((acc, e) => acc + e.valorizacion, 0);
  const bajoMin = alertas?.bajoMinimo.length ?? 0;
  const porVencer = alertas?.lotesPorVencer.length ?? 0;

  return (
    <div className="min-h-screen bg-secondary px-6 py-10">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <SectionIntro
            eyebrow="Inventario"
            title="Existencias"
            description="Stock actual de insumos por bodega, su valorización y alertas. Registrá compras (ingresos) y ajustes."
          />
          <Link to="/admin/insumos" className="shrink-0">
            <AppButton variant="secondary">Administrar insumos</AppButton>
          </Link>
        </div>

        {error ? <NoticeBanner tone="danger">{error}</NoticeBanner> : null}

        <div className="grid gap-3 sm:grid-cols-3">
          <MetricCard label="Valorización total" value={money(valorTotal)} />
          <MetricCard label="Bajo stock mínimo" value={bajoMin} tone={bajoMin > 0 ? "warning" : "default"} />
          <MetricCard label="Lotes por vencer (30d)" value={porVencer} tone={porVencer > 0 ? "warning" : "default"} />
        </div>

        {(bajoMin > 0 || porVencer > 0) && alertas ? (
          <NoticeBanner tone="warning">
            {bajoMin > 0 ? `Bajo mínimo: ${alertas.bajoMinimo.map((e) => e.nombre_comercial).join(", ")}. ` : ""}
            {porVencer > 0
              ? `Por vencer: ${alertas.lotesPorVencer.map((l) => `${l.insumo_catalogo.nombre_comercial} (${new Date(l.fecha_vencimiento).toLocaleDateString("es-AR")})`).join(", ")}.`
              : ""}
          </NoticeBanner>
        ) : null}

        <AppCard header={<h3 className="text-base font-semibold">Stock por insumo</h3>}>
          {loading ? (
            <p className="text-sm text-[color:var(--text-ink-muted)]">Cargando…</p>
          ) : existencias.length === 0 ? (
            <p className="text-sm text-[color:var(--text-ink-muted)]">No hay insumos cargados.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-[color:var(--text-ink-muted)]">
                    <th className="py-2 pr-3">Insumo</th>
                    <th className="py-2 pr-3 text-right">Stock</th>
                    <th className="py-2 pr-3 text-right">Mín.</th>
                    <th className="py-2 pr-3 text-right">Costo</th>
                    <th className="py-2 pr-3 text-right">Valorización</th>
                    <th className="py-2 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {existencias.map((e) => (
                    <tr key={e.insumo_id} className="border-t border-[color:var(--border-shell)]">
                      <td className="py-2 pr-3">
                        {e.nombre_comercial}
                        {e.bajo_minimo ? (
                          <span className="ml-2 rounded-full bg-[color:var(--feedback-warning-bg)] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--feedback-warning-text)]">bajo mínimo</span>
                        ) : null}
                      </td>
                      <td className={`py-2 pr-3 text-right font-medium ${e.stock < 0 ? "text-[color:var(--field-error)]" : ""}`}>
                        {e.stock} {e.unidad_base}
                      </td>
                      <td className="py-2 pr-3 text-right">{e.stock_minimo ?? "—"}</td>
                      <td className="py-2 pr-3 text-right">{e.costo_unitario ?? "—"}</td>
                      <td className="py-2 pr-3 text-right">{money(e.valorizacion)}</td>
                      <td className="py-2 text-right">
                        <div className="inline-flex gap-1">
                          <AppButton variant="ghost" size="sm" onClick={() => openModal(e, "ingreso")}>Ingreso</AppButton>
                          <AppButton variant="ghost" size="sm" onClick={() => openModal(e, "ajuste")}>Ajuste</AppButton>
                          <AppButton variant="ghost" size="sm" onClick={() => void openMovimientos(e)}>Movimientos</AppButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AppCard>
      </div>

      {/* Modal ingreso/ajuste */}
      <AppModal
        opened={Boolean(modal)}
        onClose={() => setModal(null)}
        title={modal ? `${modal.tipo === "ingreso" ? "Ingreso / compra" : "Ajuste"} — ${modal.insumo.nombre_comercial}` : ""}
      >
        {modal ? (
          <div className="space-y-3">
            <AppInput
              label={modal.tipo === "ingreso" ? `Cantidad (${modal.insumo.unidad_base})` : `Ajuste con signo (+/−, ${modal.insumo.unidad_base})`}
              type="number"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              placeholder={modal.tipo === "ajuste" ? "ej. -3 o 5" : "ej. 40"}
            />
            {modal.tipo === "ingreso" ? (
              <AppInput label="Costo unitario (opcional, actualiza el precio)" type="number" value={costo} onChange={(e) => setCosto(e.target.value)} />
            ) : null}
            <AppInput label="Motivo (opcional)" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
            <div className="flex gap-2">
              <AppButton variant="primary" loading={saving} onClick={() => void handleMov()}>Confirmar</AppButton>
              <AppButton variant="ghost" onClick={() => setModal(null)}>Cancelar</AppButton>
            </div>
          </div>
        ) : null}
      </AppModal>

      {/* Modal movimientos */}
      <AppModal
        opened={Boolean(movInsumo)}
        onClose={() => setMovInsumo(null)}
        title={movInsumo ? `Movimientos — ${movInsumo.nombre_comercial}` : ""}
      >
        {movimientos.length === 0 ? (
          <p className="text-sm text-[color:var(--text-ink-muted)]">Sin movimientos.</p>
        ) : (
          <ul className="space-y-2">
            {movimientos.map((m) => (
              <li key={m.movimiento_stock_id} className="flex items-center justify-between rounded-[var(--radius-md)] border border-[color:var(--border-shell)] px-3 py-2 text-sm">
                <span>
                  <span className="capitalize font-medium">{m.tipo}</span> · {m.cantidad} {m.unidad}
                  {m.motivo ? ` · ${m.motivo}` : ""}
                </span>
                <span className="text-xs text-[color:var(--text-ink-muted)]">{new Date(m.fecha).toLocaleString("es-AR")}</span>
              </li>
            ))}
          </ul>
        )}
      </AppModal>
    </div>
  );
}
