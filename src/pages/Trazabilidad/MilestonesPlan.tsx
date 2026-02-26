import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  completeMilestone,
  fetchMilestones,
  uploadEvidence,
  type Milestone,
} from "../../features/milestones/api";
import {
  createEvento,
} from "../../features/eventos/api";
import { fetchTrazabilidad, type Trazabilidad } from "../../features/trazabilidades/api";
import { Upload, FileText, ExternalLink } from "lucide-react";

type FieldType = "date" | "text" | "number" | "textarea";

type FieldDef = {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  step?: string;
  placeholder?: string;
  defaultValue?: string;
};

type EventoConfig = {
  label: string;
  fields: FieldDef[];
};

const EVENTO_CONFIG: Record<string, EventoConfig> = {
  riego: {
    label: "Riego",
    fields: [
      { name: "fecha", label: "Fecha", type: "date", required: true },
      {
        name: "volumen",
        label: "Volumen",
        type: "number",
        required: true,
        step: "0.01",
      },
      {
        name: "unidad",
        label: "Unidad",
        type: "text",
        required: true,
        defaultValue: "m3",
      },
      {
        name: "sistema_riego",
        label: "Sistema de riego",
        type: "text",
        defaultValue: "goteo",
      },
    ],
  },
  cosecha: {
    label: "Cosecha",
    fields: [
      {
        name: "fecha_cosecha",
        label: "Fecha de cosecha",
        type: "date",
        required: true,
      },
      {
        name: "cantidad",
        label: "Cantidad",
        type: "number",
        required: true,
        step: "0.01",
      },
      {
        name: "unidad",
        label: "Unidad",
        type: "text",
        required: true,
        defaultValue: "kg",
      },
      { name: "destino", label: "Destino", type: "text", defaultValue: "bodega" },
    ],
  },
  fenologia: {
    label: "Fenología",
    fields: [
      { name: "fecha", label: "Fecha", type: "date", required: true },
      {
        name: "estado_fenologico",
        label: "Estado fenológico",
        type: "text",
        required: true,
      },
      {
        name: "porcentaje_avance",
        label: "Porcentaje de avance",
        type: "number",
        step: "0.01",
      },
    ],
  },
  fertilizacion: {
    label: "Fertilización",
    fields: [
      { name: "fecha", label: "Fecha", type: "date", required: true },
      { name: "dosis", label: "Dosis", type: "number", required: true },
      { name: "unidad", label: "Unidad", type: "text", required: true },
      { name: "cantidad_total", label: "Cantidad total", type: "number" },
      { name: "insumo_id", label: "Insumo (ID)", type: "text" },
    ],
  },
  labor_suelo: {
    label: "Labor de suelo",
    fields: [
      { name: "fecha", label: "Fecha", type: "date", required: true },
      { name: "tipo_labor", label: "Tipo de labor", type: "text", required: true },
      { name: "horas", label: "Horas", type: "number", step: "0.01" },
      { name: "hs_por_ha", label: "Hs por ha", type: "number", step: "0.01" },
      {
        name: "total_horas_cuartel",
        label: "Total horas cuartel",
        type: "number",
        step: "0.01",
      },
    ],
  },
  canopia: {
    label: "Canopia",
    fields: [
      { name: "fecha", label: "Fecha", type: "date", required: true },
      { name: "tipo_practica", label: "Tipo de práctica", type: "text", required: true },
      { name: "intensidad", label: "Intensidad", type: "text" },
      { name: "jornales", label: "Jornales", type: "number", step: "0.01" },
      {
        name: "observaciones",
        label: "Observaciones",
        type: "textarea",
      },
    ],
  },
  aplicacion_fitosanitaria: {
    label: "Aplicación fitosanitaria",
    fields: [
      { name: "fecha", label: "Fecha", type: "date", required: true },
      { name: "dosis", label: "Dosis", type: "number", required: true },
      { name: "unidad", label: "Unidad", type: "text", required: true },
      {
        name: "carencia_dias",
        label: "Carencia (días)",
        type: "number",
        required: true,
      },
      { name: "insumo_lote_id", label: "Insumo lote (ID)", type: "text" },
      { name: "motivo", label: "Motivo", type: "text" },
    ],
  },
  monitoreo_enfermedad: {
    label: "Monitoreo de enfermedad",
    fields: [
      { name: "fecha", label: "Fecha", type: "date", required: true },
      { name: "enfermedad", label: "Enfermedad", type: "text", required: true },
      { name: "incidencia", label: "Incidencia", type: "text" },
    ],
  },
  monitoreo_plaga: {
    label: "Monitoreo de plaga",
    fields: [
      { name: "fecha", label: "Fecha", type: "date", required: true },
      { name: "plaga", label: "Plaga", type: "text", required: true },
      { name: "nivel", label: "Nivel", type: "text" },
    ],
  },
  analisis_suelo: {
    label: "Análisis de suelo",
    fields: [
      { name: "fecha", label: "Fecha", type: "date", required: true },
      {
        name: "unidad_muestreada",
        label: "Unidad muestreada",
        type: "text",
        required: true,
      },
      { name: "laboratorio", label: "Laboratorio", type: "text" },
      {
        name: "parametros",
        label: "Parámetros (JSON)",
        type: "textarea",
        placeholder: "{\"ph\": 6.8}",
      },
    ],
  },
  precipitacion: {
    label: "Precipitación",
    fields: [
      { name: "fecha", label: "Fecha", type: "date", required: true },
      {
        name: "milimetros",
        label: "Milímetros",
        type: "number",
        required: true,
        step: "0.01",
      },
    ],
  },
  energia: {
    label: "Energía",
    fields: [
      { name: "periodo", label: "Periodo", type: "text", required: true },
      { name: "tipo_energia", label: "Tipo", type: "text", required: true },
      {
        name: "consumo",
        label: "Consumo",
        type: "number",
        required: true,
      },
      { name: "unidad", label: "Unidad", type: "text", required: true },
    ],
  },
  accidente: {
    label: "Accidente",
    fields: [
      { name: "fecha", label: "Fecha", type: "date", required: true },
      { name: "persona_id", label: "Persona (ID)", type: "text", required: true },
      {
        name: "accion_correctiva",
        label: "Acción correctiva",
        type: "textarea",
      },
    ],
  },
  capacitacion: {
    label: "Capacitación",
    fields: [
      { name: "fecha", label: "Fecha", type: "date", required: true },
      { name: "tema", label: "Tema", type: "text", required: true },
    ],
  },
  entrega_epp: {
    label: "Entrega EPP",
    fields: [
      { name: "fecha", label: "Fecha", type: "date", required: true },
      { name: "persona_id", label: "Persona (ID)", type: "text", required: true },
      { name: "epp", label: "EPP", type: "text", required: true },
    ],
  },
  limpieza_cosecha: {
    label: "Limpieza de cosecha",
    fields: [
      { name: "fecha", label: "Fecha", type: "date", required: true },
      { name: "elemento", label: "Elemento", type: "text", required: true },
      { name: "metodo", label: "Método", type: "text" },
      {
        name: "responsable_persona_id",
        label: "Responsable (ID)",
        type: "text",
      },
    ],
  },
  mantenimiento: {
    label: "Mantenimiento",
    fields: [
      { name: "fecha", label: "Fecha", type: "date", required: true },
      { name: "equipo", label: "Equipo", type: "text", required: true },
      { name: "tipo_mantenimiento", label: "Tipo", type: "text", required: true },
      {
        name: "responsable_persona_id",
        label: "Responsable (ID)",
        type: "text",
      },
    ],
  },
  no_conforme: {
    label: "No conforme",
    fields: [
      { name: "fecha", label: "Fecha", type: "date", required: true },
      { name: "descripcion", label: "Descripción", type: "textarea", required: true },
      { name: "estado", label: "Estado", type: "text", defaultValue: "abierta" },
    ],
  },
  reclamo: {
    label: "Reclamo",
    fields: [
      { name: "fecha", label: "Fecha", type: "date", required: true },
      { name: "origen", label: "Origen", type: "text", required: true },
      { name: "descripcion", label: "Descripción", type: "textarea" },
      { name: "estado", label: "Estado", type: "text", defaultValue: "abierto" },
    ],
  },
  residuo: {
    label: "Residuo",
    fields: [
      { name: "fecha", label: "Fecha", type: "date", required: true },
      { name: "tipo_residuo", label: "Tipo de residuo", type: "text", required: true },
      { name: "cantidad", label: "Cantidad", type: "number", step: "0.01" },
      { name: "unidad", label: "Unidad", type: "text" },
      { name: "destino", label: "Destino", type: "text", required: true },
      {
        name: "responsable_persona_id",
        label: "Responsable (ID)",
        type: "text",
      },
    ],
  },
  sanitizacion_banos: {
    label: "Sanitización de baños",
    fields: [
      { name: "fecha", label: "Fecha", type: "date", required: true },
      { name: "tipo_bano", label: "Tipo de baño", type: "text", required: true },
      {
        name: "checklist",
        label: "Checklist (JSON)",
        type: "textarea",
        placeholder: "{\"lavado\": true}",
      },
      {
        name: "responsable_persona_id",
        label: "Responsable (ID)",
        type: "text",
      },
    ],
  },
  sobrante_lavado: {
    label: "Sobrante de lavado",
    fields: [
      { name: "fecha", label: "Fecha", type: "date", required: true },
      { name: "tipo_sobrante", label: "Tipo", type: "text", required: true },
      { name: "volumen", label: "Volumen", type: "number", step: "0.01" },
      { name: "disposicion", label: "Disposición", type: "text" },
      {
        name: "responsable_persona_id",
        label: "Responsable (ID)",
        type: "text",
      },
    ],
  },
};

const MilestonesPlan = () => {
  const { id } = useParams();
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<Milestone | null>(null);
  const [uploadActive, setUploadActive] = useState<Milestone | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [trazabilidad, setTrazabilidad] = useState<Trazabilidad | null>(null);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);

  const [form, setForm] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    setLoading(true);
    setError(null);
    Promise.all([fetchMilestones(id), fetchTrazabilidad(id)])
      .then(([milestonesData, trazabilidadData]) => {
        if (!mounted) return;
        setMilestones(
          [...(milestonesData ?? [])].sort(
            (a, b) => a.protocolo_proceso.orden - b.protocolo_proceso.orden
          )
        );
        setTrazabilidad(trazabilidadData);
      })
      .catch(() => {
        if (!mounted) return;
        setError("No se pudieron cargar los milestones.");
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [id]);

  const milestonesByStage = useMemo(() => {
    const groups: Record<string, Milestone[]> = {};
    
    // Sort logic handled in fetch/useEffect, but grouping preserves order if we iterate correctly
    // or we can re-sort. Since they are sorted by process order, they should be roughly in stage order mostly.
    // Better to group by stage ID or Name and keeping the stage order (which we have in protocol_etapa.orden)
    
    milestones.forEach((m) => {
      const stageName = m.protocolo_proceso.protocolo_etapa?.nombre || "General";
      if (!groups[stageName]) {
        groups[stageName] = [];
      }
      groups[stageName].push(m);
    });

    // We want to return an array of groups sorted by stage order
    // But we need stage order from somewhere. `m.protocolo_proceso.protocolo_etapa.orden`
    
    const sortedStages = Object.keys(groups).sort((a, b) => {
        const stageA = groups[a][0].protocolo_proceso.protocolo_etapa?.orden ?? 999;
        const stageB = groups[b][0].protocolo_proceso.protocolo_etapa?.orden ?? 999;
        return stageA - stageB;
    });

    return sortedStages.map(stage => ({
        name: stage,
        milestones: groups[stage]
    }));
  }, [milestones]);

  const obligatorioPendiente = useMemo(() => {
    return milestones.some(
      (m) =>
        m.protocolo_proceso.obligatorio && m.estado !== "completado"
    );
  }, [milestones]);

  const openModal = (milestone: Milestone) => {
    setFormError(null);
    const tipo = milestone.protocolo_proceso.evento_tipo;
    const config = EVENTO_CONFIG[tipo];
    const nextForm: Record<string, string> = {};
    if (config) {
      config.fields.forEach((field) => {
        nextForm[field.name] = field.defaultValue ?? "";
      });
    }
    setForm(nextForm);
    setActive(milestone);
  };

  const closeModal = () => {
    setActive(null);
  };

  const openUploadModal = (milestone: Milestone) => {
    setUploadActive(milestone);
    setFileToUpload(null);
  };

  const closeUploadModal = () => {
    setUploadActive(null);
    setFileToUpload(null);
  };

  const onChange = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleUpload = async () => {
    if(!uploadActive || !fileToUpload) return;
    setUploading(true);
    try {
        const newEvidence = await uploadEvidence(uploadActive.milestone_id, fileToUpload);
        
        // Update local state
        setMilestones(prev => 
            prev.map(m => {
                if(m.milestone_id === uploadActive.milestone_id) {
                    return {
                        ...m,
                        evidencia: [...(m.evidencia || []), newEvidence]
                    }
                }
                return m;
            })
        );
        closeUploadModal();
    } catch (err) {
        alert("Error al subir archivo");
    } finally {
        setUploading(false);
    }
  }

  const handleSubmit = async () => {
    if (!active) return;
    setFormError(null);
    setSaving(true);
    try {
      const tipo = active.protocolo_proceso.evento_tipo;
      const config = EVENTO_CONFIG[tipo];
      if (!config) {
        setFormError("Tipo de evento no soportado todavía.");
        return;
      }
      const missing = config.fields.filter(
        (field) => field.required && !form[field.name]
      );
      if (missing.length > 0) {
        setFormError("Completá los campos obligatorios.");
        return;
      }
      if (!trazabilidad) {
        setFormError("No se pudo determinar la trazabilidad.");
        return;
      }

      const payload: Record<string, unknown> = {
        milestoneId: active.milestone_id,
      };

      config.fields.forEach((field) => {
        payload[field.name] = form[field.name];
      });

      if (tipo === "riego" || tipo === "cosecha") {
        payload.cuartelId = trazabilidad.cuartel_id;
        payload.campaniaId = trazabilidad.campania_id;
      }

      if (
        [
          "fenologia",
          "fertilizacion",
          "labor_suelo",
          "canopia",
          "aplicacion_fitosanitaria",
          "monitoreo_enfermedad",
          "monitoreo_plaga",
        ].includes(tipo)
      ) {
        payload.cuartelId = trazabilidad.cuartel_id;
        payload.campaniaId = trazabilidad.campania_id;
      }

      if (tipo === "analisis_suelo") {
        payload.cuartelId = trazabilidad.cuartel_id;
        payload.campaniaId = trazabilidad.campania_id;
      }

      if (tipo === "precipitacion") {
        payload.fincaId = trazabilidad.finca_id;
        payload.campaniaId = trazabilidad.campania_id;
      }

      if (tipo === "energia") {
        payload.cuartelId = trazabilidad.cuartel_id;
        payload.campaniaId = trazabilidad.campania_id;
      }

      if (
        [
          "accidente",
          "capacitacion",
          "entrega_epp",
          "limpieza_cosecha",
          "mantenimiento",
          "no_conforme",
          "reclamo",
          "residuo",
          "sanitizacion_banos",
          "sobrante_lavado",
        ].includes(tipo)
      ) {
        payload.bodegaId = trazabilidad.bodega_id;
      }

      await createEvento(tipo, payload);

      const updated = await completeMilestone(active.milestone_id);
      setMilestones((prev) =>
        prev.map((m) =>
          m.milestone_id === active.milestone_id
            ? { ...m, ...updated, estado: "completado" }
            : m
        )
      );
      closeModal();
    } catch {
      setFormError("No se pudo registrar el evento.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F9F6F2] via-[#F3E7DA] to-[#EAD8C6] px-6 py-10">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl text-[#3D1B1F]">Plan de trabajo</h1>
          <p className="mt-2 text-sm text-[#6B3A3F]">
            Completá los milestones del protocolo para cerrar la trazabilidad.
          </p>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-[#C9A961]/30 bg-white/90 p-6 text-center text-sm text-[#6B3A3F]">
            Cargando milestones…
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
            {error}
          </div>
        ) : milestones.length === 0 ? (
          <div className="rounded-2xl border border-[#C9A961]/30 bg-white/90 p-6 text-center text-sm text-[#6B3A3F]">
            No hay milestones para esta trazabilidad.
          </div>
        ) : (
          <div className="space-y-8">
            {milestonesByStage.map((stage) => (
                <div key={stage.name} className="space-y-3">
                    <h3 className="text-lg font-bold text-[#722F37] border-b border-[#C9A961]/30 pb-2">
                        {stage.name}
                    </h3>
                    {stage.milestones.map((m) => (
                    <div
                        key={m.milestone_id}
                        className="rounded-2xl border border-[#C9A961]/30 bg-white/90 p-5 shadow-sm"
                    >
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div>
                                <div className="text-sm font-semibold text-[#3D1B1F] flex items-center gap-2">
                                    {m.protocolo_proceso.orden}. {m.protocolo_proceso.nombre}
                                    {m.evidencia && m.evidencia.length > 0 && (
                                        <FileText className="w-4 h-4 text-blue-500" />
                                    )}
                                </div>
                                <div className="mt-1 text-xs text-[#7A4A50]">
                                    Tipo: {m.protocolo_proceso.evento_tipo} •{" "}
                                    {m.protocolo_proceso.obligatorio
                                    ? "Obligatorio"
                                    : "Opcional"}
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span
                                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                    m.estado === "completado"
                                        ? "bg-[#F3FBF2] text-[#2D6B2D]"
                                        : "bg-[#FFF9E9] text-[#8A6B1F]"
                                    }`}
                                >
                                    {m.estado}
                                </span>
                                
                                <button
                                    onClick={() => openUploadModal(m)}
                                    className="p-2 text-[#722F37] hover:bg-[#F8F3EE] rounded-lg transition"
                                    title="Adjuntar evidencia"
                                >
                                    <Upload className="w-4 h-4" />
                                </button>

                                <button
                                    type="button"
                                    onClick={() => openModal(m)}
                                    disabled={m.estado === "completado"}
                                    className="rounded-lg border border-[#C9A961]/40 px-3 py-2 text-xs font-semibold text-[#722F37] transition hover:border-[#C9A961] hover:bg-[#F8F3EE] disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    Registrar evento
                                </button>
                            </div>
                        </div>

                        {/* Evidence List */}
                        {m.evidencia && m.evidencia.length > 0 && (
                            <div className="mt-4 pl-4 border-l-2 border-[#C9A961]/20">
                                <p className="text-xs font-semibold text-[#7A4A50] mb-2">Evidencia adjunta:</p>
                                <div className="flex flex-wrap gap-2">
                                    {m.evidencia.map(evidence => (
                                        <a 
                                            key={evidence.evidencia_id} 
                                            href={`http://localhost:3000${evidence.url}`} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1 text-xs text-blue-600 hover:underline bg-blue-50 px-2 py-1 rounded"
                                        >
                                            <ExternalLink className="w-3 h-3" />
                                            Ver archivo
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    ))}
                </div>
            ))}
          </div>
        )}

        <div className="mt-8 flex justify-end">
          <button
            type="button"
            disabled={obligatorioPendiente}
            className="rounded-lg border border-[#C9A961]/40 px-4 py-2 text-sm font-semibold text-[#722F37] transition hover:border-[#C9A961] hover:bg-[#F8F3EE] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Finalizar trazabilidad
          </button>
        </div>
      </div>

      {active && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4">
              <h2 className="text-xl text-[#3D1B1F]">
                Registrar evento: {active.protocolo_proceso.nombre}
              </h2>
              <p className="text-xs text-[#7A4A50]">
                Tipo: {active.protocolo_proceso.evento_tipo}
              </p>
            </div>

            {EVENTO_CONFIG[active.protocolo_proceso.evento_tipo] ? (
              <div className="space-y-3">
                {EVENTO_CONFIG[active.protocolo_proceso.evento_tipo].fields.map(
                  (field) => (
                    <div key={field.name}>
                      <label className="block text-xs text-[#722F37] mb-2">
                        {field.label}
                      </label>
                      {field.type === "textarea" ? (
                        <textarea
                          className="w-full rounded-lg border-2 border-[#C9A961]/30 px-3 py-2 text-sm text-[#3D1B1F] outline-none focus:border-[#722F37]"
                          value={form[field.name] ?? ""}
                          onChange={(e) => onChange(field.name, e.target.value)}
                          placeholder={field.placeholder}
                        />
                      ) : (
                        <input
                          type={field.type}
                          step={field.step}
                          className="w-full rounded-lg border-2 border-[#C9A961]/30 px-3 py-2 text-sm text-[#3D1B1F] outline-none focus:border-[#722F37]"
                          value={form[field.name] ?? ""}
                          onChange={(e) => onChange(field.name, e.target.value)}
                          placeholder={field.placeholder}
                        />
                      )}
                    </div>
                  )
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Tipo de evento no soportado todavía.
              </div>
            )}

            {formError && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {formError}
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg border border-[#C9A961]/40 px-4 py-2 text-sm font-semibold text-[#722F37] transition hover:border-[#C9A961] hover:bg-[#F8F3EE]"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleSubmit()}
                className="rounded-lg border border-[#C9A961]/40 px-4 py-2 text-sm font-semibold text-[#722F37] transition hover:border-[#C9A961] hover:bg-[#F8F3EE] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Guardando..." : "Registrar evento"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {uploadActive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
             <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
                 <h2 className="text-xl text-[#3D1B1F] mb-4">Adjuntar Evidencia</h2>
                 <p className="text-sm text-[#7A4A50] mb-4">
                     Subir archivo para el hito: {uploadActive.protocolo_proceso.nombre}
                 </p>
                 
                 <div className="mb-6">
                    <input 
                        type="file" 
                        onChange={(e) => setFileToUpload(e.target.files?.[0] || null)}
                        className="w-full text-sm text-slate-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-full file:border-0
                        file:text-sm file:font-semibold
                        file:bg-[#F8F3EE] file:text-[#722F37]
                        hover:file:bg-[#F3E7DA]
                        "
                    />
                 </div>

                 <div className="flex justify-end gap-3">
                     <button
                        onClick={closeUploadModal}
                        className="rounded-lg border border-[#C9A961]/40 px-4 py-2 text-sm font-semibold text-[#722F37] transition hover:border-[#C9A961] hover:bg-[#F8F3EE]"
                     >
                         Cancelar
                     </button>
                     <button
                        onClick={() => void handleUpload()}
                        disabled={!fileToUpload || uploading}
                        className="rounded-lg bg-[#722F37] text-white px-4 py-2 text-sm font-semibold transition hover:bg-[#5E252D] disabled:opacity-50"
                     >
                         {uploading ? "Subiendo..." : "Subir archivo"}
                     </button>
                 </div>
             </div>
        </div>
      )}
    </div>
  );
};

export default MilestonesPlan;
