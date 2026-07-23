import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AppButton,
  AppCard,
  AppInput,
  AppSelect,
  AppTabs,
  NoticeBanner,
  SectionIntro,
  useAppNotifications,
} from "../../components/ui";
import { getApiErrorMessage } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import {
  createRecurso,
  deleteRecurso,
  fetchMaestro,
  fetchRecursos,
  patchRecurso,
  type AmbitoRecurso,
  type ClaseRecurso,
  type Recurso,
  type RecursoMaestro,
} from "../../features/recursos/api";

const CARGA_MANUAL = "__manual__";
const OTRO_USO = "__otro__";

// Uso principal sugerido (con opción "Otros"). El valor guardado es la etiqueta.
const USO_PRINCIPAL_OPTIONS = [
  "Viñedos tradicionales",
  "Labores generales",
  "Pulverización, desmalezado",
  "Pulverización pesada, fertilización",
  "Rastras, cinceles, subsolado liviano",
  "Subsolado, labores pesadas",
  "Grandes implementos",
];

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
  categoria: "", // derivada del catálogo (Tractor / Cosecha / Movimiento…), no es un input.
  familia: "",
  nombre: "",
  potencia_hp: "",
  uso_principal: "",
  uso_principal_otro: "",
  unidad_uso: "",
  consumo_descripcion: "",
  observaciones: "",
  costo_hora: "",
  consumo_lts_hora: "",
};

type FormState = typeof EMPTY;

export default function RecursosAdmin() {
  const { notifySuccess, notifyError } = useAppNotifications();
  const bodegaId = useAuthStore((state) => state.activeBodegaId);

  const [ambito, setAmbito] = useState<AmbitoRecurso>("finca");
  const [clase, setClase] = useState<ClaseRecurso>("motriz");
  const [recursos, setRecursos] = useState<Recurso[]>([]);
  const [maestro, setMaestro] = useState<RecursoMaestro[]>([]);
  const [selectedMaestroId, setSelectedMaestroId] = useState<string>(CARGA_MANUAL);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Carga guiada de máquinas motrices (clase = motriz): dos formas distintas.
  const [motrizMode, setMotrizMode] = useState<"tractor" | "autopropulsada">("tractor");
  const [tractorTipo, setTractorTipo] = useState("");     // familia (ej. "Tractor Viñatero Angosto")
  const [tractorPotencia, setTractorPotencia] = useState(""); // potencia_hp (ej. "55–65")
  const [autoCategoria, setAutoCategoria] = useState("");  // función (ej. "Cosecha", "Movimiento")
  const [autoMaquina, setAutoMaquina] = useState("");      // nombre de la máquina

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

  // Catálogo maestro de esta clase (para autocompletar). Ya no depende de categoría.
  const loadMaestro = useCallback(async () => {
    if (!ambito) return;
    try {
      setMaestro(await fetchMaestro(ambito, clase, ""));
    } catch {
      setMaestro([]);
    }
  }, [ambito, clase]);

  useEffect(() => {
    void loadRecursos();
  }, [loadRecursos]);

  useEffect(() => {
    void loadMaestro();
  }, [loadMaestro]);

  const resetForm = () => {
    setForm(EMPTY);
    setEditingId(null);
    setSelectedMaestroId(CARGA_MANUAL);
    resetCascada();
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

  const onChangeMaestro = (maestroId: string) => {
    setSelectedMaestroId(maestroId);
    if (maestroId === CARGA_MANUAL) return;
    const m = maestro.find((x) => x.recurso_maestro_id === maestroId);
    if (!m) return;
    setForm((prev) => ({
      ...prev,
      categoria: m.categoria ?? "",
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

  // ── Cascadas del catálogo motriz ──────────────────────────────────────────
  // Tractores: familia = tipo, potencia_hp = rango. Autopropulsadas: categoria = función.
  const tractores = useMemo(() => maestro.filter((m) => (m.categoria ?? "") === "Tractor"), [maestro]);
  const tiposTractor = useMemo(
    () => [...new Set(tractores.map((m) => m.familia).filter((f): f is string => !!f))],
    [tractores],
  );
  const potenciasTipo = useMemo(() => tractores.filter((m) => m.familia === tractorTipo), [tractores, tractorTipo]);
  const autoprop = useMemo(() => maestro.filter((m) => m.categoria && m.categoria !== "Tractor"), [maestro]);
  const categoriasAuto = useMemo(
    () => [...new Set(autoprop.map((m) => m.categoria).filter((c): c is string => !!c))],
    [autoprop],
  );
  const maquinasCat = useMemo(() => autoprop.filter((m) => m.categoria === autoCategoria), [autoprop, autoCategoria]);

  const applyMaestroRow = (m: RecursoMaestro) => {
    const usoConocido = !!m.uso_principal && USO_PRINCIPAL_OPTIONS.includes(m.uso_principal);
    setForm((prev) => ({
      ...prev,
      categoria: m.categoria ?? "",
      nombre: m.nombre,
      familia: m.familia ?? "",
      potencia_hp: m.potencia_hp ?? "",
      uso_principal: m.uso_principal ? (usoConocido ? m.uso_principal : OTRO_USO) : "",
      uso_principal_otro: m.uso_principal && !usoConocido ? m.uso_principal : "",
      unidad_uso: m.unidad_uso ?? "",
      consumo_descripcion: m.consumo_descripcion ?? "",
    }));
  };

  const onPickTractorTipo = (tipo: string) => { setTractorTipo(tipo); setTractorPotencia(""); };
  const onPickTractorPotencia = (pot: string) => {
    setTractorPotencia(pot);
    const row = tractores.find((m) => m.familia === tractorTipo && (m.potencia_hp ?? "") === pot);
    if (row) applyMaestroRow(row);
  };
  const onPickAutoCategoria = (cat: string) => { setAutoCategoria(cat); setAutoMaquina(""); };
  const onPickAutoMaquina = (nombre: string) => {
    setAutoMaquina(nombre);
    const row = autoprop.find((m) => m.categoria === autoCategoria && m.nombre === nombre);
    if (row) applyMaestroRow(row);
  };

  const resetCascada = () => {
    setTractorTipo("");
    setTractorPotencia("");
    setAutoCategoria("");
    setAutoMaquina("");
  };

  const usoPrincipalFinal = form.uso_principal === OTRO_USO ? form.uso_principal_otro.trim() : form.uso_principal;

  const handleSave = async () => {
    if (!bodegaId) return;
    if (!form.nombre.trim()) {
      notifyError({ title: "Falta el nombre" });
      return;
    }
    // En máquinas motrices la categoría surge del modo: Tractor → "Tractor",
    // Autopropulsada → la función elegida. Así se guarda aunque cargues a mano.
    const categoriaFinal = esMotriz
      ? (motrizMode === "tractor" ? "Tractor" : (autoCategoria || form.categoria))
      : form.categoria;
    const payload = {
      ambito,
      clase,
      categoria: categoriaFinal.trim() || null,
      familia: form.familia.trim() || null,
      nombre: form.nombre.trim(),
      potencia_hp: form.potencia_hp.trim() || null,
      uso_principal: usoPrincipalFinal || null,
      unidad_uso: form.unidad_uso.trim() || null,
      consumo_descripcion: form.consumo_descripcion.trim() || null,
      observaciones: form.observaciones.trim() || null,
      costo_hora: num(form.costo_hora),
      consumo_lts_hora: num(form.consumo_lts_hora),
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
    resetCascada();
    setMotrizMode(r.potencia_hp ? "tractor" : "autopropulsada");
    const usoConocido = !!r.uso_principal && USO_PRINCIPAL_OPTIONS.includes(r.uso_principal);
    setForm({
      categoria: r.categoria ?? "",
      familia: r.familia ?? "",
      nombre: r.nombre,
      potencia_hp: r.potencia_hp ?? "",
      uso_principal: r.uso_principal ? (usoConocido ? r.uso_principal : OTRO_USO) : "",
      uso_principal_otro: r.uso_principal && !usoConocido ? r.uso_principal : "",
      unidad_uso: r.unidad_uso ?? "",
      consumo_descripcion: r.consumo_descripcion ?? "",
      observaciones: r.observaciones ?? "",
      costo_hora: r.costo_hora ?? "",
      consumo_lts_hora: r.consumo_lts_hora ?? "",
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
        <AppTabs items={AMBITOS} value={ambito} onChange={changeAmbito} />

        {/* Sub-tabs de clase */}
        <AppTabs items={CLASES} value={clase} onChange={changeClase} />

        {error ? <NoticeBanner tone="danger">{error}</NoticeBanner> : null}

        {/* Form de alta/edición */}
        <AppCard header={<h3 className="text-base font-semibold">{editingId ? "Editar recurso" : "Nuevo recurso"}</h3>}>
          <div className="grid gap-3 md:grid-cols-3">
            {/* Carga guiada de máquinas motrices: dos formas (Tractor / Autopropulsada). */}
            {esMotriz ? (
              <div className="rounded-[var(--radius-md)] border border-dashed border-[color:var(--border-shell)] p-3 md:col-span-3">
                <AppTabs
                  className="mb-3"
                  size="sm"
                  value={motrizMode}
                  onChange={(m) => { setMotrizMode(m); resetCascada(); }}
                  items={[
                    { value: "tractor", label: "Tractor" },
                    { value: "autopropulsada", label: "Autopropulsada" },
                  ]}
                />
                {motrizMode === "tractor" ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    <AppSelect label="Tipo de tractor" value={tractorTipo} onChange={(e) => onPickTractorTipo(e.target.value)}>
                      <option value="">Seleccionar…</option>
                      {tiposTractor.map((t) => <option key={t} value={t}>{t}</option>)}
                    </AppSelect>
                    <AppSelect label="Potencia (HP)" value={tractorPotencia} onChange={(e) => onPickTractorPotencia(e.target.value)} disabled={!tractorTipo}>
                      <option value="">{tractorTipo ? "Seleccionar…" : "Elegí un tipo primero"}</option>
                      {potenciasTipo.map((m) => (
                        <option key={m.recurso_maestro_id} value={m.potencia_hp ?? ""}>
                          {m.potencia_hp} HP · {m.uso_principal}
                        </option>
                      ))}
                    </AppSelect>
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    <AppSelect label="Categoría / función" value={autoCategoria} onChange={(e) => onPickAutoCategoria(e.target.value)}>
                      <option value="">Seleccionar…</option>
                      {categoriasAuto.map((c) => <option key={c} value={c}>{c}</option>)}
                    </AppSelect>
                    <AppSelect label="Máquina" value={autoMaquina} onChange={(e) => onPickAutoMaquina(e.target.value)} disabled={!autoCategoria}>
                      <option value="">{autoCategoria ? "Seleccionar…" : "Elegí una categoría primero"}</option>
                      {maquinasCat.map((m) => <option key={m.recurso_maestro_id} value={m.nombre}>{m.nombre}</option>)}
                    </AppSelect>
                  </div>
                )}
                <p className="mt-2 text-xs text-[color:var(--text-ink-muted)]">
                  Elegí del catálogo para autocompletar; o completá los campos de abajo a mano (opción "otro").
                </p>
              </div>
            ) : null}

            {!esMotriz && maestro.length > 0 ? (
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
            <div>
              <AppSelect label="Uso principal" value={form.uso_principal} onChange={(e) => setField("uso_principal", e.target.value)}>
                <option value="">Seleccionar…</option>
                {USO_PRINCIPAL_OPTIONS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
                <option value={OTRO_USO}>Otros (especificar)…</option>
              </AppSelect>
              {form.uso_principal === OTRO_USO ? (
                <AppInput label="Especificá el uso" value={form.uso_principal_otro} onChange={(e) => setField("uso_principal_otro", e.target.value)} className="mt-2" />
              ) : null}
            </div>
            <AppInput label="Unidad de uso" value={form.unidad_uso} onChange={(e) => setField("unidad_uso", e.target.value)} placeholder="Hora, Día, Evento…" />
            <AppInput label="Consumo / energía" value={form.consumo_descripcion} onChange={(e) => setField("consumo_descripcion", e.target.value)} placeholder="l/h, kWh, Solar…" />
            <AppInput label="Observaciones" value={form.observaciones} onChange={(e) => setField("observaciones", e.target.value)} placeholder="Opcional" />

            {/* Costeo (opcional, lo consume el módulo de costos) */}
            <AppInput label="Costo por hora (opcional)" type="number" min="0" value={form.costo_hora} onChange={(e) => setField("costo_hora", e.target.value)} />
            <AppInput label="Consumo combustible (l/h)" type="number" min="0" value={form.consumo_lts_hora} onChange={(e) => setField("consumo_lts_hora", e.target.value)} />
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
