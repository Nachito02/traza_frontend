import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AppButton,
  AppCard,
  AppInput,
  AppSelect,
  NoticeBanner,
  SectionIntro,
  useAppNotifications,
} from "../../components/ui";
import { getApiErrorMessage } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import {
  createInsumo,
  deleteInsumo,
  fetchCategoriasMaestro,
  fetchInsumos,
  fetchMaestro,
  patchInsumo,
  type AmbitoInsumo,
  type Insumo,
  type InsumoMaestro,
} from "../../features/inventario/api";

// Centinelas de los selects: cargar una categoría fuera del catálogo, o cargar
// el producto a mano (sin autocompletar desde el maestro).
const OTRA_CATEGORIA = "__otra__";
const CARGA_MANUAL = "__manual__";

const EMPTY = {
  categoria: "",
  categoria_otra: "",
  familia: "",
  principio_activo: "",
  nombre_comercial: "",
  unidad_base: "",
  dosis_min: "",
  dosis_max: "",
  unidad_dosis: "",
  proveedor: "",
  costo_unitario: "",
  vigencia: "",
  stock_minimo: "",
  marca: "",
  fabricante: "",
  presentacion: "",
};

type FormState = typeof EMPTY;

const AMBITOS: { value: AmbitoInsumo; label: string }[] = [
  { value: "finca", label: "Insumos de finca" },
  { value: "bodega", label: "Insumos de bodega" },
];

export default function InsumosPage() {
  const { notifySuccess, notifyError } = useAppNotifications();
  const bodegaId = useAuthStore((state) => state.activeBodegaId);

  const [ambito, setAmbito] = useState<AmbitoInsumo>("finca");
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [maestro, setMaestro] = useState<InsumoMaestro[]>([]);
  const [selectedMaestroId, setSelectedMaestroId] = useState<string>(CARGA_MANUAL);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const num = (v: string): number | null => {
    if (!v.trim()) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const loadInsumos = useCallback(async () => {
    if (!bodegaId) {
      setInsumos([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setInsumos(await fetchInsumos(bodegaId, ambito, true));
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [bodegaId, ambito]);

  const loadCategorias = useCallback(async () => {
    try {
      setCategorias(await fetchCategoriasMaestro(ambito));
    } catch {
      setCategorias([]);
    }
  }, [ambito]);

  useEffect(() => {
    void loadInsumos();
  }, [loadInsumos]);

  useEffect(() => {
    void loadCategorias();
  }, [loadCategorias]);

  const resetForm = () => {
    setForm(EMPTY);
    setEditingId(null);
    setMaestro([]);
    setSelectedMaestroId(CARGA_MANUAL);
  };

  const changeAmbito = (next: AmbitoInsumo) => {
    if (next === ambito) return;
    setAmbito(next);
    resetForm();
  };

  // Al elegir categoría: carga el maestro de esa categoría para autocompletar.
  const onChangeCategoria = async (value: string) => {
    setSelectedMaestroId(CARGA_MANUAL);
    setForm((prev) => ({ ...prev, categoria: value, categoria_otra: "" }));
    if (!value || value === OTRA_CATEGORIA) {
      setMaestro([]);
      return;
    }
    try {
      setMaestro(await fetchMaestro(ambito, value));
    } catch {
      setMaestro([]);
    }
  };

  // Al elegir un producto del maestro: autocompleta los campos técnicos.
  const onChangeMaestro = (maestroId: string) => {
    setSelectedMaestroId(maestroId);
    if (maestroId === CARGA_MANUAL) return;
    const m = maestro.find((x) => x.insumo_maestro_id === maestroId);
    if (!m) return;
    setForm((prev) => ({
      ...prev,
      familia: m.familia ?? "",
      principio_activo: m.principio_activo ?? "",
      nombre_comercial: m.nombre_comercial,
      unidad_base: m.unidad ?? prev.unidad_base,
      dosis_min: m.dosis_min ?? "",
      dosis_max: m.dosis_max ?? "",
      unidad_dosis: m.unidad_dosis ?? "",
    }));
  };

  const setField = (key: keyof FormState, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const categoriaFinal = form.categoria === OTRA_CATEGORIA ? form.categoria_otra.trim() : form.categoria;

  const handleSave = async () => {
    if (!bodegaId) return;
    if (!categoriaFinal || !form.nombre_comercial.trim() || !form.unidad_base.trim()) {
      notifyError({ title: "Faltan datos", message: "Categoría, nombre comercial y unidad son obligatorios." });
      return;
    }
    const payload = {
      ambito,
      tipo: categoriaFinal,
      familia: form.familia.trim() || null,
      nombre_comercial: form.nombre_comercial.trim(),
      principio_activo: form.principio_activo.trim() || null,
      unidad_base: form.unidad_base.trim(),
      dosis_min: num(form.dosis_min),
      dosis_max: num(form.dosis_max),
      unidad_dosis: form.unidad_dosis.trim() || null,
      proveedor: form.proveedor.trim() || null,
      costo_unitario: num(form.costo_unitario),
      vigencia: form.vigencia || null,
      stock_minimo: num(form.stock_minimo),
      marca: ambito === "bodega" ? form.marca.trim() || null : null,
      fabricante: ambito === "bodega" ? form.fabricante.trim() || null : null,
      presentacion: ambito === "bodega" ? form.presentacion.trim() || null : null,
    };
    setSaving(true);
    try {
      if (editingId) {
        await patchInsumo(editingId, payload);
        notifySuccess({ title: "Insumo actualizado" });
      } else {
        await createInsumo({ bodegaId, ...payload });
        notifySuccess({ title: "Insumo creado" });
      }
      resetForm();
      await loadInsumos();
    } catch (e) {
      notifyError({ title: "Error", message: getApiErrorMessage(e) });
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (i: Insumo) => {
    setEditingId(i.insumo_id);
    setSelectedMaestroId(CARGA_MANUAL);
    setMaestro([]);
    const catConocida = categorias.includes(i.tipo);
    setForm({
      categoria: catConocida ? i.tipo : OTRA_CATEGORIA,
      categoria_otra: catConocida ? "" : i.tipo,
      familia: i.familia ?? "",
      principio_activo: i.principio_activo ?? "",
      nombre_comercial: i.nombre_comercial,
      unidad_base: i.unidad_base,
      dosis_min: i.dosis_min ?? "",
      dosis_max: i.dosis_max ?? "",
      unidad_dosis: i.unidad_dosis ?? "",
      proveedor: i.proveedor ?? "",
      costo_unitario: i.costo_unitario ?? "",
      vigencia: i.vigencia ? i.vigencia.slice(0, 10) : "",
      stock_minimo: i.stock_minimo ?? "",
      marca: i.marca ?? "",
      fabricante: i.fabricante ?? "",
      presentacion: i.presentacion ?? "",
    });
  };

  const remove = async (i: Insumo) => {
    try {
      const r = await deleteInsumo(i.insumo_id);
      notifySuccess({ title: r.desactivado ? "Insumo desactivado" : "Insumo eliminado" });
      await loadInsumos();
    } catch (e) {
      notifyError({ title: "Error", message: getApiErrorMessage(e) });
    }
  };

  const esBodega = ambito === "bodega";
  const dosisTexto = (i: Insumo) => {
    if (i.dosis_min == null && i.dosis_max == null) return "—";
    const rango = [i.dosis_min, i.dosis_max].filter((x) => x != null).join("–");
    return `${rango}${i.unidad_dosis ? ` ${i.unidad_dosis}` : ""}`;
  };

  const ambitoInsumos = useMemo(() => insumos.filter((i) => i.ambito === ambito), [insumos, ambito]);

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
          description="Catálogos separados de insumos de finca y de bodega. Elegí la categoría y, si está en el catálogo maestro, seleccioná el producto para autocompletar sus datos técnicos."
        />

        {/* Tabs de ámbito: finca / bodega */}
        <div className="inline-flex rounded-[var(--radius-md)] border border-[color:var(--border-shell)] p-1">
          {AMBITOS.map((a) => (
            <button
              key={a.value}
              type="button"
              onClick={() => changeAmbito(a.value)}
              className={`rounded-[var(--radius-sm)] px-4 py-1.5 text-sm font-medium transition ${
                ambito === a.value
                  ? "bg-[color:var(--accent-primary)] text-white"
                  : "text-[color:var(--text-ink-muted)] hover:text-[color:var(--text-ink)]"
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>

        {error ? <NoticeBanner tone="danger">{error}</NoticeBanner> : null}

        {/* Form de alta/edición */}
        <AppCard header={<h3 className="text-base font-semibold">{editingId ? "Editar insumo" : "Nuevo insumo"}</h3>}>
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <AppSelect
                label="Categoría o tipo"
                value={form.categoria}
                onChange={(e) => void onChangeCategoria(e.target.value)}
              >
                <option value="">Seleccionar categoría</option>
                {categorias.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
                <option value={OTRA_CATEGORIA}>Otra (especificar)…</option>
              </AppSelect>
              {form.categoria === OTRA_CATEGORIA ? (
                <AppInput
                  label="Especificá la categoría"
                  value={form.categoria_otra}
                  onChange={(e) => setField("categoria_otra", e.target.value)}
                  className="mt-2"
                />
              ) : null}
            </div>

            {/* Selector de producto del catálogo maestro (autocompleta) */}
            {maestro.length > 0 ? (
              <AppSelect
                label="Producto del catálogo (autocompleta)"
                value={selectedMaestroId}
                onChange={(e) => onChangeMaestro(e.target.value)}
              >
                <option value={CARGA_MANUAL}>Carga manual…</option>
                {maestro.map((m) => (
                  <option key={m.insumo_maestro_id} value={m.insumo_maestro_id}>
                    {m.nombre_comercial}
                    {m.principio_activo ? ` — ${m.principio_activo}` : ""}
                  </option>
                ))}
              </AppSelect>
            ) : null}

            <AppInput label="Principio activo" value={form.principio_activo} onChange={(e) => setField("principio_activo", e.target.value)} placeholder="Opcional" />
            <AppInput label="Nombre comercial" value={form.nombre_comercial} onChange={(e) => setField("nombre_comercial", e.target.value)} />
            <AppInput label="Unidad" value={form.unidad_base} onChange={(e) => setField("unidad_base", e.target.value)} placeholder="kg, L, unidad…" />
            <AppInput label="Dosis mínima" type="number" min="0" value={form.dosis_min} onChange={(e) => setField("dosis_min", e.target.value)} />
            <AppInput label="Dosis máxima" type="number" min="0" value={form.dosis_max} onChange={(e) => setField("dosis_max", e.target.value)} />
            <AppInput label="Unidad de dosis" value={form.unidad_dosis} onChange={(e) => setField("unidad_dosis", e.target.value)} placeholder="kg/ha, L/ha…" />

            {esBodega ? (
              <>
                <AppInput label="Marca comercial" value={form.marca} onChange={(e) => setField("marca", e.target.value)} placeholder="Opcional" />
                <AppInput label="Fabricante" value={form.fabricante} onChange={(e) => setField("fabricante", e.target.value)} placeholder="Opcional" />
                <AppInput label="Presentación" value={form.presentacion} onChange={(e) => setField("presentacion", e.target.value)} placeholder="Bolsa 500 g, Bidón 20 L…" />
              </>
            ) : null}

            <AppInput label="Proveedor" value={form.proveedor} onChange={(e) => setField("proveedor", e.target.value)} placeholder="Opcional" />
            <AppInput label="Precio unitario" type="number" min="0" value={form.costo_unitario} onChange={(e) => setField("costo_unitario", e.target.value)} />
            <AppInput label="Vigencia del precio" type="date" value={form.vigencia} onChange={(e) => setField("vigencia", e.target.value)} />
            <AppInput label="Stock mínimo de alerta" type="number" min="0" value={form.stock_minimo} onChange={(e) => setField("stock_minimo", e.target.value)} />
          </div>
          <div className="mt-3 flex gap-2">
            <AppButton variant="primary" loading={saving} onClick={() => void handleSave()}>
              {editingId ? "Guardar cambios" : "Crear insumo"}
            </AppButton>
            {editingId ? <AppButton variant="ghost" onClick={resetForm}>Cancelar</AppButton> : null}
          </div>
        </AppCard>

        {/* Listado */}
        <AppCard header={<h3 className="text-base font-semibold">Insumos cargados</h3>}>
          {loading ? (
            <p className="text-sm text-[color:var(--text-ink-muted)]">Cargando…</p>
          ) : ambitoInsumos.length === 0 ? (
            <p className="text-sm text-[color:var(--text-ink-muted)]">Todavía no hay insumos en este catálogo.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-[color:var(--text-ink-muted)]">
                    <th className="py-2 pr-3">Nombre</th>
                    <th className="py-2 pr-3">Categoría</th>
                    <th className="py-2 pr-3">{esBodega ? "Marca" : "Principio activo"}</th>
                    <th className="py-2 pr-3">Unidad</th>
                    {esBodega ? <th className="py-2 pr-3">Presentación</th> : <th className="py-2 pr-3">Dosis</th>}
                    <th className="py-2 pr-3">Proveedor</th>
                    <th className="py-2 pr-3 text-right">Precio</th>
                    <th className="py-2 pr-3 text-right">Stock mín.</th>
                    <th className="py-2 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {ambitoInsumos.map((i) => (
                    <tr key={i.insumo_id} className={`border-t border-[color:var(--border-shell)] ${i.activo ? "" : "opacity-50"}`}>
                      <td className="py-2 pr-3">
                        {i.nombre_comercial}
                        {!i.activo ? <span className="ml-2 text-[10px] uppercase text-[color:var(--text-ink-muted)]">inactivo</span> : null}
                      </td>
                      <td className="py-2 pr-3">{i.tipo}</td>
                      <td className="py-2 pr-3">{(esBodega ? i.marca : i.principio_activo) ?? "—"}</td>
                      <td className="py-2 pr-3">{i.unidad_base}</td>
                      <td className="py-2 pr-3">{esBodega ? (i.presentacion ?? "—") : dosisTexto(i)}</td>
                      <td className="py-2 pr-3">{i.proveedor ?? "—"}</td>
                      <td className="py-2 pr-3 text-right">{i.costo_unitario ?? "—"}</td>
                      <td className="py-2 pr-3 text-right">{i.stock_minimo ?? "—"}</td>
                      <td className="py-2 text-right">
                        <div className="inline-flex gap-1">
                          <AppButton variant="ghost" size="sm" onClick={() => startEdit(i)}>Editar</AppButton>
                          <AppButton variant="ghost" size="sm" onClick={() => void remove(i)}>Borrar</AppButton>
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
    </div>
  );
}
