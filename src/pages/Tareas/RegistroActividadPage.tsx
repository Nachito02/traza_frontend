import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AppButton,
  AppCard,
  AppInput,
  AppSelect,
  AppTextarea,
  NoticeBanner,
  SectionIntro,
  useAppNotifications,
} from "../../components/ui";
import { getApiErrorMessage } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import { useOperacionStore } from "../../store/operacionStore";
import { useFincasStore } from "../../features/fincas/store";
import { fetchCuartelesByFinca, type Cuartel } from "../../features/cuarteles/api";
import { fetchProtocolos, fetchProtocoloById } from "../../features/protocolos/api";
import { registrarActividad } from "../../features/encargos/api";
import { fetchOperariosByBodega, type Operario } from "../../features/operarios/api";
import { fetchPersonal, type Personal } from "../../features/personal/api";
import { fetchExistencias, type Existencia } from "../../features/inventario/api";
import {
  fetchTarifasMaquinaria,
  fetchInsumosCatalogo,
  fetchSugerencia,
  type TarifaMaquinaria,
  type InsumoCatalogo,
  type ActividadSugerencia,
  type ModalidadEjecucion,
} from "../../features/costos/api";
import { isSetupOnlyProtocolItem } from "./tareas.helpers";
import EventoFields from "./components/EventoFields";
import { EVENTO_CONFIG } from "../Trazabilidad/eventoConfig";

type ProcesoOption = { proceso_id: string; nombre: string; evento_tipo: string; etapaNombre: string };

type MaquinaDraft = { tarifa_maquinaria_id: string; nombre: string; clase: string; cantidad: string; horas: string };
type InsumoDraft = { insumo_id: string; descripcion: string; dosis_ha: string; unidad_dosis: string; cantidad_total: string; unidad_total: string };
type ContratistaDraft = { cuadrilla: string; cantidad_operarios: string; horas: string; monto: string };

const MODALIDADES: { value: ModalidadEjecucion; label: string }[] = [
  { value: "propia", label: "Propia" },
  { value: "contratada", label: "Contratada" },
  { value: "mixta", label: "Mixta" },
];

const numOrNull = (v: string): number | null => {
  if (!v.trim()) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export default function RegistroActividadPage() {
  const { notifySuccess, notifyError } = useAppNotifications();
  const bodegaId = useAuthStore((state) => state.activeBodegaId);
  const activeProtocoloId = useOperacionStore((state) => state.activeProtocoloId);
  const fincas = useFincasStore((state) => state.fincas);
  const loadFincas = useFincasStore((state) => state.loadFincas);

  // Catálogos
  const [procesos, setProcesos] = useState<ProcesoOption[]>([]);
  const [loadingProcesos, setLoadingProcesos] = useState(true);
  const [cuarteles, setCuarteles] = useState<Cuartel[]>([]);
  const [operarios, setOperarios] = useState<Operario[]>([]);
  const [personalList, setPersonalList] = useState<Personal[]>([]);
  const [tarifasMaq, setTarifasMaq] = useState<TarifaMaquinaria[]>([]);
  const [insumosCat, setInsumosCat] = useState<InsumoCatalogo[]>([]);
  const [existencias, setExistencias] = useState<Record<string, Existencia>>({});
  const [sugerencia, setSugerencia] = useState<ActividadSugerencia | null>(null);

  // Actividad
  const [procesoId, setProcesoId] = useState("");
  const [fincaId, setFincaId] = useState("");
  const [cuartelId, setCuartelId] = useState("");
  const [draft, setDraft] = useState<Record<string, string>>({});

  // Ejecución
  const [modalidad, setModalidad] = useState<ModalidadEjecucion>("propia");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [superficie, setSuperficie] = useState("");
  const [cantEjec, setCantEjec] = useState("");
  const [unidadEjec, setUnidadEjec] = useState("");
  const [responsableId, setResponsableId] = useState("");
  const [personal, setPersonal] = useState<Record<string, string>>({});
  const [personalQuery, setPersonalQuery] = useState("");
  const [obs, setObs] = useState("");

  // Listas de costo (draft, sin guardar hasta el submit final)
  const [maquinas, setMaquinas] = useState<MaquinaDraft[]>([]);
  const [maqTarifaId, setMaqTarifaId] = useState("");
  const [maqCantidad, setMaqCantidad] = useState("");
  const [maqHoras, setMaqHoras] = useState("");

  const [insumos, setInsumos] = useState<InsumoDraft[]>([]);
  const [insId, setInsId] = useState("");
  const [insDosis, setInsDosis] = useState("");
  const [insUnidadDosis, setInsUnidadDosis] = useState("kg/ha");
  const [insCantidad, setInsCantidad] = useState("");

  const [contratistas, setContratistas] = useState<ContratistaDraft[]>([]);
  const [conCuadrilla, setConCuadrilla] = useState("");
  const [conCantOp, setConCantOp] = useState("");
  const [conHoras, setConHoras] = useState("");
  const [conMonto, setConMonto] = useState("");

  const [saving, setSaving] = useState(false);

  // Cargar fincas, operarios, tarifas, insumos
  useEffect(() => {
    if (!bodegaId) return;
    void loadFincas(bodegaId);
    void fetchOperariosByBodega(bodegaId).then(setOperarios).catch(() => setOperarios([]));
    void fetchPersonal(bodegaId).then((p) => setPersonalList(p.filter((x) => x.activo))).catch(() => setPersonalList([]));
    void fetchTarifasMaquinaria(bodegaId).then(setTarifasMaq).catch(() => setTarifasMaq([]));
    void fetchInsumosCatalogo(bodegaId).then(setInsumosCat).catch(() => setInsumosCat([]));
    void fetchExistencias(bodegaId)
      .then((ex) => setExistencias(Object.fromEntries(ex.map((e) => [e.insumo_id, e]))))
      .catch(() => setExistencias({}));
  }, [bodegaId, loadFincas]);

  // Procesos del protocolo activo (o el primero)
  useEffect(() => {
    let mounted = true;
    setLoadingProcesos(true);
    (async () => {
      try {
        let protocoloId = activeProtocoloId;
        if (!protocoloId) {
          const lista = await fetchProtocolos();
          protocoloId = String(lista?.[0]?.protocolo_id ?? lista?.[0]?.id ?? "") || null;
        }
        if (!protocoloId) {
          if (mounted) setProcesos([]);
          return;
        }
        const proto = await fetchProtocoloById(protocoloId);
        const flat: ProcesoOption[] = (proto.protocolo_etapa ?? []).flatMap((etapa) =>
          (etapa.protocolo_proceso ?? []).flatMap((p) => {
            const evento_tipo = p.evento_tipo ?? "";
            const item: ProcesoOption = {
              proceso_id: String(p.proceso_id ?? ""),
              nombre: p.nombre ?? "",
              evento_tipo,
              etapaNombre: etapa.nombre ?? "",
            };
            return isSetupOnlyProtocolItem({ eventoTipo: evento_tipo, etapaNombre: item.etapaNombre, nombre: item.nombre })
              ? []
              : [item];
          }),
        );
        if (mounted) setProcesos(flat);
      } catch {
        if (mounted) setProcesos([]);
      } finally {
        if (mounted) setLoadingProcesos(false);
      }
    })();
    return () => { mounted = false; };
  }, [activeProtocoloId]);

  useEffect(() => {
    if (!fincaId) { setCuarteles([]); setCuartelId(""); return; }
    void fetchCuartelesByFinca(fincaId).then((d) => setCuarteles(d ?? [])).catch(() => setCuarteles([]));
  }, [fincaId]);

  const procesosPorEtapa = useMemo(() => {
    const map = new Map<string, ProcesoOption[]>();
    for (const p of procesos) {
      const arr = map.get(p.etapaNombre) ?? [];
      arr.push(p);
      map.set(p.etapaNombre, arr);
    }
    return Array.from(map.entries());
  }, [procesos]);

  const selectedProceso = useMemo(() => procesos.find((p) => p.proceso_id === procesoId) ?? null, [procesos, procesoId]);
  const eventoConfig = selectedProceso?.evento_tipo ? EVENTO_CONFIG[selectedProceso.evento_tipo] ?? null : null;

  // Sugerencias al elegir actividad
  useEffect(() => {
    if (!selectedProceso?.nombre) { setSugerencia(null); return; }
    let mounted = true;
    fetchSugerencia(selectedProceso.nombre)
      .then((s) => {
        if (!mounted) return;
        setSugerencia(s);
        if (s?.productividad_unidad && !unidadEjec) setUnidadEjec(s.productividad_unidad);
      })
      .catch(() => { if (mounted) setSugerencia(null); });
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProceso?.nombre]);

  const setDraftField = useCallback((name: string, value: string) => {
    setDraft((prev) => ({ ...prev, [name]: value }));
  }, []);

  const requiresContratista = modalidad === "contratada" || modalidad === "mixta";
  const horasHombre = useMemo(
    () => Object.values(personal).reduce((acc, h) => acc + (Number(h) > 0 ? Number(h) : 0), 0),
    [personal],
  );
  const jornalesAuto = horasHombre > 0 ? Math.round((horasHombre / 8) * 100) / 100 : 0;

  const addMaquina = () => {
    const t = tarifasMaq.find((x) => x.tarifa_maquinaria_id === maqTarifaId);
    if (!t) { notifyError({ title: "Elegí una máquina/equipo" }); return; }
    if (!(Number(maqHoras) > 0)) { notifyError({ title: "Indicá las horas" }); return; }
    setMaquinas((p) => [...p, { tarifa_maquinaria_id: t.tarifa_maquinaria_id, nombre: t.nombre, clase: t.clase, cantidad: maqCantidad, horas: maqHoras }]);
    setMaqTarifaId(""); setMaqCantidad(""); setMaqHoras("");
  };
  const addInsumo = () => {
    if (!insId) { notifyError({ title: "Elegí un insumo" }); return; }
    if (!(Number(insDosis) > 0) || !(Number(insCantidad) > 0)) { notifyError({ title: "Dosis y cantidad obligatorias" }); return; }
    const cat = insumosCat.find((i) => i.insumo_id === insId);
    setInsumos((p) => [...p, {
      insumo_id: insId,
      descripcion: cat?.nombre_comercial ?? "",
      dosis_ha: insDosis, unidad_dosis: insUnidadDosis,
      cantidad_total: insCantidad, unidad_total: cat?.unidad_base ?? insUnidadDosis,
    }]);
    setInsId(""); setInsDosis(""); setInsCantidad("");
  };
  const addContratista = () => {
    if (!conCuadrilla.trim() || !(Number(conMonto) > 0)) { notifyError({ title: "Cuadrilla y monto obligatorios" }); return; }
    setContratistas((p) => [...p, { cuadrilla: conCuadrilla.trim(), cantidad_operarios: conCantOp, horas: conHoras, monto: conMonto }]);
    setConCuadrilla(""); setConCantOp(""); setConHoras(""); setConMonto("");
  };

  const buildDescripcion = (): string => {
    if (eventoConfig) {
      const filtered = Object.fromEntries(Object.entries(draft).filter(([, v]) => v.trim() !== ""));
      return JSON.stringify(filtered);
    }
    return draft["_notas"] ?? "";
  };

  const resetAll = () => {
    setProcesoId(""); setFincaId(""); setCuartelId(""); setDraft({});
    setModalidad("propia"); setFechaInicio(""); setFechaFin(""); setSuperficie("");
    setCantEjec(""); setUnidadEjec(""); setResponsableId(""); setPersonal({}); setObs("");
    setMaquinas([]); setInsumos([]); setContratistas([]); setSugerencia(null);
  };

  const handleSubmit = async () => {
    if (!bodegaId) return;
    if (!procesoId) { notifyError({ title: "Elegí una actividad" }); return; }
    if (!fincaId || !cuartelId) { notifyError({ title: "Faltan datos", message: "Seleccioná finca y cuartel." }); return; }
    const sup = numOrNull(superficie);
    if (!sup || sup <= 0) { notifyError({ title: "Falta superficie", message: "La superficie intervenida debe ser mayor a 0." }); return; }
    if (requiresContratista && contratistas.length === 0) {
      notifyError({ title: "Falta contratista", message: "En modalidad contratada/mixta agregá al menos una cuadrilla." });
      return;
    }

    setSaving(true);
    try {
      await registrarActividad({
        bodegaId: String(bodegaId),
        procesoId, fincaId, cuartelId,
        descripcion: buildDescripcion(),
        ejecucion: {
          modalidad,
          fecha_inicio: fechaInicio || null,
          fecha_fin: fechaFin || null,
          superficie_intervenida: sup,
          cantidad_ejecutada: numOrNull(cantEjec),
          unidad_ejecutada: unidadEjec.trim() || null,
          responsable_user_id: responsableId || null,
          personal_asignado: Object.entries(personal).map(([id, horas]) => ({
            personal_id: id,
            nombre: personalList.find((o) => o.personal_bodega_id === id)?.nombre ?? "",
            horas: horas.trim() ? Number(horas) : null,
          })),
          observaciones: obs.trim() || null,
        },
        maquinas: maquinas.map((m) => ({
          tarifa_maquinaria_id: m.tarifa_maquinaria_id, nombre: m.nombre, clase: m.clase,
          cantidad: m.cantidad.trim() ? Math.trunc(Number(m.cantidad)) : null, horas: Number(m.horas),
        })),
        insumos: insumos.map((i) => ({
          insumo_id: i.insumo_id, dosis_ha: Number(i.dosis_ha), unidad_dosis: i.unidad_dosis,
          cantidad_total: Number(i.cantidad_total), unidad_total: i.unidad_total,
        })),
        contratistas: contratistas.map((c) => ({
          cuadrilla: c.cuadrilla,
          cantidad_operarios: c.cantidad_operarios.trim() ? Math.trunc(Number(c.cantidad_operarios)) : null,
          horas: numOrNull(c.horas), monto: Number(c.monto),
        })),
      });
      notifySuccess({ title: "Actividad y costos registrados" });
      resetAll();
    } catch (e) {
      notifyError({ title: "Error al registrar", message: getApiErrorMessage(e) });
    } finally {
      setSaving(false);
    }
  };

  if (!bodegaId) {
    return (
      <div className="min-h-screen bg-secondary px-6 py-10">
        <div className="mx-auto w-full max-w-5xl space-y-4">
          <SectionIntro title="Registrar actividad" />
          <NoticeBanner tone="warning">Seleccioná una bodega para registrar actividades.</NoticeBanner>
        </div>
      </div>
    );
  }

  const inputCls = "w-24 rounded-[var(--radius-sm)] border border-[color:var(--field-border)] bg-[color:var(--field-bg)] px-2 py-1 text-sm text-[color:var(--field-text)]";

  return (
    <div className="min-h-screen bg-secondary px-6 py-10">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <SectionIntro
          eyebrow="Carga rápida"
          title="Registrar actividad"
          description="Cargá la actividad y sus costos en un solo paso. Queda completada a tu nombre."
        />

        {/* Actividad */}
        <AppCard padding="lg" header={<h3 className="text-base font-semibold">Datos de la actividad</h3>}>
          <div className="grid gap-3 md:grid-cols-3">
            <AppSelect label="Actividad" value={procesoId} onChange={(e) => { setProcesoId(e.target.value); setDraft({}); }}>
              <option value="">{loadingProcesos ? "Cargando…" : "Seleccionar…"}</option>
              {procesosPorEtapa.map(([etapa, items]) => (
                <optgroup key={etapa} label={etapa}>
                  {items.map((p) => <option key={p.proceso_id} value={p.proceso_id}>{p.nombre}</option>)}
                </optgroup>
              ))}
            </AppSelect>
            <AppSelect label="Finca" value={fincaId} onChange={(e) => { setFincaId(e.target.value); setCuartelId(""); }}>
              <option value="">Seleccionar…</option>
              {fincas.filter((f) => f.finca_id).map((f) => <option key={f.finca_id} value={f.finca_id}>{f.nombre_finca ?? f.finca_id}</option>)}
            </AppSelect>
            <AppSelect label="Cuartel" value={cuartelId} onChange={(e) => setCuartelId(e.target.value)}>
              <option value="">Seleccionar…</option>
              {cuarteles.filter((c) => c.cuartel_id ?? c.id).map((c) => <option key={c.cuartel_id ?? c.id} value={String(c.cuartel_id ?? c.id)}>{c.codigo_cuartel}</option>)}
            </AppSelect>
          </div>
          {sugerencia && (sugerencia.productividad_label || sugerencia.equipos_sugeridos.length || sugerencia.insumos_sugeridos.length) ? (
            <div className="mt-3 rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-accent-soft)] px-3 py-2 text-xs text-[color:var(--text-ink-muted)]">
              {sugerencia.productividad_label ? <div>Productividad: <span className="font-semibold text-[color:var(--text-ink)]">{sugerencia.productividad_label}</span></div> : null}
              {sugerencia.equipos_sugeridos.length ? <div>Equipos sugeridos: {sugerencia.equipos_sugeridos.join(", ")}</div> : null}
              {sugerencia.insumos_sugeridos.length ? <div>Insumos sugeridos: {sugerencia.insumos_sugeridos.join(", ")}</div> : null}
            </div>
          ) : null}
          {procesoId ? (
            <div className="mt-4">
              <p className="mb-2 text-sm font-medium text-[color:var(--text-ink-muted)]">Detalle{eventoConfig ? ` — ${eventoConfig.label}` : ""}</p>
              <EventoFields eventoConfig={eventoConfig} draft={draft} onChange={setDraftField} />
            </div>
          ) : null}
        </AppCard>

        {/* Superficie y mano de obra */}
        <AppCard padding="lg" header={<h3 className="text-base font-semibold">Superficie y mano de obra</h3>}>
          <div className="grid gap-3 md:grid-cols-2">
            <AppSelect label="Modalidad de ejecución" value={modalidad} onChange={(e) => setModalidad(e.target.value as ModalidadEjecucion)}>
              {MODALIDADES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </AppSelect>
            <AppInput label="Superficie intervenida (ha)" type="number" value={superficie} onChange={(e) => setSuperficie(e.target.value)} />
            <AppInput label="Fecha de inicio" type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
            <AppInput label="Fecha de fin" type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
            <AppInput label="Cantidad ejecutada" type="number" value={cantEjec} onChange={(e) => setCantEjec(e.target.value)} placeholder="ej. 4500" />
            <AppInput label="Unidad (plantas, kg…)" value={unidadEjec} onChange={(e) => setUnidadEjec(e.target.value)} />
            <AppSelect label="Responsable de ejecución" value={responsableId} onChange={(e) => setResponsableId(e.target.value)}>
              <option value="">Sin responsable</option>
              {operarios.map((o) => <option key={o.user_id} value={o.user_id}>{o.nombre}</option>)}
            </AppSelect>
          </div>
          {personalList.length ? (
            <div className="mt-3">
              <p className="mb-1 text-sm font-medium text-[color:var(--field-label)]">Personal asignado (horas por persona)</p>
              <input
                type="search"
                value={personalQuery}
                onChange={(e) => setPersonalQuery(e.target.value)}
                placeholder="Buscar persona…"
                className="mb-2 w-full max-w-xs rounded-[var(--radius-sm)] border border-[color:var(--field-border)] bg-[color:var(--field-bg)] px-3 py-1.5 text-sm text-[color:var(--field-text)]"
              />
              <div className="flex flex-wrap gap-2">
                {personalList
                  .filter((o) => o.nombre.toLowerCase().includes(personalQuery.trim().toLowerCase()))
                  .map((o) => {
                    const active = o.personal_bodega_id in personal;
                    return (
                      <button key={o.personal_bodega_id} type="button" onClick={() => setPersonal((prev) => { const n = { ...prev }; if (active) delete n[o.personal_bodega_id]; else n[o.personal_bodega_id] = ""; return n; })}
                        className={`rounded-full border px-3 py-1 text-xs transition ${active ? "border-[color:var(--accent-primary)] bg-[color:var(--surface-accent-soft)] text-[color:var(--text-ink)]" : "border-[color:var(--border-shell)] text-[color:var(--text-ink-muted)] hover:border-[color:var(--border-default)]"}`}>
                        {active ? "✓ " : ""}{o.nombre}
                      </button>
                    );
                  })}
              </div>
              {Object.keys(personal).length > 0 ? (
                <div className="mt-3 space-y-2">
                  {personalList.filter((o) => o.personal_bodega_id in personal).map((o) => (
                    <div key={o.personal_bodega_id} className="flex items-center gap-2">
                      <span className="min-w-40 text-sm">{o.nombre}</span>
                      <input type="number" value={personal[o.personal_bodega_id]} onChange={(e) => setPersonal((prev) => ({ ...prev, [o.personal_bodega_id]: e.target.value }))} placeholder="horas" className={inputCls} />
                      <button type="button" className="text-xs text-[color:var(--text-ink-muted)] hover:text-[color:var(--field-error)]" onClick={() => setPersonal((prev) => { const n = { ...prev }; delete n[o.personal_bodega_id]; return n; })}>quitar</button>
                    </div>
                  ))}
                </div>
              ) : null}
              {horasHombre > 0 ? <p className="mt-2 text-xs text-[color:var(--text-ink-muted)]">Horas-hombre: <span className="font-semibold">{horasHombre}</span> · Jornales (auto): <span className="font-semibold">{jornalesAuto}</span></p> : null}
            </div>
          ) : null}
          <div className="mt-3">
            <AppTextarea label="Observaciones" value={obs} onChange={(e) => setObs(e.target.value)} />
          </div>
        </AppCard>

        {/* Máquinas y equipos */}
        <AppCard padding="lg" header={<h3 className="text-base font-semibold">Máquinas y equipos</h3>}>
          {maquinas.length ? (
            <ul className="mb-3 space-y-2">
              {maquinas.map((m, idx) => (
                <li key={idx} className="flex items-center justify-between rounded-[var(--radius-md)] border border-[color:var(--border-shell)] px-3 py-2 text-sm">
                  <span><strong>{m.nombre}</strong> · {m.clase}{m.cantidad ? ` · x${m.cantidad}` : ""} · {m.horas} h</span>
                  <AppButton variant="ghost" size="sm" onClick={() => setMaquinas((p) => p.filter((_, i) => i !== idx))}>Quitar</AppButton>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="grid gap-3 md:grid-cols-4">
            <AppSelect label="Máquina / equipo" value={maqTarifaId} onChange={(e) => setMaqTarifaId(e.target.value)}>
              <option value="">Seleccionar…</option>
              {tarifasMaq.map((t) => <option key={t.tarifa_maquinaria_id} value={t.tarifa_maquinaria_id}>{t.nombre} ({t.clase})</option>)}
            </AppSelect>
            <AppInput label="Cantidad" type="number" value={maqCantidad} onChange={(e) => setMaqCantidad(e.target.value)} placeholder="opcional" />
            <AppInput label="Horas de uso" type="number" value={maqHoras} onChange={(e) => setMaqHoras(e.target.value)} />
            <div className="flex items-end"><AppButton variant="secondary" onClick={addMaquina}>Agregar</AppButton></div>
          </div>
        </AppCard>

        {/* Insumos */}
        <AppCard padding="lg" header={<h3 className="text-base font-semibold">Insumos</h3>}>
          {insumos.length ? (
            <ul className="mb-3 space-y-2">
              {insumos.map((i, idx) => (
                <li key={idx} className="flex items-center justify-between rounded-[var(--radius-md)] border border-[color:var(--border-shell)] px-3 py-2 text-sm">
                  <span><strong>{i.descripcion}</strong> · {i.dosis_ha} {i.unidad_dosis} · total {i.cantidad_total} {i.unidad_total}</span>
                  <AppButton variant="ghost" size="sm" onClick={() => setInsumos((p) => p.filter((_, x) => x !== idx))}>Quitar</AppButton>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="grid gap-3 md:grid-cols-4">
            <AppSelect label="Insumo" value={insId} onChange={(e) => setInsId(e.target.value)}>
              <option value="">Seleccionar…</option>
              {insumosCat.map((i) => {
                const ex = existencias[i.insumo_id];
                return (
                  <option key={i.insumo_id} value={i.insumo_id}>
                    {i.nombre_comercial} ({i.tipo}){ex ? ` · disp. ${ex.stock} ${ex.unidad_base}` : ""}
                  </option>
                );
              })}
            </AppSelect>
            <AppInput label="Dosis por ha" type="number" value={insDosis} onChange={(e) => setInsDosis(e.target.value)} />
            <AppInput label="Unidad dosis" value={insUnidadDosis} onChange={(e) => setInsUnidadDosis(e.target.value)} />
            <AppInput label="Cantidad total" type="number" value={insCantidad} onChange={(e) => setInsCantidad(e.target.value)} />
          </div>
          {insId && existencias[insId] ? (() => {
            const ex = existencias[insId]!;
            // Restamos lo ya agregado de este insumo en el borrador + lo que se está por cargar.
            const enBorrador = insumos
              .filter((i) => i.insumo_id === insId)
              .reduce((acc, i) => acc + (Number(i.cantidad_total) || 0), 0);
            const queda = ex.stock - enBorrador - (Number(insCantidad) || 0);
            return (
              <p className={`mt-2 text-xs ${queda < 0 ? "text-[color:var(--feedback-danger-text)]" : "text-[color:var(--text-ink-muted)]"}`}>
                Disponible: <strong>{ex.stock} {ex.unidad_base}</strong>
                {Number(insCantidad) > 0 || enBorrador > 0 ? ` · quedará ${queda} ${ex.unidad_base} al registrar` : ""}
                {queda < 0 ? " — stock insuficiente (quedará en negativo)" : ""}
              </p>
            );
          })() : null}
          <div className="mt-3"><AppButton variant="secondary" onClick={addInsumo}>Agregar insumo</AppButton></div>
        </AppCard>

        {/* Mano de obra contratada */}
        {requiresContratista ? (
          <AppCard padding="lg" header={<h3 className="text-base font-semibold">Mano de obra contratada</h3>}>
            {contratistas.length ? (
              <ul className="mb-3 space-y-2">
                {contratistas.map((c, idx) => (
                  <li key={idx} className="flex items-center justify-between rounded-[var(--radius-md)] border border-[color:var(--border-shell)] px-3 py-2 text-sm">
                    <span><strong>{c.cuadrilla}</strong>{c.cantidad_operarios ? ` · ${c.cantidad_operarios} op.` : ""}{c.horas ? ` · ${c.horas} h` : ""} · ${c.monto}</span>
                    <AppButton variant="ghost" size="sm" onClick={() => setContratistas((p) => p.filter((_, x) => x !== idx))}>Quitar</AppButton>
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="grid gap-3 md:grid-cols-4">
              <AppInput label="Cuadrilla / contratista" value={conCuadrilla} onChange={(e) => setConCuadrilla(e.target.value)} />
              <AppInput label="Cant. operarios" type="number" value={conCantOp} onChange={(e) => setConCantOp(e.target.value)} />
              <AppInput label="Horas" type="number" value={conHoras} onChange={(e) => setConHoras(e.target.value)} />
              <AppInput label="Monto" type="number" value={conMonto} onChange={(e) => setConMonto(e.target.value)} />
            </div>
            <div className="mt-3"><AppButton variant="secondary" onClick={addContratista}>Agregar cuadrilla</AppButton></div>
          </AppCard>
        ) : null}

        {/* Acción final */}
        <div className="flex flex-wrap items-center gap-2">
          <AppButton variant="primary" size="lg" loading={saving} onClick={() => void handleSubmit()}>
            Registrar actividad y costos
          </AppButton>
          <Link to="/operacion/campo"><AppButton variant="ghost">Ir a Operación de campo</AppButton></Link>
        </div>
      </div>
    </div>
  );
}
