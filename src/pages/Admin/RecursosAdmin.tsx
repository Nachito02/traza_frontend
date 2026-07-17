import { useCallback, useEffect, useState } from "react";
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
  createRecurso,
  deleteRecurso,
  fetchCategoriasMaestro,
  fetchMaestro,
  fetchRecursos,
  patchRecurso,
  type AmbitoRecurso,
  type ClaseRecurso,
  type Recurso,
  type RecursoMaestro,
} from "../../features/recursos/api";

const OTRA_CATEGORIA = "__otra__";
const CARGA_MANUAL = "__manual__";

const AMBITOS: { value: AmbitoRecurso; label: string }[] = [
  { value: "finca", label: "Recursos de finca" },
  { value: "bodega", label: "Recursos de bodega" },
];

const CLASES: { value: ClaseRecurso; label: string }[] = [
  { value: "motriz", label: "Máquinas" },
  { value: "implemento", label: "Implementos" },
  { value: "equipo", label: "Equipos" },
  { value: "herramienta", label: "Herramientas" },
];

const EMPTY = {
  categoria: "",
  categoria_otra: "",
  familia: "",
  nombre: "",
  potencia_hp: "",
  uso_principal: "",
  unidad_uso: "",
  consumo_descripcion: "",
  observaciones: "",
  costo_hora: "",
  consumo_lts_hora: "",
  vigencia_desde: "",
};

type FormState = typeof EMPTY;

export default function RecursosAdmin() {
  const { notifySuccess, notifyError } = useAppNotifications();
  const bodegaId = useAuthStore((state) => state.activeBodegaId);

  const [ambito, setAmbito] = useState<AmbitoRecurso>("finca");
  const [clase, setClase] = useState<ClaseRecurso>("motriz");
  const [recursos, setRecursos] = useState<Recurso[]>([]);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [maestro, setMaestro] = useState<RecursoMaestro[]>([]);
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

  const loadRecursos = useCallback(async () => {
    if (!bodegaId) {
      setRecursos([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setRecursos(await fetchRecursos(bodegaId, ambito, clase));
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [bodegaId, ambito, clase]);

  const loadCategorias = useCallback(async () => {
    try {
      setCategorias(await fetchCategoriasMaestro(ambito, clase));
    } catch {
      setCategorias([]);
    }
  }, [ambito, clase]);

  useEffect(() => {
    void loadRecursos();
  }, [loadRecursos]);

  useEffect(() => {
    void loadCategorias();
  }, [loadCategorias]);

  const resetForm = () => {
    setForm(EMPTY);
    setEditingId(null);
    setMaestro([]);
    setSelectedMaestroId(CARGA_MANUAL);
  };

  const changeAmbito = (next: AmbitoRecurso) => {
    if (next === ambito) return;
    setAmbito(next);
    resetForm();
  };

  const changeClase = (next: ClaseRecurso) => {
    if (next === clase) return;
    setClase(next);
    resetForm();
  };

  const onChangeCategoria = async (value: string) => {
    setSelectedMaestroId(CARGA_MANUAL);
    setForm((prev) => ({ ...prev, categoria: value, categoria_otra: "" }));
    if (!value || value === OTRA_CATEGORIA) {
      setMaestro([]);
      return;
    }
    try {
      setMaestro(await fetchMaestro(ambito, clase, value));
    } catch {
      setMaestro([]);
    }
  };

  const onChangeMaestro = (maestroId: string) => {
    setSelectedMaestroId(maestroId);
    if (maestroId === CARGA_MANUAL) return;
    const m = maestro.find((x) => x.recurso_maestro_id === maestroId);
    if (!m) return;
    setForm((prev) => ({
      ...prev,
      familia: m.familia ?? "",
      nombre: m.nombre,
      potencia_hp: m.potencia_hp ?? "",
      uso_principal: m.uso_principal ?? "",
      unidad_uso: m.unidad_uso ?? "",
      consumo_descripcion: m.consumo_descripcion ?? "",
      observaciones: m.observaciones ?? "",
    }));
  };

  const setField = (key: keyof FormState, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const categoriaFinal = form.categoria === OTRA_CATEGORIA ? form.categoria_otra.trim() : form.categoria;

  const handleSave = async () => {
    if (!bodegaId) return;
    if (!form.nombre.trim()) {
      notifyError({ title: "Falta el nombre" });
      return;
    }
    const payload = {
      ambito,
      clase,
      categoria: categoriaFinal || null,
      familia: form.familia.trim() || null,
      nombre: form.nombre.trim(),
      potencia_hp: form.potencia_hp.trim() || null,
      uso_principal: form.uso_principal.trim() || null,
      unidad_uso: form.unidad_uso.trim() || null,
      consumo_descripcion: form.consumo_descripcion.trim() || null,
      observaciones: form.observaciones.trim() || null,
      costo_hora: num(form.costo_hora),
      consumo_lts_hora: num(form.consumo_lts_hora),
      vigencia_desde: form.vigencia_desde || null,
    };
    setSaving(true);
    try {
      if (editingId) {
        await patchRecurso(editingId, payload);
        notifySuccess({ title: "Recurso actualizado" });
      } else {
        await createRecurso({ bodegaId, ...payload });
        notifySuccess({ title: "Recurso creado" });
      }
      resetForm();
      await loadRecursos();
    } catch (e) {
      notifyError({ title: "Error", message: getApiErrorMessage(e) });
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (r: Recurso) => {
    setEditingId(r.tarifa_maquinaria_id);
    setSelectedMaestroId(CARGA_MANUAL);
    setMaestro([]);
    const catConocida = !!r.categoria && categorias.includes(r.categoria);
    setForm({
      categoria: r.categoria ? (catConocida ? r.categoria : OTRA_CATEGORIA) : "",
      categoria_otra: r.categoria && !catConocida ? r.categoria : "",
      familia: r.familia ?? "",
      nombre: r.nombre,
      potencia_hp: r.potencia_hp ?? "",
      uso_principal: r.uso_principal ?? "",
      unidad_uso: r.unidad_uso ?? "",
      consumo_descripcion: r.consumo_descripcion ?? "",
      observaciones: r.observaciones ?? "",
      costo_hora: r.costo_hora ?? "",
      consumo_lts_hora: r.consumo_lts_hora ?? "",
      vigencia_desde: r.vigencia_desde ? r.vigencia_desde.slice(0, 10) : "",
    });
  };

  const remove = async (r: Recurso) => {
    try {
      const res = await deleteRecurso(r.tarifa_maquinaria_id);
      notifySuccess({ title: res.desactivado ? "Recurso desactivado" : "Recurso eliminado" });
      await loadRecursos();
    } catch (e) {
      notifyError({ title: "Error", message: getApiErrorMessage(e) });
    }
  };

  const esMotriz = clase === "motriz";

  if (!bodegaId) {
    return (
      <div className="min-h-screen bg-secondary px-6 py-10">
        <div className="mx-auto w-full max-w-6xl space-y-4">
          <SectionIntro title="Máquinas, implementos, equipos y herramientas" />
          <NoticeBanner tone="warning">Seleccioná una bodega para administrar los recursos.</NoticeBanner>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary px-6 py-10">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <SectionIntro
          eyebrow="Setup"
          title="Máquinas, implementos, equipos y herramientas"
          description="Catálogos separados de finca y de bodega. Elegí la clase y la categoría; si el recurso está en el catálogo maestro, seleccionalo para autocompletar sus datos. El costo por hora es opcional (lo usa el módulo de costos)."
        />

        {/* Tabs de ámbito */}
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

        {/* Sub-tabs de clase */}
        <div className="flex flex-wrap gap-2">
          {CLASES.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => changeClase(c.value)}
              className={`rounded-[var(--radius-md)] border px-3 py-1.5 text-sm transition ${
                clase === c.value
                  ? "border-[color:var(--accent-primary)] text-[color:var(--accent-primary)]"
                  : "border-[color:var(--border-shell)] text-[color:var(--text-ink-muted)] hover:text-[color:var(--text-ink)]"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {error ? <NoticeBanner tone="danger">{error}</NoticeBanner> : null}

        {/* Form de alta/edición */}
        <AppCard header={<h3 className="text-base font-semibold">{editingId ? "Editar recurso" : "Nuevo recurso"}</h3>}>
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <AppSelect label="Categoría" value={form.categoria} onChange={(e) => void onChangeCategoria(e.target.value)}>
                <option value="">Seleccionar categoría</option>
                {categorias.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
                <option value={OTRA_CATEGORIA}>Otra (especificar)…</option>
              </AppSelect>
              {form.categoria === OTRA_CATEGORIA ? (
                <AppInput label="Especificá la categoría" value={form.categoria_otra} onChange={(e) => setField("categoria_otra", e.target.value)} className="mt-2" />
              ) : null}
            </div>

            {maestro.length > 0 ? (
              <AppSelect label="Recurso del catálogo (autocompleta)" value={selectedMaestroId} onChange={(e) => onChangeMaestro(e.target.value)}>
                <option value={CARGA_MANUAL}>Carga manual…</option>
                {maestro.map((m) => (
                  <option key={m.recurso_maestro_id} value={m.recurso_maestro_id}>
                    {m.nombre}
                    {m.potencia_hp ? ` — ${m.potencia_hp} HP` : ""}
                  </option>
                ))}
              </AppSelect>
            ) : null}

            <AppInput label="Nombre" value={form.nombre} onChange={(e) => setField("nombre", e.target.value)} />

            {esMotriz ? (
              <AppInput label="Potencia (HP)" value={form.potencia_hp} onChange={(e) => setField("potencia_hp", e.target.value)} placeholder="Ej. 75–85" />
            ) : null}
            <AppInput label="Uso principal" value={form.uso_principal} onChange={(e) => setField("uso_principal", e.target.value)} placeholder="Opcional" />
            <AppInput label="Unidad de uso" value={form.unidad_uso} onChange={(e) => setField("unidad_uso", e.target.value)} placeholder="Hora, Día, Evento…" />
            <AppInput label="Consumo / energía" value={form.consumo_descripcion} onChange={(e) => setField("consumo_descripcion", e.target.value)} placeholder="l/h, kWh, Solar…" />
            <AppInput label="Observaciones" value={form.observaciones} onChange={(e) => setField("observaciones", e.target.value)} placeholder="Opcional" />

            {/* Costeo (opcional, lo consume el módulo de costos) */}
            <AppInput label="Costo por hora (opcional)" type="number" min="0" value={form.costo_hora} onChange={(e) => setField("costo_hora", e.target.value)} />
            <AppInput label="Consumo combustible (l/h)" type="number" min="0" value={form.consumo_lts_hora} onChange={(e) => setField("consumo_lts_hora", e.target.value)} />
            <AppInput label="Vigencia del precio" type="date" value={form.vigencia_desde} onChange={(e) => setField("vigencia_desde", e.target.value)} />
          </div>
          <div className="mt-3 flex gap-2">
            <AppButton variant="primary" loading={saving} onClick={() => void handleSave()}>
              {editingId ? "Guardar cambios" : "Crear recurso"}
            </AppButton>
            {editingId ? <AppButton variant="ghost" onClick={resetForm}>Cancelar</AppButton> : null}
          </div>
        </AppCard>

        {/* Listado */}
        <AppCard header={<h3 className="text-base font-semibold">Recursos cargados</h3>}>
          {loading ? (
            <p className="text-sm text-[color:var(--text-ink-muted)]">Cargando…</p>
          ) : recursos.length === 0 ? (
            <p className="text-sm text-[color:var(--text-ink-muted)]">Todavía no hay recursos en este catálogo.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-[color:var(--text-ink-muted)]">
                    <th className="py-2 pr-3">Nombre</th>
                    <th className="py-2 pr-3">Categoría</th>
                    <th className="py-2 pr-3">{esMotriz ? "Potencia" : "Uso principal"}</th>
                    <th className="py-2 pr-3">Unidad</th>
                    <th className="py-2 pr-3">Consumo</th>
                    <th className="py-2 pr-3 text-right">Costo/h</th>
                    <th className="py-2 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {recursos.map((r) => (
                    <tr key={r.tarifa_maquinaria_id} className={`border-t border-[color:var(--border-shell)] ${r.activo ? "" : "opacity-50"}`}>
                      <td className="py-2 pr-3">
                        {r.nombre}
                        {!r.activo ? <span className="ml-2 text-[10px] uppercase text-[color:var(--text-ink-muted)]">inactivo</span> : null}
                      </td>
                      <td className="py-2 pr-3">{r.categoria ?? "—"}</td>
                      <td className="py-2 pr-3">{(esMotriz ? r.potencia_hp : r.uso_principal) ?? "—"}</td>
                      <td className="py-2 pr-3">{r.unidad_uso ?? "—"}</td>
                      <td className="py-2 pr-3">{r.consumo_descripcion ?? "—"}</td>
                      <td className="py-2 pr-3 text-right">{r.costo_hora ?? "—"}</td>
                      <td className="py-2 text-right">
                        <div className="inline-flex gap-1">
                          <AppButton variant="ghost" size="sm" onClick={() => startEdit(r)}>Editar</AppButton>
                          <AppButton variant="ghost" size="sm" onClick={() => void remove(r)}>Borrar</AppButton>
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
