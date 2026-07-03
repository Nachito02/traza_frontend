import { useCallback, useEffect, useState } from "react";
import {
  AppButton,
  AppCard,
  AppInput,
  NoticeBanner,
  SectionIntro,
  useAppNotifications,
} from "../../components/ui";
import { getApiErrorMessage } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import {
  createInsumo,
  deleteInsumo,
  fetchInsumos,
  patchInsumo,
  type Insumo,
} from "../../features/inventario/api";

const EMPTY = {
  tipo: "",
  nombre_comercial: "",
  principio_activo: "",
  unidad_base: "kg",
  costo_unitario: "",
  stock_minimo: "",
};

export default function InsumosPage() {
  const { notifySuccess, notifyError } = useAppNotifications();
  const bodegaId = useAuthStore((state) => state.activeBodegaId);

  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!bodegaId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setInsumos(await fetchInsumos(bodegaId, true));
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [bodegaId]);

  useEffect(() => {
    void load();
  }, [load]);

  const num = (v: string): number | null => {
    if (!v.trim()) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const resetForm = () => {
    setForm(EMPTY);
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!bodegaId) return;
    if (!form.tipo.trim() || !form.nombre_comercial.trim() || !form.unidad_base.trim()) {
      notifyError({ title: "Faltan datos", message: "Tipo, nombre y unidad son obligatorios." });
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await patchInsumo(editingId, {
          tipo: form.tipo.trim(),
          nombre_comercial: form.nombre_comercial.trim(),
          principio_activo: form.principio_activo.trim() || null,
          unidad_base: form.unidad_base.trim(),
          costo_unitario: num(form.costo_unitario),
          stock_minimo: num(form.stock_minimo),
        });
        notifySuccess({ title: "Insumo actualizado" });
      } else {
        await createInsumo({
          bodegaId,
          tipo: form.tipo.trim(),
          nombre_comercial: form.nombre_comercial.trim(),
          principio_activo: form.principio_activo.trim() || null,
          unidad_base: form.unidad_base.trim(),
          costo_unitario: num(form.costo_unitario),
          stock_minimo: num(form.stock_minimo),
        });
        notifySuccess({ title: "Insumo creado" });
      }
      resetForm();
      await load();
    } catch (e) {
      notifyError({ title: "Error", message: getApiErrorMessage(e) });
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (i: Insumo) => {
    setEditingId(i.insumo_id);
    setForm({
      tipo: i.tipo,
      nombre_comercial: i.nombre_comercial,
      principio_activo: i.principio_activo ?? "",
      unidad_base: i.unidad_base,
      costo_unitario: i.costo_unitario ?? "",
      stock_minimo: i.stock_minimo ?? "",
    });
  };

  const remove = async (i: Insumo) => {
    try {
      const r = await deleteInsumo(i.insumo_id);
      notifySuccess({ title: r.desactivado ? "Insumo desactivado" : "Insumo eliminado" });
      await load();
    } catch (e) {
      notifyError({ title: "Error", message: getApiErrorMessage(e) });
    }
  };

  if (!bodegaId) {
    return (
      <div className="min-h-screen bg-secondary px-6 py-10">
        <div className="mx-auto w-full max-w-6xl space-y-4">
          <SectionIntro title="Insumos" />
          <NoticeBanner tone="warning">Seleccioná una bodega para administrar los insumos.</NoticeBanner>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary px-6 py-10">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <SectionIntro
          eyebrow="Inventario"
          title="Insumos"
          description="Catálogo de insumos de la bodega: fertilizantes, fitosanitarios, materiales. Definí su precio y stock mínimo."
        />

        {error ? <NoticeBanner tone="danger">{error}</NoticeBanner> : null}

        {/* Form de alta/edición */}
        <AppCard header={<h3 className="text-base font-semibold">{editingId ? "Editar insumo" : "Nuevo insumo"}</h3>}>
          <div className="grid gap-3 md:grid-cols-3">
            <AppInput label="Tipo" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} placeholder="Fitosanitario, Fertilizante…" />
            <AppInput label="Nombre comercial" value={form.nombre_comercial} onChange={(e) => setForm({ ...form, nombre_comercial: e.target.value })} />
            <AppInput label="Principio activo (opcional)" value={form.principio_activo} onChange={(e) => setForm({ ...form, principio_activo: e.target.value })} />
            <AppInput label="Unidad base" value={form.unidad_base} onChange={(e) => setForm({ ...form, unidad_base: e.target.value })} placeholder="kg, lt, unidad" />
            <AppInput label="Costo unitario" type="number" value={form.costo_unitario} onChange={(e) => setForm({ ...form, costo_unitario: e.target.value })} />
            <AppInput label="Stock mínimo (alerta)" type="number" value={form.stock_minimo} onChange={(e) => setForm({ ...form, stock_minimo: e.target.value })} />
          </div>
          <div className="mt-3 flex gap-2">
            <AppButton variant="primary" loading={saving} onClick={() => void handleSave()}>
              {editingId ? "Guardar cambios" : "Crear insumo"}
            </AppButton>
            {editingId ? (
              <AppButton variant="ghost" onClick={resetForm}>Cancelar</AppButton>
            ) : null}
          </div>
        </AppCard>

        {/* Listado */}
        <AppCard header={<h3 className="text-base font-semibold">Insumos cargados</h3>}>
          {loading ? (
            <p className="text-sm text-[color:var(--text-ink-muted)]">Cargando…</p>
          ) : insumos.length === 0 ? (
            <p className="text-sm text-[color:var(--text-ink-muted)]">Todavía no hay insumos.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-[color:var(--text-ink-muted)]">
                    <th className="py-2 pr-3">Insumo</th>
                    <th className="py-2 pr-3">Tipo</th>
                    <th className="py-2 pr-3">Unidad</th>
                    <th className="py-2 pr-3 text-right">Costo</th>
                    <th className="py-2 pr-3 text-right">Stock mín.</th>
                    <th className="py-2 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {insumos.map((i) => (
                    <tr key={i.insumo_id} className={`border-t border-[color:var(--border-shell)] ${i.activo ? "" : "opacity-50"}`}>
                      <td className="py-2 pr-3">
                        {i.nombre_comercial}
                        {!i.activo ? <span className="ml-2 text-[10px] uppercase text-[color:var(--text-ink-muted)]">inactivo</span> : null}
                        {i.bodega_id === null ? <span className="ml-2 text-[10px] uppercase text-[color:var(--text-ink-muted)]">global</span> : null}
                      </td>
                      <td className="py-2 pr-3">{i.tipo}</td>
                      <td className="py-2 pr-3">{i.unidad_base}</td>
                      <td className="py-2 pr-3 text-right">{i.costo_unitario ?? "—"}</td>
                      <td className="py-2 pr-3 text-right">{i.stock_minimo ?? "—"}</td>
                      <td className="py-2 text-right">
                        {i.bodega_id ? (
                          <div className="inline-flex gap-1">
                            <AppButton variant="ghost" size="sm" onClick={() => startEdit(i)}>Editar</AppButton>
                            <AppButton variant="ghost" size="sm" onClick={() => void remove(i)}>Borrar</AppButton>
                          </div>
                        ) : (
                          <span className="text-xs text-[color:var(--text-ink-muted)]">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AppCard>
      </div>
    </div>
  );
}
