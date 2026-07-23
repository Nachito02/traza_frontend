import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
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
import {
  createTareaEntrada,
  fetchPendientesByScope,
  fetchTareaAsignacionDetail,
  finalizarTareaAsignacion,
  fetchTareasByBodega,
  patchTareaEntrada,
  registrarActividad,
  uploadEntradaAdjunto,
} from "../../features/encargos/api";
import CostosActividadPanel from "../Costos/CostosActividadPanel";
import PersonalSection from "../Costos/PersonalSection";
import { buildPersonalAsignado, payloadToTransitorio, type TransitorioDraft } from "../Costos/transitorios";
import InsumoPicker, { type AddInsumoLine } from "../Costos/InsumoPicker";
import { fetchOperariosByBodega, type Operario } from "../../features/operarios/api";
import { fetchPersonal, type Personal } from "../../features/personal/api";
import { fetchExistencias, type Existencia } from "../../features/inventario/api";
import {
  fetchCostosTarea,
  fetchTarifasMaquinaria,
  fetchInsumosCatalogo,
  fetchSugerencia,
  putEjecucion,
  type ClaseMaquinaria,
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

/** Indicador de pasos del wizard (segmentado, mismo acento que la plataforma). */
function Stepper({ steps, current, onStep }: { steps: string[]; current: number; onStep: (n: number) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {steps.map((label, i) => {
        const active = i === current;
        const done = i < current;
        return (
          <div key={label} className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onStep(i)}
              disabled={i > current}
              className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition ${
                active
                  ? "bg-[color:var(--accent-primary)] text-white"
                  : i > current
                    ? "cursor-not-allowed text-[color:var(--text-ink-muted)]"
                    : "text-[color:var(--text-ink)] hover:bg-[color:var(--surface-soft)]"
              }`}
            >
              <span className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${active ? "bg-white/25" : "bg-[color:var(--surface-soft)] text-[color:var(--text-ink-muted)]"}`}>
                {done ? "✓" : i + 1}
              </span>
              <span className="hidden sm:inline">{label}</span>
            </button>
            {i < steps.length - 1 ? <span className="h-px w-4 bg-[color:var(--border-shell)]" /> : null}
          </div>
        );
      })}
    </div>
  );
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

const UNIDADES_EJECUCION = [
  { value: "plantas", label: "Plantas" },
  { value: "kg", label: "Kilos" },
  { value: "l", label: "Litros" },
  { value: "ton", label: "Tonelada" },
  { value: "rollos", label: "Rollos" },
];

const CLASES_MAQUINARIA: { value: ClaseMaquinaria; label: string }[] = [
  { value: "motriz", label: "Motriz" },
  { value: "implemento", label: "Implemento" },
];

const numOrNull = (v: string): number | null => {
  if (!v.trim()) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

function parseDraftRecord(text: string | null | undefined): Record<string, string> {
  if (!text) return {};
  try {
    const parsed = JSON.parse(text) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return Object.fromEntries(
        Object.entries(parsed as Record<string, unknown>).map(([key, value]) => [
          key,
          value == null ? "" : String(value),
        ]),
      );
    }
  } catch {
    /* texto plano */
  }
  return { _notas: text };
}

export default function RegistroActividadPage() {
  const { notifySuccess, notifyError } = useAppNotifications();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const bodegaId = useAuthStore((state) => state.activeBodegaId);
  const activeProtocoloId = useOperacionStore((state) => state.activeProtocoloId);
  const fincas = useFincasStore((state) => state.fincas);
  const loadFincas = useFincasStore((state) => state.loadFincas);
  const mode = searchParams.get("mode");
  const tareaId = searchParams.get("tareaId");
  const entradaId = searchParams.get("entradaId");
  const tareaAsignacionId = searchParams.get("asignacionId");
  const from = searchParams.get("from");
  const isEditMode = mode === "edit" && Boolean(tareaId) && Boolean(entradaId);
  const isTaskMode = mode === "task" && Boolean(tareaId) && Boolean(tareaAsignacionId);
  const returnHref = from === "campo" ? "/operacion/campo" : "/ordenes";

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
  const [maqClase, setMaqClase] = useState<ClaseMaquinaria | "">("");
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
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [step, setStep] = useState(0); // 0: qué/dónde · 1: ejecución · 2: costos/adjuntos
  const [draftRestored, setDraftRestored] = useState(false);
  const [expandMaq, setExpandMaq] = useState(false);   // mostrar maquinaria aunque no aplique
  const [expandIns, setExpandIns] = useState(false);   // mostrar insumos aunque no apliquen

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
  const esLaborConMaquina = selectedProceso?.evento_tipo === "labor_suelo" || selectedProceso?.evento_tipo === "labores_culturales";

  // Validez por paso del wizard (habilita "Siguiente").
  const step0Valid = Boolean(procesoId && fincaId && cuartelId);
  const step1Valid = Number(superficie) > 0;
  const currentStepValid = step === 0 ? step0Valid : step === 1 ? step1Valid : true;
  const STEPS = ["Qué y dónde", "Ejecución", "Costos y adjuntos"];

  // ── Autoguardado del borrador (localStorage), por bodega ──
  const draftKey = bodegaId ? `reg-actividad:${bodegaId}` : null;
  const restoredRef = useRef(false);
  useEffect(() => {
    if (isEditMode || isTaskMode) return;
    if (restoredRef.current || !draftKey) return;
    restoredRef.current = true;
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const d = JSON.parse(raw) as Record<string, unknown>;
      if (typeof d.procesoId === "string") setProcesoId(d.procesoId);
      if (typeof d.fincaId === "string") setFincaId(d.fincaId);
      if (typeof d.cuartelId === "string") setCuartelId(d.cuartelId);
      if (d.draft && typeof d.draft === "object") setDraft(d.draft as Record<string, string>);
      if (typeof d.modalidad === "string") setModalidad(d.modalidad as ModalidadEjecucion);
      if (typeof d.superficie === "string") setSuperficie(d.superficie);
      if (typeof d.fechaInicio === "string") setFechaInicio(d.fechaInicio);
      if (typeof d.fechaFin === "string") setFechaFin(d.fechaFin);
      if (typeof d.cantEjec === "string") setCantEjec(d.cantEjec);
      if (typeof d.unidadEjec === "string") setUnidadEjec(d.unidadEjec);
      if (typeof d.responsableId === "string") setResponsableId(d.responsableId);
      if (d.personal && typeof d.personal === "object") setPersonal(d.personal as Record<string, string>);
      if (Array.isArray(d.transitorios)) setTransitorios(d.transitorios as TransitorioDraft[]);
      if (Array.isArray(d.maquinas)) setMaquinas(d.maquinas as MaquinaDraft[]);
      if (Array.isArray(d.insumos)) setInsumos(d.insumos as InsumoDraft[]);
      if (Array.isArray(d.contratistas)) setContratistas(d.contratistas as ContratistaDraft[]);
      if (typeof d.obs === "string") setObs(d.obs);
      setDraftRestored(true);
    } catch {
      /* borrador corrupto: se ignora */
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey, isTaskMode, isEditMode]);

  useEffect(() => {
    if (isEditMode || isTaskMode) return;
    if (!draftKey || !restoredRef.current) return;
    const hasData = Boolean(procesoId || fincaId || superficie || insumos.length || maquinas.length || Object.keys(personal).length);
    try {
      if (hasData) {
        localStorage.setItem(draftKey, JSON.stringify({
          procesoId, fincaId, cuartelId, draft, modalidad, superficie, fechaInicio, fechaFin,
          cantEjec, unidadEjec, responsableId, personal, transitorios, maquinas, insumos, contratistas, obs,
        }));
      } else {
        localStorage.removeItem(draftKey);
      }
    } catch {
      /* cuota llena u otro: se ignora */
    }
  }, [draftKey, procesoId, fincaId, cuartelId, draft, modalidad, superficie, fechaInicio, fechaFin, cantEjec, unidadEjec, responsableId, personal, transitorios, maquinas, insumos, contratistas, obs, isEditMode, isTaskMode]);
  // Secciones que la labor normalmente no usa (se atenúan, no se ocultan).
  const aplicaMaquinaria = !sugerencia || sugerencia.aplica_maquinaria;
  const aplicaInsumos = !sugerencia || sugerencia.aplica_insumos;
  const cuartelSeleccionado = useMemo(
    () => cuarteles.find((c) => String(c.cuartel_id ?? c.id) === cuartelId) ?? null,
    [cuarteles, cuartelId],
  );
  const superficieCuartel = cuartelSeleccionado ? Number(cuartelSeleccionado.superficie_ha) : Number.NaN;
  const superficieCuartelLabel = useMemo(() => {
    if (!Number.isFinite(superficieCuartel)) return null;
    return new Intl.NumberFormat("es-AR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(superficieCuartel);
  }, [superficieCuartel]);
  const superficieCuartelHint = superficieCuartelLabel
    ? `Superficie total del cuartel: ${superficieCuartelLabel} ha.`
    : cuartelId
      ? "Cargando la superficie total del cuartel…"
      : "Seleccioná un cuartel para ver su superficie total.";
  const horasHombre = useMemo(
    () => Object.values(personal).reduce((acc, h) => acc + (Number(h) > 0 ? Number(h) : 0), 0),
    [personal],
  );
  const jornalesAuto = horasHombre > 0 ? Math.round((horasHombre / 8) * 100) / 100 : 0;
  const tarifasMaqFiltradas = useMemo(
    () => (maqClase ? tarifasMaq.filter((t) => t.clase === maqClase) : tarifasMaq),
    [maqClase, tarifasMaq],
  );

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

  const buildNotas = (): string => {
    if (eventoConfig) {
      const filtered = Object.fromEntries(Object.entries(draft).filter(([, v]) => v.trim() !== ""));
      return Object.entries(filtered)
        .map(([k, v]) => {
          const label = eventoConfig.fields.find((f) => f.name === k)?.label ?? k;
          return `${label}: ${v}`;
        })
        .join(", ");
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
    setStep(0);
    setDraftRestored(false);
    setExpandMaq(false);
    setExpandIns(false);
    if (draftKey) { try { localStorage.removeItem(draftKey); } catch { /* ignore */ } }
  };

  useEffect(() => {
    if ((!isEditMode && !isTaskMode) || !bodegaId || !tareaId) return;
    let mounted = true;
    setLoadingEdit(true);
    (async () => {
      try {
        const [allTasks, mineTasks, costos] = await Promise.all([
          fetchTareasByBodega(String(bodegaId)),
          fetchPendientesByScope({ bodegaId: String(bodegaId), mode: "mine" }),
          fetchCostosTarea(tareaId),
        ]);
        if (!mounted) return;
        const tareas = [...allTasks, ...mineTasks].filter((item, index, arr) => {
          const itemId = String(item.tarea_id ?? item.id ?? "");
          return itemId && arr.findIndex((x) => String(x.tarea_id ?? x.id ?? "") === itemId) === index;
        });
        const tarea = tareas.find((item) => String(item.tarea_id ?? item.id ?? "") === tareaId);
        if (!tarea) throw new Error("No se encontró la tarea seleccionada.");

        setProcesoId(String(tarea.proceso_id ?? ""));
        setFincaId(String(tarea.finca_id ?? ""));
        setCuartelId(String(tarea.cuartel_id ?? ""));

        if (isEditMode) {
          const entradas = (
            await Promise.all(
              (tarea.tarea_asignacion ?? []).map((asignacion) => fetchTareaAsignacionDetail(asignacion.tarea_asignacion_id)),
            )
          ).flat();
          const entrada = entradas.find((item) => item.entradaId === entradaId);
          if (!entrada) throw new Error("No se encontró el registro a editar.");
          setDraft(parseDraftRecord(entrada.descripcion ?? entrada.notas ?? ""));
        } else {
          setDraft({});
        }

        const ejecucion = costos.ejecucion;
        if (ejecucion) {
          setModalidad(ejecucion.modalidad);
          setFechaInicio(ejecucion.fecha_inicio ? ejecucion.fecha_inicio.slice(0, 10) : "");
          setFechaFin(ejecucion.fecha_fin ? ejecucion.fecha_fin.slice(0, 10) : "");
          setSuperficie(ejecucion.superficie_intervenida ?? "");
          setCantEjec(ejecucion.cantidad_ejecutada ?? "");
          setUnidadEjec(ejecucion.unidad_ejecutada ?? "");
          setResponsableId(ejecucion.responsable_user_id ?? "");
          setPersonal(
            Object.fromEntries(
              (ejecucion.personal_asignado ?? [])
                .filter((item) => item.personal_id)
                .map((item) => [String(item.personal_id), item.horas != null ? String(item.horas) : ""]),
            ),
          );
          setTransitorios(
            (ejecucion.personal_asignado ?? [])
              .filter((item) => item.transitorio || !item.personal_id)
              .map(payloadToTransitorio),
          );
          setObs(ejecucion.observaciones ?? "");
        }
        setStep(0);
      } catch (error) {
        if (!mounted) return;
        notifyError({
          title: "No se pudo abrir el editor",
          message: getApiErrorMessage(error),
        });
      } finally {
        if (mounted) setLoadingEdit(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [bodegaId, entradaId, isEditMode, isTaskMode, notifyError, tareaId]);

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
      if (isEditMode && tareaId && entradaId) {
        await patchTareaEntrada(entradaId, {
          descripcion: buildDescripcion(),
        });
        await putEjecucion(tareaId, {
          modalidad,
          fecha_inicio: fechaInicio || null,
          fecha_fin: fechaFin || null,
          superficie_intervenida: sup,
          cantidad_ejecutada: numOrNull(cantEjec),
          unidad_ejecutada: unidadEjec.trim() || null,
          responsable_user_id: responsableId || null,
          personal_asignado: buildPersonalAsignado(personal, personalList, transitorios),
          observaciones: obs.trim() || null,
        });
        if (pendingFiles.length > 0) {
          setUploadingFiles(true);
          try {
            await Promise.all(pendingFiles.map(({ file }) => uploadEntradaAdjunto(entradaId, file)));
          } finally {
            setUploadingFiles(false);
          }
        }
        notifySuccess({ title: "Registro actualizado" });
        navigate(returnHref);
        return;
      }

      if (isTaskMode && tareaId && tareaAsignacionId) {
        const result = await createTareaEntrada(tareaAsignacionId, {
          notas: buildNotas(),
          descripcion: buildDescripcion(),
        }) as { entradaId?: string };

        await putEjecucion(tareaId, {
          modalidad,
          fecha_inicio: fechaInicio || null,
          fecha_fin: fechaFin || null,
          superficie_intervenida: sup,
          cantidad_ejecutada: numOrNull(cantEjec),
          unidad_ejecutada: unidadEjec.trim() || null,
          responsable_user_id: responsableId || null,
          personal_asignado: buildPersonalAsignado(personal, personalList, transitorios),
          observaciones: obs.trim() || null,
        });

        if (pendingFiles.length > 0 && result?.entradaId) {
          setUploadingFiles(true);
          try {
            await Promise.all(pendingFiles.map(({ file }) => uploadEntradaAdjunto(result.entradaId!, file)));
          } finally {
            setUploadingFiles(false);
          }
        }

        await finalizarTareaAsignacion(tareaAsignacionId);
        notifySuccess({ title: "Tarea completada", message: "El registro quedó guardado y la tarea se marcó como completada." });
        navigate(returnHref);
        return;
      }

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
          eyebrow={isEditMode ? "Edición operativa" : isTaskMode ? "Ejecución de tarea" : "Carga rápida"}
          title={isEditMode ? "Editar registro" : isTaskMode ? "Completar tarea" : "Registrar actividad"}
          description={isEditMode ? "Actualizá el registro, la ejecución y los costos de la tarea en una pantalla completa." : isTaskMode ? "Registrá el avance final de la tarea en una pantalla completa y marcala como completada al guardar." : "Cargá la actividad y sus costos en un solo paso. Queda completada a tu nombre."}
        />

        {isEditMode || isTaskMode ? (
          <div className="flex flex-wrap items-center gap-3">
            <Link to={returnHref}>
              <AppButton variant="ghost">Volver</AppButton>
            </Link>
            <span className="text-sm text-[color:var(--text-ink-muted)]">
              {isEditMode ? "Estás editando un registro ya guardado." : "Estás ejecutando una tarea pendiente desde Operación de campo."}
            </span>
          </div>
        ) : null}

        {loadingEdit ? (
          <NoticeBanner tone="info">Cargando el registro para edición…</NoticeBanner>
        ) : null}

        <Stepper steps={STEPS} current={step} onStep={(n) => { if (n <= step) setStep(n); }} />

        {draftRestored ? (
          <NoticeBanner tone="info">
            Se restauró un borrador sin terminar.{" "}
            <button type="button" onClick={resetAll} className="font-medium underline">Descartar</button>
          </NoticeBanner>
        ) : null}

        {step === 0 ? (
        <AppCard
          padding="lg"
          header={<h3 className="text-base font-semibold">Datos de la actividad</h3>}
        >
          <div className="grid gap-3 md:grid-cols-3">
            <AppSelect label="Actividad *" value={procesoId} onChange={(e) => { setProcesoId(e.target.value); setDraft({}); }} disabled={isTaskMode}>
              <option value="">{loadingProcesos ? "Cargando…" : "Seleccionar…"}</option>
              {procesosPorEtapa.map(([etapa, items]) => (
                <optgroup key={etapa} label={etapa}>
                  {items.map((p) => <option key={p.proceso_id} value={p.proceso_id}>{p.nombre}</option>)}
                </optgroup>
              ))}
            </AppSelect>
            <AppSelect label="Finca *" value={fincaId} onChange={(e) => { setFincaId(e.target.value); setCuartelId(""); }} disabled={isTaskMode}>
              <option value="">Seleccionar…</option>
              {fincas.filter((f) => f.finca_id).map((f) => <option key={f.finca_id} value={f.finca_id}>{f.nombre_finca ?? f.finca_id}</option>)}
            </AppSelect>
            <AppSelect label="Cuartel *" value={cuartelId} onChange={(e) => setCuartelId(e.target.value)} disabled={isTaskMode}>
              <option value="">Seleccionar…</option>
              {cuarteles.filter((c) => c.cuartel_id ?? c.id).map((c) => <option key={c.cuartel_id ?? c.id} value={String(c.cuartel_id ?? c.id)}>{c.codigo_cuartel}</option>)}
            </AppSelect>
          </div>
          {isTaskMode ? (
            <div className="mt-3 rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-accent-soft)] px-3 py-2 text-xs text-[color:var(--text-ink-muted)]">
              La actividad, la finca y el cuartel vienen definidos por la orden seleccionada. Acá solo completás el detalle de ejecución.
            </div>
          ) : null}
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
        ) : null}

        {step === 1 ? (
        <AppCard
          padding="lg"
          header={<h3 className="text-base font-semibold">Superficie y mano de obra</h3>}
        >
          <div className="grid gap-3 md:grid-cols-2">
            <AppSelect label="Modalidad de ejecución" value={modalidad} onChange={(e) => setModalidad(e.target.value as ModalidadEjecucion)}>
              {MODALIDADES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </AppSelect>
            <div className="space-y-2.5">
              <AppInput
                label="Superficie intervenida (ha) *"
                type="number"
                min="0"
                value={superficie}
                onChange={(e) => setSuperficie(nonNeg(e.target.value))}
              />
              <p className="text-xs text-[color:var(--text-ink-muted)]">{superficieCuartelHint}</p>
            </div>
            <AppInput label="Fecha de inicio" type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
            <AppInput label="Fecha de fin" type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
            <AppInput label="Cantidad ejecutada" type="number" min="0" value={cantEjec} onChange={(e) => setCantEjec(nonNeg(e.target.value))} placeholder="ej. 4500" />
            <AppSelect label="Unidad" value={unidadEjec} onChange={(e) => setUnidadEjec(e.target.value)}>
              <option value="">Seleccionar…</option>
              {UNIDADES_EJECUCION.map((unidad) => (
                <option key={unidad.value} value={unidad.value}>
                  {unidad.label}
                </option>
              ))}
            </AppSelect>
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
        ) : null}

        {step === 2 ? (
        <>
        {(isEditMode || isTaskMode) && tareaId ? (
          <AppCard padding="lg" header={<h3 className="text-base font-semibold">Costos y recursos de la tarea</h3>}>
            <p className="mb-4 text-sm text-[color:var(--text-ink-muted)]">
              Gestioná maquinaria, insumos, contratistas y ejecución detallada con más espacio de trabajo que en el modal.
            </p>
            <CostosActividadPanel
              tareaId={tareaId}
              bodegaId={bodegaId}
              actividadClave={selectedProceso?.nombre}
              esFertilizacion={esFertilizacion}
              esLaborConMaquina={esLaborConMaquina}
            />
          </AppCard>
        ) : null}
        {!isEditMode && !isTaskMode ? (
        <>
        {/* Máquinas y equipos */}
        <AppCard
          padding="lg"
          header={<h3 className="text-base font-semibold">Máquinas y equipos</h3>}
        >
          {!aplicaMaquinaria && !expandMaq ? (
            <div>
              <NoAplicaNota>Esta labor es manual y normalmente no usa maquinaria.</NoAplicaNota>
              <AppButton variant="ghost" size="sm" onClick={() => setExpandMaq(true)}>Agregar de todas formas</AppButton>
            </div>
          ) : (
          <>
          {esLaborConMaquina ? (
            <p className="mb-3 rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-accent-soft)] px-3 py-2 text-xs text-[color:var(--text-ink-muted)]">
              Cargá acá el <strong>tractor / máquina</strong> desde tu catálogo (con sus horas y combustible). No hace falta escribirlo en el detalle.
            </p>
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
            <AppSelect
              label="Clase"
              value={maqClase}
              onChange={(e) => {
                setMaqClase(e.target.value as ClaseMaquinaria | "");
                setMaqTarifaId("");
              }}
            >
              <option value="">Todas</option>
              {CLASES_MAQUINARIA.map((clase) => (
                <option key={clase.value} value={clase.value}>
                  {clase.label}
                </option>
              ))}
            </AppSelect>
            <AppSelect label="Máquina / equipo" value={maqTarifaId} onChange={(e) => setMaqTarifaId(e.target.value)}>
              <option value="">{maqClase ? "Seleccionar…" : "Elegí una clase primero o ver todas"}</option>
              {tarifasMaqFiltradas.map((t) => <option key={t.tarifa_maquinaria_id} value={t.tarifa_maquinaria_id}>{t.nombre} ({t.clase})</option>)}
            </AppSelect>
            <AppInput label="Cantidad" type="number" value={maqCantidad} onChange={(e) => setMaqCantidad(e.target.value)} placeholder="opcional" />
            <AppInput label="Horas de uso" type="number" value={maqHoras} onChange={(e) => setMaqHoras(e.target.value)} />
            <div className="flex items-end"><AppButton variant="secondary" onClick={addMaquina}>Agregar</AppButton></div>
          </div>
          </>
          )}
        </AppCard>

        {/* Insumos */}
        <AppCard
          padding="lg"
          header={<h3 className="text-base font-semibold">{esFertilizacion ? "Fertilizante / insumos" : "Insumos"}</h3>}
        >
          {!aplicaInsumos && !expandIns ? (
            <div>
              <NoAplicaNota>Esta labor normalmente no lleva insumos.</NoAplicaNota>
              <AppButton variant="ghost" size="sm" onClick={() => setExpandIns(true)}>Agregar de todas formas</AppButton>
            </div>
          ) : (
          <>
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
            superficieHa={Number(superficie) || 0}
            reservado={(id) => insumos.filter((i) => i.insumo_id === id).reduce((acc, i) => acc + (Number(i.cantidad_total) || 0), 0)}
            onAdd={addInsumo}
            onError={(message) => notifyError({ title: "No se pudo agregar", message })}
          />
          </>
          )}
        </AppCard>

        {/* Mano de obra contratada */}
        {requiresContratista ? (
          <AppCard
            padding="lg"
            header={<h3 className="text-base font-semibold">Mano de obra contratada</h3>}
          >
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
        </>
        ) : null}

        {/* Adjuntos (fotos y archivos) */}
        <AppCard
          padding="lg"
          header={<h3 className="text-base font-semibold">Adjuntos <span className="text-sm font-normal text-[color:var(--text-ink-muted)]">(fotos y archivos — opcional)</span></h3>}
        >
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

        </>
        ) : null}
      </div>

      {/* Barra de acción fija */}
      <div className="fixed inset-x-0 bottom-0 border-t border-[color:var(--border-shell)] bg-[color:var(--surface-shell)]/95 px-6 py-3 backdrop-blur md:left-[280px]">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3">
          {step > 0 ? (
            <AppButton variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))}>Atrás</AppButton>
          ) : (
            <Link to="/operacion/campo"><AppButton variant="ghost">Ir a Operación de campo</AppButton></Link>
          )}
          <div className="flex items-center gap-2">
            {step < 2 && !currentStepValid ? (
              <span className="hidden text-xs text-[color:var(--text-ink-muted)] sm:inline">
                {step === 0 ? "Elegí actividad, finca y cuartel" : "Ingresá la superficie"}
              </span>
            ) : null}
            {step < 2 ? (
              <AppButton variant="primary" disabled={!currentStepValid} onClick={() => setStep((s) => s + 1)}>
                Siguiente
              </AppButton>
            ) : (
              <AppButton variant="primary" size="lg" loading={saving || uploadingFiles} onClick={() => void handleSubmit()}>
                {isEditMode ? "Guardar cambios" : isTaskMode ? "Guardar y completar tarea" : "Registrar actividad y costos"}
              </AppButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
