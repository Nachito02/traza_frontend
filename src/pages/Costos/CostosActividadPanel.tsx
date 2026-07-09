import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AppButton,
  AppCard,
  AppInput,
  AppSelect,
  AppTextarea,
  NoticeBanner,
  useAppNotifications,
} from "../../components/ui";
import { getApiErrorMessage } from "../../lib/api";
import { nonNeg } from "../../lib/number";
import { fetchOperariosByBodega, type Operario } from "../../features/operarios/api";
import { fetchPersonal, type Personal } from "../../features/personal/api";
import { fetchExistencias, type Existencia } from "../../features/inventario/api";
import PersonalSection from "./PersonalSection";
import { buildPersonalAsignado, payloadToTransitorio, type TransitorioDraft } from "./PersonalTransitorios";
import InsumoPicker, { type AddInsumoLine } from "./InsumoPicker";
import {
  addInsumo,
  addMaquina,
  addContratista,
  deleteInsumo,
  deleteMaquina,
  deleteContratista,
  fetchCostosTarea,
  fetchInsumosCatalogo,
  fetchTarifasMaquinaria,
  fetchSugerencia,
  putEjecucion,
  CATEGORIA_LABEL,
  formatMoney,
  type ActividadCosto,
  type ActividadSugerencia,
  type CostosTarea,
  type InsumoCatalogo,
  type ModalidadEjecucion,
  type TarifaMaquinaria,
} from "../../features/costos/api";

type Props = {
  tareaId: string;
  bodegaId: string | number | null | undefined;
  /** Nombre de la actividad para precargar sugerencias (productividad, equipos, insumos). */
  actividadClave?: string;
  /** En fertilización el insumo es el fertilizante: se resalta la sección Insumos. */
  esFertilizacion?: boolean;
  /** Permite recargar la vista padre cuando cambian los costos. */
  onChanged?: () => void;
};

const MODALIDADES: { value: ModalidadEjecucion; label: string }[] = [
  { value: "propia", label: "Propia" },
  { value: "contratada", label: "Contratada" },
  { value: "mixta", label: "Mixta" },
];

function num(v: string): number | null {
  if (!v.trim()) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Aviso para secciones de costo que normalmente no aplican a la labor. */
function NoAplicaNota({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 rounded-[var(--radius-md)] border border-dashed border-[color:var(--border-shell)] bg-[color:var(--surface-soft)] px-3 py-2 text-xs text-[color:var(--text-ink-muted)]">
      {children} Podés cargarlo igual si esta vez se usó.
    </p>
  );
}

export default function CostosActividadPanel({ tareaId, bodegaId, actividadClave, esFertilizacion, onChanged }: Props) {
  const { notifySuccess, notifyError } = useAppNotifications();
  const [data, setData] = useState<CostosTarea | null>(null);
  const [tarifasMaq, setTarifasMaq] = useState<TarifaMaquinaria[]>([]);
  const [insumos, setInsumos] = useState<InsumoCatalogo[]>([]);
  const [existencias, setExistencias] = useState<Record<string, Existencia>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form: ejecución
  const [modalidad, setModalidad] = useState<ModalidadEjecucion>("propia");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [superficie, setSuperficie] = useState("");
  const [cantEjec, setCantEjec] = useState("");
  const [unidadEjec, setUnidadEjec] = useState("");
  const [horasGen, setHorasGen] = useState("");
  const [responsableId, setResponsableId] = useState("");
  // Personal asignado con horas por operario: { user_id: "horas" }
  const [personal, setPersonal] = useState<Record<string, string>>({});
  const [transitorios, setTransitorios] = useState<TransitorioDraft[]>([]);
  const [personalQuery, setPersonalQuery] = useState("");
  const [operarios, setOperarios] = useState<Operario[]>([]);
  const [personalList, setPersonalList] = useState<Personal[]>([]);
  const [sugerencia, setSugerencia] = useState<ActividadSugerencia | null>(null);
  const [obs, setObs] = useState("");
  const [savingEjec, setSavingEjec] = useState(false);

  // Form: mano de obra contratada (detallada)
  const [conCuadrilla, setConCuadrilla] = useState("");
  const [conCantOp, setConCantOp] = useState("");
  const [conHoras, setConHoras] = useState("");
  const [conJornales, setConJornales] = useState("");
  const [conMonto, setConMonto] = useState("");
  const [addingCon, setAddingCon] = useState(false);

  // Form: máquina / equipo
  const [maqTarifaId, setMaqTarifaId] = useState("");
  const [maqCantidad, setMaqCantidad] = useState("");
  const [maqHoras, setMaqHoras] = useState("");
  const [maqConsumo, setMaqConsumo] = useState("");
  const [addingMaq, setAddingMaq] = useState(false);


  const loadExistencias = useCallback(async () => {
    if (!bodegaId) return;
    try {
      const ex = await fetchExistencias(bodegaId);
      setExistencias(Object.fromEntries(ex.map((e) => [e.insumo_id, e])));
    } catch {
      /* el stock es informativo: si falla no rompe la carga */
    }
  }, [bodegaId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [costos, maq, ins, ops, per, sug] = await Promise.all([
        fetchCostosTarea(tareaId),
        bodegaId ? fetchTarifasMaquinaria(bodegaId) : Promise.resolve([] as TarifaMaquinaria[]),
        fetchInsumosCatalogo(bodegaId ?? undefined),
        bodegaId ? fetchOperariosByBodega(bodegaId).catch(() => [] as Operario[]) : Promise.resolve([] as Operario[]),
        bodegaId ? fetchPersonal(bodegaId).catch(() => [] as Personal[]) : Promise.resolve([] as Personal[]),
        actividadClave ? fetchSugerencia(actividadClave).catch(() => null) : Promise.resolve(null),
      ]);
      setData(costos);
      setTarifasMaq(maq);
      setInsumos(ins);
      void loadExistencias();
      setOperarios(ops);
      setPersonalList(per.filter((p) => p.activo));
      setSugerencia(sug);
      // Prefill de unidad de productividad desde la sugerencia (si no hay ejecución previa).
      if (sug?.productividad_unidad && !costos.ejecucion?.unidad_ejecutada) {
        setUnidadEjec(sug.productividad_unidad);
      }
      if (costos.ejecucion) {
        const e = costos.ejecucion;
        setModalidad(e.modalidad);
        setFechaInicio(e.fecha_inicio ? e.fecha_inicio.slice(0, 10) : "");
        setFechaFin(e.fecha_fin ? e.fecha_fin.slice(0, 10) : "");
        setSuperficie(e.superficie_intervenida ?? "");
        setCantEjec(e.cantidad_ejecutada ?? "");
        setUnidadEjec(e.unidad_ejecutada ?? "");
        setHorasGen(e.horas_generales ?? "");
        setResponsableId(e.responsable_user_id ?? "");
        const asignado = e.personal_asignado ?? [];
        setPersonal(
          Object.fromEntries(
            asignado
              .filter((p) => p.personal_id)
              .map((p) => [p.personal_id as string, p.horas != null ? String(p.horas) : ""]),
          ),
        );
        setTransitorios(
          asignado.filter((p) => p.transitorio || !p.personal_id).map(payloadToTransitorio),
        );
        setObs(e.observaciones ?? "");
      }
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [tareaId, bodegaId, actividadClave, loadExistencias]);

  useEffect(() => {
    void load();
  }, [load]);

  const refresh = useCallback(async () => {
    try {
      const costos = await fetchCostosTarea(tareaId);
      setData(costos);
      onChanged?.();
    } catch {
      /* noop */
    }
  }, [tareaId, onChanged]);

  const requiresContratista = modalidad === "contratada" || modalidad === "mixta";
  // Secciones que la labor normalmente no usa (se atenúan, no se ocultan).
  const aplicaMaquinaria = !sugerencia || sugerencia.aplica_maquinaria;
  const aplicaCombustible = !sugerencia || sugerencia.aplica_combustible;
  const aplicaInsumos = !sugerencia || sugerencia.aplica_insumos;

  const handleSaveEjecucion = async () => {
    const sup = num(superficie);
    if (!sup || sup <= 0) {
      notifyError({ title: "Falta superficie", message: "La superficie intervenida debe ser mayor a 0." });
      return;
    }
    setSavingEjec(true);
    try {
      await putEjecucion(tareaId, {
        modalidad,
        fecha_inicio: fechaInicio || null,
        fecha_fin: fechaFin || null,
        superficie_intervenida: sup,
        cantidad_ejecutada: num(cantEjec),
        unidad_ejecutada: unidadEjec.trim() || null,
        horas_generales: num(horasGen),
        responsable_user_id: responsableId || null,
        personal_asignado: buildPersonalAsignado(personal, personalList, transitorios),
        observaciones: obs.trim() || null,
      });
      notifySuccess({ title: "Ejecución guardada" });
      await refresh();
    } catch (e) {
      notifyError({ title: "Error al guardar", message: getApiErrorMessage(e) });
    } finally {
      setSavingEjec(false);
    }
  };

  const handleAddMaquina = async () => {
    const horas = num(maqHoras);
    if (!maqTarifaId) {
      notifyError({ title: "Elegí una máquina", message: "Seleccioná una máquina del catálogo." });
      return;
    }
    if (!horas || horas <= 0) {
      notifyError({ title: "Faltan horas", message: "Indicá las horas de utilización." });
      return;
    }
    const tarifa = tarifasMaq.find((t) => t.tarifa_maquinaria_id === maqTarifaId);
    if (!tarifa) return;
    setAddingMaq(true);
    try {
      await addMaquina(tareaId, {
        tarifa_maquinaria_id: tarifa.tarifa_maquinaria_id,
        nombre: tarifa.nombre,
        clase: tarifa.clase,
        cantidad: maqCantidad.trim() ? Math.trunc(Number(maqCantidad)) : null,
        horas,
        consumo_combustible_lts: num(maqConsumo),
      });
      setMaqTarifaId("");
      setMaqCantidad("");
      setMaqHoras("");
      setMaqConsumo("");
      notifySuccess({ title: "Máquina agregada" });
      await refresh();
    } catch (e) {
      notifyError({ title: "Error", message: getApiErrorMessage(e) });
    } finally {
      setAddingMaq(false);
    }
  };

  const handleDeleteMaquina = async (id: string) => {
    try {
      await deleteMaquina(id);
      await refresh();
    } catch (e) {
      notifyError({ title: "Error", message: getApiErrorMessage(e) });
    }
  };

  const handleAddInsumo = async (line: AddInsumoLine) => {
    await addInsumo(tareaId, {
      insumo_id: line.insumo.insumo_id,
      dosis_ha: line.dosis_ha,
      unidad_dosis: line.unidad_dosis,
      cantidad_total: line.cantidad_total,
    });
    notifySuccess({ title: "Insumo agregado" });
    await Promise.all([refresh(), loadExistencias()]);
  };

  const handleDeleteInsumo = async (id: string) => {
    try {
      await deleteInsumo(id);
      await Promise.all([refresh(), loadExistencias()]);
    } catch (e) {
      notifyError({ title: "Error", message: getApiErrorMessage(e) });
    }
  };

  const handleAddContratista = async () => {
    const monto = num(conMonto);
    if (!conCuadrilla.trim()) {
      notifyError({ title: "Falta la cuadrilla", message: "Indicá el contratista / cuadrilla." });
      return;
    }
    if (!monto || monto <= 0) {
      notifyError({ title: "Falta el monto", message: "Indicá el monto cobrado por el contratista." });
      return;
    }
    setAddingCon(true);
    try {
      await addContratista(tareaId, {
        cuadrilla: conCuadrilla.trim(),
        cantidad_operarios: conCantOp.trim() ? Math.trunc(Number(conCantOp)) : null,
        horas: num(conHoras),
        jornales: num(conJornales),
        monto,
      });
      setConCuadrilla("");
      setConCantOp("");
      setConHoras("");
      setConJornales("");
      setConMonto("");
      notifySuccess({ title: "Contratista agregado" });
      await refresh();
    } catch (e) {
      notifyError({ title: "Error", message: getApiErrorMessage(e) });
    } finally {
      setAddingCon(false);
    }
  };

  const handleDeleteContratista = async (id: string) => {
    try {
      await deleteContratista(id);
      await refresh();
    } catch (e) {
      notifyError({ title: "Error", message: getApiErrorMessage(e) });
    }
  };

  const costosByCat = useMemo(() => {
    const map = new Map<string, ActividadCosto>();
    (data?.costos ?? []).forEach((c) => map.set(c.categoria, c));
    return map;
  }, [data]);

  // Indicadores de productividad calculados en vivo a partir de lo cargado.
  // Horas-hombre y jornales calculados a partir de las horas por operario.
  const horasHombre = useMemo(
    () => Object.values(personal).reduce((acc, h) => acc + (Number(h) > 0 ? Number(h) : 0), 0),
    [personal],
  );
  const cantOperariosSel = useMemo(() => Object.keys(personal).length, [personal]);
  const jornalesAuto = horasHombre > 0 ? Math.round((horasHombre / 8) * 100) / 100 : 0;

  const indicadores = useMemo(() => {
    const out: { label: string; value: string }[] = [];
    const sup = num(superficie);
    const jornalesTotal = jornalesAuto;
    const cantEjecN = num(cantEjec);
    const fmt = (n: number) => (Math.round(n * 100) / 100).toString();
    if (sup && sup > 0) {
      if (jornalesTotal > 0) out.push({ label: "Jornales/ha", value: fmt(jornalesTotal / sup) });
      if (horasHombre > 0) out.push({ label: "Horas-hombre/ha", value: fmt(horasHombre / sup) });
      if (cantEjecN && cantEjecN > 0) {
        out.push({ label: `${unidadEjec || "Cantidad"}/ha`, value: fmt(cantEjecN / sup) });
      }
    }
    if (cantOperariosSel > 0 && jornalesTotal > 0) {
      out.push({ label: "Jornales/operario", value: fmt(jornalesTotal / cantOperariosSel) });
    }
    return out;
  }, [superficie, cantEjec, unidadEjec, horasHombre, jornalesAuto, cantOperariosSel]);

  if (loading) {
    return <p className="text-sm text-[color:var(--text-ink-muted)]">Cargando costos…</p>;
  }
  if (error) {
    return <NoticeBanner tone="danger">{error}</NoticeBanner>;
  }

  return (
    <div className="space-y-4">
      {/* Resumen de costos */}
      <AppCard tone="soft" padding="md">
        <div className="flex items-center justify-between">
          <h4 className="text-base font-semibold">Costos de la actividad</h4>
          <div className="text-right">
            <div className="text-lg font-bold text-[color:var(--text-accent)]">
              {formatMoney(data?.total ?? 0)}
            </div>
            {data?.costoPorHa != null ? (
              <div className="text-xs text-[color:var(--text-ink-muted)]">
                {formatMoney(data.costoPorHa)} / ha
              </div>
            ) : null}
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {(["mano_obra", "maquinaria", "combustible", "insumos", "contratista"] as const).map((cat) => (
            <div key={cat} className="rounded-[var(--radius-md)] border border-[color:var(--border-shell)] px-3 py-2">
              <div className="text-[11px] uppercase tracking-wide text-[color:var(--text-ink-muted)]">
                {CATEGORIA_LABEL[cat]}
              </div>
              <div className="text-sm font-semibold">
                {formatMoney(Number(costosByCat.get(cat)?.monto ?? 0))}
              </div>
            </div>
          ))}
        </div>
      </AppCard>

      {/* Ejecución: superficie + mano de obra */}
      <AppCard tone="default" padding="md" header={<h4 className="text-sm font-semibold">Superficie y mano de obra</h4>}>
        {sugerencia && (sugerencia.productividad_label || sugerencia.equipos_sugeridos.length > 0 || sugerencia.insumos_sugeridos.length > 0) ? (
          <div className="mb-3 rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-accent-soft)] px-3 py-2 text-xs text-[color:var(--text-ink-muted)]">
            {sugerencia.productividad_label ? (
              <div>Productividad sugerida: <span className="font-semibold text-[color:var(--text-ink)]">{sugerencia.productividad_label}</span></div>
            ) : null}
            {sugerencia.equipos_sugeridos.length > 0 ? (
              <div>Equipos sugeridos: {sugerencia.equipos_sugeridos.join(", ")}</div>
            ) : null}
            {sugerencia.insumos_sugeridos.length > 0 ? (
              <div>Insumos sugeridos: {sugerencia.insumos_sugeridos.join(", ")}</div>
            ) : null}
          </div>
        ) : null}
        <div className="grid gap-3 md:grid-cols-2">
          <AppSelect label="Modalidad de ejecución" value={modalidad} onChange={(e) => setModalidad(e.target.value as ModalidadEjecucion)}>
            {MODALIDADES.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </AppSelect>
          <AppInput label="Superficie intervenida (ha)" type="number" min="0" value={superficie} onChange={(e) => setSuperficie(nonNeg(e.target.value))} />
          <AppInput label="Fecha de inicio" type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
          <AppInput label="Fecha de fin" type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
          <AppInput label="Cantidad ejecutada" type="number" min="0" value={cantEjec} onChange={(e) => setCantEjec(nonNeg(e.target.value))} placeholder="ej. 4500" />
          <AppInput label="Unidad (plantas, kg, m…)" value={unidadEjec} onChange={(e) => setUnidadEjec(e.target.value)} placeholder="plantas" />
          <AppSelect label="Responsable de ejecución" value={responsableId} onChange={(e) => setResponsableId(e.target.value)}>
            <option value="">Sin responsable</option>
            {operarios.map((o) => (
              <option key={o.user_id} value={o.user_id}>{o.nombre}</option>
            ))}
          </AppSelect>
        </div>

        {/* Personal asignado + transitorios (bloque compartido con el registro) */}
        <PersonalSection
          personalList={personalList}
          personal={personal}
          setPersonal={setPersonal}
          personalQuery={personalQuery}
          setPersonalQuery={setPersonalQuery}
          transitorios={transitorios}
          setTransitorios={setTransitorios}
          horasHombre={horasHombre}
          jornalesAuto={jornalesAuto}
        />

        {requiresContratista ? (
          <p className="mt-2 text-xs text-[color:var(--text-ink-muted)]">
            La mano de obra contratada se carga abajo, en su propio bloque.
          </p>
        ) : null}

        {/* Indicadores en vivo (productividad) */}
        {indicadores.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {indicadores.map((ind) => (
              <span
                key={ind.label}
                className="rounded-[var(--radius-md)] border border-[color:var(--border-shell)] bg-[color:var(--surface-soft)] px-3 py-1 text-xs"
              >
                <span className="text-[color:var(--text-ink-muted)]">{ind.label}: </span>
                <span className="font-semibold">{ind.value}</span>
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-3">
          <AppTextarea label="Observaciones" value={obs} onChange={(e) => setObs(e.target.value)} />
        </div>
        <div className="mt-3">
          <AppButton variant="primary" loading={savingEjec} onClick={() => void handleSaveEjecucion()}>
            Guardar ejecución
          </AppButton>
        </div>
      </AppCard>

      {/* Mano de obra contratada (detallada) */}
      <AppCard tone="default" padding="md" header={<h4 className="text-sm font-semibold">Mano de obra contratada</h4>}>
        {(data?.contratistas ?? []).length > 0 ? (
          <ul className="mb-3 space-y-2">
            {data!.contratistas.map((c) => (
              <li key={c.actividad_contratista_id} className="flex items-center justify-between rounded-[var(--radius-md)] border border-[color:var(--border-shell)] px-3 py-2 text-sm">
                <span>
                  <strong>{c.cuadrilla}</strong>
                  {c.cantidad_operarios ? ` · ${c.cantidad_operarios} op.` : ""}
                  {c.horas ? ` · ${c.horas} h` : ""}
                  {c.jornales ? ` · ${c.jornales} jorn.` : ""}
                  {` · ${formatMoney(Number(c.monto))}`}
                </span>
                <AppButton variant="ghost" size="sm" onClick={() => void handleDeleteContratista(c.actividad_contratista_id)}>
                  Quitar
                </AppButton>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mb-3 text-xs text-[color:var(--text-ink-muted)]">Sin contratistas registrados.</p>
        )}
        <div className="grid gap-3 md:grid-cols-3">
          <AppInput label="Cuadrilla / contratista" value={conCuadrilla} onChange={(e) => setConCuadrilla(e.target.value)} />
          <AppInput label="Cantidad de operarios" type="number" min="0" value={conCantOp} onChange={(e) => setConCantOp(nonNeg(e.target.value))} />
          <AppInput label="Horas" type="number" min="0" value={conHoras} onChange={(e) => setConHoras(nonNeg(e.target.value))} />
          <AppInput label="Jornales" type="number" min="0" value={conJornales} onChange={(e) => setConJornales(nonNeg(e.target.value))} />
          <AppInput label="Monto cobrado" type="number" min="0" value={conMonto} onChange={(e) => setConMonto(nonNeg(e.target.value))} />
        </div>
        <div className="mt-3">
          <AppButton variant="secondary" loading={addingCon} onClick={() => void handleAddContratista()}>
            Agregar contratista
          </AppButton>
        </div>
      </AppCard>

      {/* Máquinas */}
      <AppCard
        tone="default"
        padding="md"
        className={!aplicaMaquinaria ? "opacity-70" : undefined}
        header={<h4 className="text-sm font-semibold">Máquinas y equipos</h4>}
      >
        {!aplicaMaquinaria ? (
          <NoAplicaNota>Esta labor es manual y normalmente no usa maquinaria.</NoAplicaNota>
        ) : null}
        {(data?.maquinas ?? []).length > 0 ? (
          <ul className="mb-3 space-y-2">
            {data!.maquinas.map((m) => (
              <li key={m.actividad_maquina_id} className="flex items-center justify-between rounded-[var(--radius-md)] border border-[color:var(--border-shell)] px-3 py-2 text-sm">
                <span>
                  <strong>{m.nombre}</strong> · {m.clase} · {m.horas} h
                  {m.consumo_combustible_lts ? ` · ${m.consumo_combustible_lts} lt` : ""}
                  {m.costo_total ? ` · ${formatMoney(Number(m.costo_total))}` : ""}
                </span>
                <AppButton variant="ghost" size="sm" onClick={() => void handleDeleteMaquina(m.actividad_maquina_id)}>
                  Quitar
                </AppButton>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mb-3 text-xs text-[color:var(--text-ink-muted)]">Sin máquinas registradas.</p>
        )}
        <div className="grid gap-3 md:grid-cols-4">
          <AppSelect label="Máquina / equipo" value={maqTarifaId} onChange={(e) => setMaqTarifaId(e.target.value)}>
            <option value="">Seleccionar…</option>
            {tarifasMaq.map((t) => (
              <option key={t.tarifa_maquinaria_id} value={t.tarifa_maquinaria_id}>
                {t.nombre} ({t.clase})
              </option>
            ))}
          </AppSelect>
          <AppInput label="Cantidad" type="number" value={maqCantidad} onChange={(e) => setMaqCantidad(e.target.value)} placeholder="opcional" />
          <AppInput label="Horas de uso" type="number" value={maqHoras} onChange={(e) => setMaqHoras(e.target.value)} />
          <AppInput
            label={aplicaCombustible ? "Combustible (lt, opcional)" : "Combustible (lt) · no habitual"}
            type="number"
            value={maqConsumo}
            onChange={(e) => setMaqConsumo(e.target.value)}
            className={!aplicaCombustible ? "opacity-70" : undefined}
          />
        </div>
        <div className="mt-3">
          <AppButton variant="secondary" loading={addingMaq} onClick={() => void handleAddMaquina()}>
            Agregar máquina
          </AppButton>
        </div>
      </AppCard>

      {/* Insumos */}
      <AppCard
        tone="default"
        padding="md"
        className={!aplicaInsumos ? "opacity-70" : undefined}
        header={<h4 className="text-sm font-semibold">{esFertilizacion ? "Fertilizante / insumos" : "Insumos"}</h4>}
      >
        {!aplicaInsumos ? (
          <NoAplicaNota>Esta labor normalmente no lleva insumos.</NoAplicaNota>
        ) : null}
        {esFertilizacion ? (
          <p className="mb-3 rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-accent-soft)] px-3 py-2 text-xs text-[color:var(--text-ink-muted)]">
            Cargá acá el fertilizante desde tu catálogo: se registra el insumo y <strong>descuenta stock</strong> automáticamente.
          </p>
        ) : null}
        {(data?.insumos ?? []).length > 0 ? (
          <ul className="mb-3 space-y-2">
            {data!.insumos.map((ins) => (
              <li key={ins.actividad_insumo_id} className="flex items-center justify-between rounded-[var(--radius-md)] border border-[color:var(--border-shell)] px-3 py-2 text-sm">
                <span>
                  <strong>{ins.descripcion}</strong> · {ins.dosis_ha} {ins.unidad_dosis} · total {ins.cantidad_total} {ins.unidad_total}
                  {ins.costo_total ? ` · ${formatMoney(Number(ins.costo_total))}` : ""}
                </span>
                <AppButton variant="ghost" size="sm" onClick={() => void handleDeleteInsumo(ins.actividad_insumo_id)}>
                  Quitar
                </AppButton>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mb-3 text-xs text-[color:var(--text-ink-muted)]">Sin insumos registrados.</p>
        )}
        <InsumoPicker
          insumos={insumos}
          existencias={existencias}
          onAdd={handleAddInsumo}
          onError={(message) => notifyError({ title: "No se pudo agregar", message })}
        />
      </AppCard>
    </div>
  );
}
