import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { nonNeg } from "../../lib/number";
import { useAuthStore } from "../../store/authStore";
import { useOperacionStore } from "../../store/operacionStore";
import { useFincasStore } from "../../features/fincas/store";
import { fetchCuartelesByFinca, type Cuartel } from "../../features/cuarteles/api";
import { fetchProtocolos, fetchProtocoloById } from "../../features/protocolos/api";
import { registrarActividad, uploadEntradaAdjunto } from "../../features/encargos/api";
import PersonalSection from "../Costos/PersonalSection";
import { buildPersonalAsignado, type TransitorioDraft } from "../Costos/transitorios";
import InsumoPicker, { type AddInsumoLine } from "../Costos/InsumoPicker";
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

function fileIcon(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "🖼️";
  if (mimeType.startsWith("video/")) return "🎬";
  if (mimeType === "application/pdf") return "📄";
  if (mimeType.includes("word") || mimeType.includes("document")) return "📝";
  if (mimeType.includes("excel") || mimeType.includes("spreadsheet") || mimeType === "text/csv") return "📊";
  if (mimeType.includes("powerpoint") || mimeType.includes("presentation")) return "📋";
  return "📎";
}

/** Aviso para secciones de costo que normalmente no aplican a la labor. */
function NoAplicaNota({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 rounded-[var(--radius-md)] border border-dashed border-[color:var(--border-shell)] bg-[color:var(--surface-soft)] px-3 py-2 text-xs text-[color:var(--text-ink-muted)]">
      {children} Podés cargarlo igual si esta vez se usó.
    </p>
  );
}

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

  const [contratistas, setContratistas] = useState<ContratistaDraft[]>([]);
  const [conCuadrilla, setConCuadrilla] = useState("");
  const [conCantOp, setConCantOp] = useState("");
  const [conHoras, setConHoras] = useState("");
  const [conMonto, setConMonto] = useState("");

  const [transitorios, setTransitorios] = useState<TransitorioDraft[]>([]);
  const [saving, setSaving] = useState(false);

  // Adjuntos (fotos y archivos) — se suben a IPFS tras registrar la actividad.
  const [pendingFiles, setPendingFiles] = useState<{ file: File; previewUrl: string | null }[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const addPendingFiles = useCallback((files: File[]) => {
    setPendingFiles((prev) => [
      ...prev,
      ...files.map((file) => ({
        file,
        previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
      })),
    ]);
  }, []);

  const handlePickImages = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length) addPendingFiles(files);
    e.target.value = "";
  }, [addPendingFiles]);

  const handlePickFiles = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length) addPendingFiles(files);
    e.target.value = "";
  }, [addPendingFiles]);

  const removePendingFile = useCallback((idx: number) => {
    setPendingFiles((prev) => {
      const item = prev[idx];
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((_, i) => i !== idx);
    });
  }, []);

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
  // En fertilización el fertilizante es el insumo: se carga en la sección Insumos.
  const esFertilizacion = selectedProceso?.evento_tipo === "fertilizacion";
  // Secciones que la labor normalmente no usa (se atenúan, no se ocultan).
  const aplicaMaquinaria = !sugerencia || sugerencia.aplica_maquinaria;
  const aplicaInsumos = !sugerencia || sugerencia.aplica_insumos;
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
  const addInsumo = (line: AddInsumoLine) => {
    setInsumos((p) => [...p, {
      insumo_id: line.insumo.insumo_id,
      descripcion: line.insumo.nombre_comercial,
      dosis_ha: String(line.dosis_ha),
      unidad_dosis: line.unidad_dosis,
      cantidad_total: String(line.cantidad_total),
      unidad_total: line.insumo.unidad_base ?? line.unidad_dosis,
    }]);
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
    setMaquinas([]); setInsumos([]); setContratistas([]); setSugerencia(null); setTransitorios([]);
    setPendingFiles((prev) => {
      prev.forEach((p) => { if (p.previewUrl) URL.revokeObjectURL(p.previewUrl); });
      return [];
    });
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
    if (esFertilizacion && insumos.length === 0) {
      notifyError({ title: "Falta el fertilizante", message: "Agregá el fertilizante en la sección Fertilizante / insumos." });
      return;
    }

    setSaving(true);
    try {
      const result = await registrarActividad({
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
          personal_asignado: buildPersonalAsignado(personal, personalList, transitorios),
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

      // Subir adjuntos (fotos/archivos) a la entrada recién creada.
      if (pendingFiles.length > 0 && result?.entradaId) {
        setUploadingFiles(true);
        try {
          await Promise.all(pendingFiles.map(({ file }) => uploadEntradaAdjunto(result.entradaId, file)));
        } catch {
          notifyError({
            title: "Archivos no subidos",
            message: "La actividad se registró pero no se pudieron subir los adjuntos. Verificá la configuración del servidor IPFS.",
          });
        } finally {
          setUploadingFiles(false);
        }
      }

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
            <AppInput label="Superficie intervenida (ha)" type="number" min="0" value={superficie} onChange={(e) => setSuperficie(nonNeg(e.target.value))} />
            <AppInput label="Fecha de inicio" type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
            <AppInput label="Fecha de fin" type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
            <AppInput label="Cantidad ejecutada" type="number" min="0" value={cantEjec} onChange={(e) => setCantEjec(nonNeg(e.target.value))} placeholder="ej. 4500" />
            <AppInput label="Unidad (plantas, kg…)" value={unidadEjec} onChange={(e) => setUnidadEjec(e.target.value)} />
            <AppSelect label="Responsable de ejecución" value={responsableId} onChange={(e) => setResponsableId(e.target.value)}>
              <option value="">Sin responsable</option>
              {operarios.map((o) => <option key={o.user_id} value={o.user_id}>{o.nombre}</option>)}
            </AppSelect>
          </div>
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
          <div className="mt-3">
            <AppTextarea label="Observaciones" value={obs} onChange={(e) => setObs(e.target.value)} />
          </div>
        </AppCard>

        {/* Máquinas y equipos */}
        <AppCard padding="lg" className={!aplicaMaquinaria ? "opacity-70" : undefined} header={<h3 className="text-base font-semibold">Máquinas y equipos</h3>}>
          {!aplicaMaquinaria ? (
            <NoAplicaNota>Esta labor es manual y normalmente no usa maquinaria.</NoAplicaNota>
          ) : null}
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
        <AppCard padding="lg" className={!aplicaInsumos ? "opacity-70" : undefined} header={<h3 className="text-base font-semibold">{esFertilizacion ? "Fertilizante / insumos" : "Insumos"}</h3>}>
          {!aplicaInsumos ? (
            <NoAplicaNota>Esta labor normalmente no lleva insumos.</NoAplicaNota>
          ) : null}
          {esFertilizacion ? (
            <p className="mb-3 rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-accent-soft)] px-3 py-2 text-xs text-[color:var(--text-ink-muted)]">
              Cargá acá el fertilizante desde tu catálogo: se registra el insumo y <strong>descuenta stock</strong> automáticamente.
            </p>
          ) : null}
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
          <InsumoPicker
            insumos={insumosCat}
            existencias={existencias}
            reservado={(id) => insumos.filter((i) => i.insumo_id === id).reduce((acc, i) => acc + (Number(i.cantidad_total) || 0), 0)}
            onAdd={addInsumo}
            onError={(message) => notifyError({ title: "No se pudo agregar", message })}
          />
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
              <AppInput label="Cant. operarios" type="number" min="0" value={conCantOp} onChange={(e) => setConCantOp(nonNeg(e.target.value))} />
              <AppInput label="Horas" type="number" min="0" value={conHoras} onChange={(e) => setConHoras(nonNeg(e.target.value))} />
              <AppInput label="Monto" type="number" min="0" value={conMonto} onChange={(e) => setConMonto(nonNeg(e.target.value))} />
            </div>
            <div className="mt-3"><AppButton variant="secondary" onClick={addContratista}>Agregar cuadrilla</AppButton></div>
          </AppCard>
        ) : null}

        {/* Adjuntos (fotos y archivos) */}
        <AppCard padding="lg" header={<h3 className="text-base font-semibold">Adjuntos <span className="text-sm font-normal text-[color:var(--text-ink-muted)]">(fotos y archivos — opcional)</span></h3>}>
          <div className="flex flex-wrap gap-2">
            {pendingFiles.map(({ file, previewUrl }, idx) => (
              <div key={idx} className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius-md)] border border-[color:var(--border-shell)] bg-[color:var(--surface-soft)]">
                {previewUrl ? (
                  <img src={previewUrl} alt={file.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-0.5 px-1 text-center">
                    <span className="text-xl leading-none">{fileIcon(file.type)}</span>
                    <span className="line-clamp-2 text-[9px] font-medium text-[color:var(--text-ink-muted)]">{file.name}</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => removePendingFile(idx)}
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow hover:bg-red-600"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              className="flex h-20 w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-[var(--radius-md)] border border-dashed border-[color:var(--border-default)] bg-[color:var(--surface-soft)] text-[color:var(--text-ink-muted)] transition hover:border-[color:var(--accent-primary)] hover:text-[color:var(--text-ink)]"
            >
              <span className="text-2xl leading-none">📷</span>
              <span className="text-[10px] font-semibold">Foto</span>
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex h-20 w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-[var(--radius-md)] border border-dashed border-[color:var(--border-default)] bg-[color:var(--surface-soft)] text-[color:var(--text-ink-muted)] transition hover:border-[color:var(--accent-primary)] hover:text-[color:var(--text-ink)]"
            >
              <span className="text-2xl leading-none">📎</span>
              <span className="text-[10px] font-semibold">Archivo</span>
            </button>
            <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePickImages} />
            <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv" multiple className="hidden" onChange={handlePickFiles} />
          </div>
          {uploadingFiles ? (
            <p className="mt-2 text-xs text-[color:var(--text-ink-muted)]">Subiendo archivos a IPFS…</p>
          ) : null}
        </AppCard>

        {/* Acción final */}
        <div className="flex flex-wrap items-center gap-2">
          <AppButton variant="primary" size="lg" loading={saving || uploadingFiles} onClick={() => void handleSubmit()}>
            Registrar actividad y costos
          </AppButton>
          <Link to="/operacion/campo"><AppButton variant="ghost">Ir a Operación de campo</AppButton></Link>
        </div>
      </div>
    </div>
  );
}
