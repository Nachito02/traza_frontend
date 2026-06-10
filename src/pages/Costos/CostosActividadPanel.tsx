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
import {
  addInsumo,
  addMaquina,
  deleteInsumo,
  deleteMaquina,
  fetchCostosTarea,
  fetchInsumosCatalogo,
  fetchTarifasMaquinaria,
  putEjecucion,
  CATEGORIA_LABEL,
  formatMoney,
  type ActividadCosto,
  type CostosTarea,
  type InsumoCatalogo,
  type ModalidadEjecucion,
  type TarifaMaquinaria,
} from "../../features/costos/api";

type Props = {
  tareaId: string;
  bodegaId: string | number | null | undefined;
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

export default function CostosActividadPanel({ tareaId, bodegaId, onChanged }: Props) {
  const { notifySuccess, notifyError } = useAppNotifications();
  const [data, setData] = useState<CostosTarea | null>(null);
  const [tarifasMaq, setTarifasMaq] = useState<TarifaMaquinaria[]>([]);
  const [insumos, setInsumos] = useState<InsumoCatalogo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form: ejecución
  const [modalidad, setModalidad] = useState<ModalidadEjecucion>("propia");
  const [superficie, setSuperficie] = useState("");
  const [jornGen, setJornGen] = useState("");
  const [jornTrac, setJornTrac] = useState("");
  const [horasTec, setHorasTec] = useState("");
  const [contratista, setContratista] = useState("");
  const [montoContratista, setMontoContratista] = useState("");
  const [obs, setObs] = useState("");
  const [savingEjec, setSavingEjec] = useState(false);

  // Form: máquina
  const [maqTarifaId, setMaqTarifaId] = useState("");
  const [maqHoras, setMaqHoras] = useState("");
  const [maqConsumo, setMaqConsumo] = useState("");
  const [addingMaq, setAddingMaq] = useState(false);

  // Form: insumo
  const [insId, setInsId] = useState("");
  const [insDosis, setInsDosis] = useState("");
  const [insUnidadDosis, setInsUnidadDosis] = useState("kg/ha");
  const [insCantidad, setInsCantidad] = useState("");
  const [addingIns, setAddingIns] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [costos, maq, ins] = await Promise.all([
        fetchCostosTarea(tareaId),
        bodegaId ? fetchTarifasMaquinaria(bodegaId) : Promise.resolve([] as TarifaMaquinaria[]),
        fetchInsumosCatalogo(bodegaId ?? undefined),
      ]);
      setData(costos);
      setTarifasMaq(maq);
      setInsumos(ins);
      if (costos.ejecucion) {
        const e = costos.ejecucion;
        setModalidad(e.modalidad);
        setSuperficie(e.superficie_intervenida ?? "");
        setJornGen(e.jornales_generales ?? "");
        setJornTrac(e.jornales_tractorista ?? "");
        setHorasTec(e.horas_tecnico ?? "");
        setContratista(e.contratista ?? "");
        setMontoContratista(e.monto_contratista ?? "");
        setObs(e.observaciones ?? "");
      }
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [tareaId, bodegaId]);

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

  const handleSaveEjecucion = async () => {
    const sup = num(superficie);
    if (!sup || sup <= 0) {
      notifyError({ title: "Falta superficie", message: "La superficie intervenida debe ser mayor a 0." });
      return;
    }
    if (requiresContratista && (!contratista.trim() || num(montoContratista) === null)) {
      notifyError({
        title: "Datos de contratista",
        message: "En modalidad contratada/mixta se requiere contratista y monto.",
      });
      return;
    }
    setSavingEjec(true);
    try {
      await putEjecucion(tareaId, {
        modalidad,
        superficie_intervenida: sup,
        jornales_generales: num(jornGen),
        jornales_tractorista: num(jornTrac),
        horas_tecnico: num(horasTec),
        contratista: contratista.trim() || null,
        monto_contratista: num(montoContratista),
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
        horas,
        consumo_combustible_lts: num(maqConsumo),
      });
      setMaqTarifaId("");
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

  const handleAddInsumo = async () => {
    const dosis = num(insDosis);
    const cantidad = num(insCantidad);
    if (!insId) {
      notifyError({ title: "Elegí un insumo", message: "Seleccioná un insumo del catálogo." });
      return;
    }
    if (!dosis || dosis <= 0 || !cantidad || cantidad <= 0) {
      notifyError({ title: "Faltan datos", message: "Dosis por ha y cantidad total son obligatorias." });
      return;
    }
    setAddingIns(true);
    try {
      await addInsumo(tareaId, {
        insumo_id: insId,
        dosis_ha: dosis,
        unidad_dosis: insUnidadDosis.trim() || "kg/ha",
        cantidad_total: cantidad,
      });
      setInsId("");
      setInsDosis("");
      setInsCantidad("");
      notifySuccess({ title: "Insumo agregado" });
      await refresh();
    } catch (e) {
      notifyError({ title: "Error", message: getApiErrorMessage(e) });
    } finally {
      setAddingIns(false);
    }
  };

  const handleDeleteInsumo = async (id: string) => {
    try {
      await deleteInsumo(id);
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
        <div className="grid gap-3 md:grid-cols-2">
          <AppSelect label="Modalidad de ejecución" value={modalidad} onChange={(e) => setModalidad(e.target.value as ModalidadEjecucion)}>
            {MODALIDADES.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </AppSelect>
          <AppInput label="Superficie intervenida (ha)" type="number" value={superficie} onChange={(e) => setSuperficie(e.target.value)} />
          <AppInput label="Jornales operarios generales" type="number" value={jornGen} onChange={(e) => setJornGen(e.target.value)} />
          <AppInput label="Jornales tractorista" type="number" value={jornTrac} onChange={(e) => setJornTrac(e.target.value)} />
          <AppInput label="Horas técnico" type="number" value={horasTec} onChange={(e) => setHorasTec(e.target.value)} />
          {requiresContratista ? (
            <>
              <AppInput label="Contratista" value={contratista} onChange={(e) => setContratista(e.target.value)} />
              <AppInput label="Monto contratista" type="number" value={montoContratista} onChange={(e) => setMontoContratista(e.target.value)} />
            </>
          ) : null}
        </div>
        <div className="mt-3">
          <AppTextarea label="Observaciones" value={obs} onChange={(e) => setObs(e.target.value)} />
        </div>
        <div className="mt-3">
          <AppButton variant="primary" loading={savingEjec} onClick={() => void handleSaveEjecucion()}>
            Guardar ejecución
          </AppButton>
        </div>
      </AppCard>

      {/* Máquinas */}
      <AppCard tone="default" padding="md" header={<h4 className="text-sm font-semibold">Máquinas e implementos</h4>}>
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
        <div className="grid gap-3 md:grid-cols-3">
          <AppSelect label="Máquina (catálogo)" value={maqTarifaId} onChange={(e) => setMaqTarifaId(e.target.value)}>
            <option value="">Seleccionar…</option>
            {tarifasMaq.map((t) => (
              <option key={t.tarifa_maquinaria_id} value={t.tarifa_maquinaria_id}>
                {t.nombre} ({t.clase})
              </option>
            ))}
          </AppSelect>
          <AppInput label="Horas de uso" type="number" value={maqHoras} onChange={(e) => setMaqHoras(e.target.value)} />
          <AppInput label="Combustible (lt, opcional)" type="number" value={maqConsumo} onChange={(e) => setMaqConsumo(e.target.value)} />
        </div>
        <div className="mt-3">
          <AppButton variant="secondary" loading={addingMaq} onClick={() => void handleAddMaquina()}>
            Agregar máquina
          </AppButton>
        </div>
      </AppCard>

      {/* Insumos */}
      <AppCard tone="default" padding="md" header={<h4 className="text-sm font-semibold">Insumos</h4>}>
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
        <div className="grid gap-3 md:grid-cols-4">
          <AppSelect label="Insumo" value={insId} onChange={(e) => setInsId(e.target.value)}>
            <option value="">Seleccionar…</option>
            {insumos.map((i) => (
              <option key={i.insumo_id} value={i.insumo_id}>
                {i.nombre_comercial} ({i.tipo})
              </option>
            ))}
          </AppSelect>
          <AppInput label="Dosis por ha" type="number" value={insDosis} onChange={(e) => setInsDosis(e.target.value)} />
          <AppInput label="Unidad dosis" value={insUnidadDosis} onChange={(e) => setInsUnidadDosis(e.target.value)} />
          <AppInput label="Cantidad total" type="number" value={insCantidad} onChange={(e) => setInsCantidad(e.target.value)} />
        </div>
        <div className="mt-3">
          <AppButton variant="secondary" loading={addingIns} onClick={() => void handleAddInsumo()}>
            Agregar insumo
          </AppButton>
        </div>
      </AppCard>
    </div>
  );
}
