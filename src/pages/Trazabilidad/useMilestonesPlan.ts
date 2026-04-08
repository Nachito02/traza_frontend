import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  completeMilestone,
  fetchMilestones,
  uploadEvidence,
  type Milestone,
} from "../../features/milestones/api";
import { createEvento } from "../../features/eventos/api";
import { fetchOperariosByBodega, type Operario } from "../../features/operarios/api";
import { fetchTrazabilidad, type Trazabilidad } from "../../features/trazabilidades/api";
import { EVENTO_CONFIG } from "./eventoConfig";
import { fetchCampaniaById } from "../../features/campanias/api";
import { fetchFincaById, type Finca } from "../../features/fincas/api";
import { fetchCuartelById, type Cuartel } from "../../features/cuarteles/api";
import { fetchProtocoloById } from "../../features/protocolos/api";
import {
  fetchHallazgosByTrazabilidad,
  fetchIndicadoresByTrazabilidad,
  type CumplimientoIndicadores,
  type HallazgoCumplimiento,
} from "../../features/cumplimiento/api";
import { useAuthStore } from "../../store/authStore";

export type StageGroup = {
  name: string;
  order: number;
  milestones: Milestone[];
  total: number;
  completed: number;
  requiredPending: number;
};

export type GlobalSummary = {
  total: number;
  completed: number;
  requiredPending: number;
  progress: number;
};

export type ProcessContextSummary = {
  nombre: string;
  estado: string;
  bodegaNombre: string;
  fincaNombre: string;
  cuartelNombre: string;
  campaniaNombre: string;
  protocoloNombre: string;
};

export const useMilestonesPlan = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const bodegas = useAuthStore((state) => state.bodegas);
  const [searchParams] = useSearchParams();
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<Milestone | null>(null);
  const [uploadActive, setUploadActive] = useState<Milestone | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [trazabilidad, setTrazabilidad] = useState<Trazabilidad | null>(null);
  const [operarios, setOperarios] = useState<Operario[]>([]);
  const [hallazgos, setHallazgos] = useState<HallazgoCumplimiento[]>([]);
  const [indicadores, setIndicadores] = useState<CumplimientoIndicadores | null>(null);
  const [contextSummary, setContextSummary] = useState<ProcessContextSummary | null>(null);
  const [fincaDetail, setFincaDetail] = useState<Finca | null>(null);
  const [cuartelDetail, setCuartelDetail] = useState<Cuartel | null>(null);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [selectedStageName, setSelectedStageName] = useState<string>("");
  const [form, setForm] = useState<Record<string, string>>({});

  const milestoneIdFromQuery = searchParams.get("milestoneId");

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    setLoading(true);
    setError(null);
    Promise.all([fetchMilestones(id), fetchTrazabilidad(id)])
      .then(async ([milestonesData, trazabilidadData]) => {
        if (!mounted) return;
        setMilestones(
          [...(milestonesData ?? [])].sort(
            (a, b) => a.protocolo_proceso.orden - b.protocolo_proceso.orden
          )
        );
        setTrazabilidad(trazabilidadData);
        const activeBodega = bodegas.find(
          (item) => String(item.bodega_id) === String(trazabilidadData.bodega_id),
        );

        try {
          const [
            fetchedOperarios,
            hallazgosData,
            indicadoresData,
            campania,
            finca,
            cuartel,
            protocolo,
          ] = await Promise.all([
            fetchOperariosByBodega(trazabilidadData.bodega_id).catch(() => []),
            fetchHallazgosByTrazabilidad(id).catch(() => []),
            fetchIndicadoresByTrazabilidad(id).catch(() => null),
            fetchCampaniaById(trazabilidadData.campania_id).catch(() => null),
            trazabilidadData.finca_id
              ? fetchFincaById(trazabilidadData.finca_id).catch(() => null)
              : Promise.resolve(null),
            trazabilidadData.cuartel_id
              ? fetchCuartelById(trazabilidadData.cuartel_id).catch(() => null)
              : Promise.resolve(null),
            fetchProtocoloById(trazabilidadData.protocolo_id).catch(() => null),
          ]);
          if (!mounted) return;
          setOperarios((fetchedOperarios ?? []).filter((item) => item.is_active !== false));
          setHallazgos(hallazgosData ?? []);
          setIndicadores(indicadoresData);
          setFincaDetail(finca);
          setCuartelDetail(cuartel);
          setContextSummary({
            nombre: trazabilidadData.nombre_producto?.trim() || "Proceso sin nombre",
            estado: trazabilidadData.estado ?? "draft",
            bodegaNombre: activeBodega?.nombre ?? "Bodega activa",
            fincaNombre:
              finca?.nombre ?? finca?.nombre_finca ?? finca?.name ?? "Sin finca principal",
            cuartelNombre: cuartel?.codigo_cuartel ?? "Sin cuartel principal",
            campaniaNombre: campania?.nombre ?? trazabilidadData.campania_id,
            protocoloNombre: protocolo?.nombre ?? protocolo?.codigo ?? trazabilidadData.protocolo_id,
          });
        } catch {
          if (!mounted) return;
          setOperarios([]);
          setHallazgos([]);
          setIndicadores(null);
          setFincaDetail(null);
          setCuartelDetail(null);
          setContextSummary({
            nombre: trazabilidadData.nombre_producto?.trim() || "Proceso sin nombre",
            estado: trazabilidadData.estado ?? "draft",
            bodegaNombre: activeBodega?.nombre ?? "Bodega activa",
            fincaNombre: "Sin finca principal",
            cuartelNombre: "Sin cuartel principal",
            campaniaNombre: trazabilidadData.campania_id,
            protocoloNombre: trazabilidadData.protocolo_id,
          });
        }
      })
      .catch(() => {
        if (!mounted) return;
        setError("No se pudieron cargar los milestones.");
        setOperarios([]);
        setHallazgos([]);
        setIndicadores(null);
        setFincaDetail(null);
        setCuartelDetail(null);
        setContextSummary(null);
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [bodegas, id]);

  const milestonesByStage = useMemo((): StageGroup[] => {
    const groups: Record<string, { order: number; milestones: Milestone[] }> = {};

    milestones.forEach((m) => {
      const stageName = m.protocolo_proceso.protocolo_etapa?.nombre || "General";
      const stageOrder = m.protocolo_proceso.protocolo_etapa?.orden ?? 999;
      if (!groups[stageName]) {
        groups[stageName] = { order: stageOrder, milestones: [] };
      }
      groups[stageName].milestones.push(m);
    });

    return Object.entries(groups)
      .map(([name, value]) => {
        const total = value.milestones.length;
        const completed = value.milestones.filter((m) => m.estado === "completado").length;
        const requiredPending = value.milestones.filter(
          (m) => m.protocolo_proceso.obligatorio && m.estado !== "completado"
        ).length;
        return {
          name,
          order: value.order,
          milestones: value.milestones,
          total,
          completed,
          requiredPending,
        };
      })
      .sort((a, b) => a.order - b.order);
  }, [milestones]);

  useEffect(() => {
    if (milestonesByStage.length === 0) {
      setSelectedStageName("");
      return;
    }
    const selectedExists = milestonesByStage.some((stage) => stage.name === selectedStageName);
    if (selectedExists) return;
    const firstPendingStage =
      milestonesByStage.find((stage) => stage.requiredPending > 0) ?? milestonesByStage[0];
    setSelectedStageName(firstPendingStage.name);
  }, [milestonesByStage, selectedStageName]);

  const selectedStage = useMemo(
    () =>
      milestonesByStage.find((stage) => stage.name === selectedStageName) ??
      milestonesByStage[0] ??
      null,
    [milestonesByStage, selectedStageName]
  );

  const globalSummary = useMemo((): GlobalSummary => {
    const total = milestones.length;
    const completed = milestones.filter((m) => m.estado === "completado").length;
    const requiredPending = milestones.filter(
      (m) => m.protocolo_proceso.obligatorio && m.estado !== "completado"
    ).length;
    const progress = total === 0 ? 0 : Math.round((completed / total) * 100);
    return { total, completed, requiredPending, progress };
  }, [milestones]);

  const obligatorioPendiente = useMemo(() => {
    return milestones.some(
      (m) => m.protocolo_proceso.obligatorio && m.estado !== "completado"
    );
  }, [milestones]);

  const nextPendingMilestone = useMemo(() => {
    const firstPendingRequired = milestones.find(
      (item) => item.protocolo_proceso.obligatorio && item.estado !== "completado",
    );
    if (firstPendingRequired) return firstPendingRequired;
    return milestones.find((item) => item.estado !== "completado") ?? null;
  }, [milestones]);

  const nextStep = useMemo(() => {
    if (!nextPendingMilestone) return null;
    return {
      stageName: nextPendingMilestone.protocolo_proceso.protocolo_etapa?.nombre ?? "General",
      processName: nextPendingMilestone.protocolo_proceso.nombre,
      isRequired: nextPendingMilestone.protocolo_proceso.obligatorio,
    };
  }, [nextPendingMilestone]);

  const openModal = useCallback((milestone: Milestone) => {
    setFormError(null);
    const tipo = milestone.protocolo_proceso.evento_tipo;
    const config = EVENTO_CONFIG[tipo];
    const nextForm: Record<string, string> = {};
    if (config) {
      config.fields.forEach((field) => {
        nextForm[field.name] = field.defaultValue ?? "";
      });
    }

    const activeBodega = bodegas.find(
      (item) => String(item.bodega_id) === String(trazabilidad?.bodega_id ?? ""),
    );

    if (tipo === "origen_unidad_productiva") {
      nextForm.fecha = nextForm.fecha || new Date().toISOString().slice(0, 10);
      nextForm.productor_razon_social =
        nextForm.productor_razon_social ||
        activeBodega?.razon_social ||
        activeBodega?.nombre ||
        "";
      nextForm.localidad =
        nextForm.localidad ||
        fincaDetail?.ubicacion_texto ||
        fincaDetail?.ubicacion ||
        "";
      nextForm.provincia = nextForm.provincia || "";
      nextForm.codigo_cuartel =
        nextForm.codigo_cuartel || cuartelDetail?.codigo_cuartel || "";
      nextForm.superficie_ha =
        nextForm.superficie_ha ||
        (cuartelDetail?.superficie_ha != null ? String(cuartelDetail.superficie_ha) : "");
      nextForm.cultivo = nextForm.cultivo || cuartelDetail?.cultivo || "";
      nextForm.variedad = nextForm.variedad || cuartelDetail?.variedad || "";
      nextForm.sistema_productivo =
        nextForm.sistema_productivo || cuartelDetail?.sistema_productivo || "";
      nextForm.sistema_conduccion =
        nextForm.sistema_conduccion || cuartelDetail?.sistema_conduccion || "";
      nextForm.sistema_riego = nextForm.sistema_riego || "";
    }

    if (tipo === "inventario_insumos") {
      nextForm.fecha = nextForm.fecha || new Date().toISOString().slice(0, 10);
      nextForm.estado = nextForm.estado || "vigente";
    }

    if (tipo === "energia_riego") {
      nextForm.fecha = nextForm.fecha || new Date().toISOString().slice(0, 10);
      nextForm.tipo_energia = nextForm.tipo_energia || "electrica";
      nextForm.unidad = nextForm.unidad || "kWh";
      nextForm.periodo = nextForm.periodo || new Date().toISOString().slice(0, 7);
    }

    if (tipo === "energia_heladas") {
      nextForm.fecha = nextForm.fecha || new Date().toISOString().slice(0, 10);
      nextForm.tipo_energia = nextForm.tipo_energia || "combustible";
      nextForm.unidad = nextForm.unidad || "litros";
      nextForm.periodo = nextForm.periodo || new Date().toISOString().slice(0, 7);
    }

    setForm(nextForm);
    setActive(milestone);
  }, [bodegas, cuartelDetail, fincaDetail, trazabilidad?.bodega_id]);

  useEffect(() => {
    if (!milestoneIdFromQuery || milestones.length === 0 || active) return;
    const target = milestones.find((m) => m.milestone_id === milestoneIdFromQuery);
    if (!target) return;
    if (target.estado === "completado") return;
    openModal(target);
  }, [active, milestoneIdFromQuery, milestones, openModal]);

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
    if (!uploadActive || !fileToUpload) return;
    setUploading(true);
    try {
      const newEvidence = await uploadEvidence(uploadActive.milestone_id, fileToUpload);
      setMilestones((prev) =>
        prev.map((m) => {
          if (m.milestone_id === uploadActive.milestone_id) {
            return {
              ...m,
              evidencia: [...(m.evidencia || []), newEvidence],
            };
          }
          return m;
        })
      );
      closeUploadModal();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Error al subir archivo");
    } finally {
      setUploading(false);
    }
  };

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
      const missing = config.fields.filter((field) => field.required && !form[field.name]);
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
        const rawValue = form[field.name];
        if (!rawValue) return;
        if (field.type === "number") {
          const parsed = Number(rawValue);
          if (!Number.isNaN(parsed)) payload[field.name] = parsed;
          return;
        }
        payload[field.name] = rawValue;
      });

      const endpointTipo =
        tipo === "energia_riego" || tipo === "energia_heladas" ? "energia" : tipo;

      const TIPOS_CUARTEL = new Set([
        "riego", "cosecha", "fenologia", "fertilizacion", "labor_suelo",
        "canopia", "aplicacion_fitosanitaria", "monitoreo_enfermedad",
        "monitoreo_plaga", "enmienda", "cobertura_erosion",
        "origen_unidad_productiva", "energia_riego", "energia_heladas",
      ]);
      const TIPOS_BODEGA = new Set([
        "accidente", "capacitacion", "entrega_epp", "limpieza_cosecha",
        "mantenimiento", "no_conforme", "reclamo", "residuo",
        "sanitizacion_banos", "sobrante_lavado", "inventario_insumos",
      ]);
      const TIPOS_FINCA = new Set(["precipitacion"]);

      if (TIPOS_CUARTEL.has(tipo)) {
        payload.cuartelId = trazabilidad.cuartel_id;
        payload.campaniaId = trazabilidad.campania_id;
      }

      if (tipo === "origen_unidad_productiva") {
        payload.fincaId = trazabilidad.finca_id;
      } else if (TIPOS_FINCA.has(tipo)) {
        payload.fincaId = trazabilidad.finca_id;
        payload.campaniaId = trazabilidad.campania_id;
      }

      if (TIPOS_BODEGA.has(tipo)) {
        payload.bodegaId = trazabilidad.bodega_id;
      }

      await createEvento(endpointTipo, payload);

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

  const navigateToTareas = (milestoneId: string) => {
    navigate(
      `/tareas?milestoneId=${encodeURIComponent(milestoneId)}&trazabilidadId=${encodeURIComponent(id ?? "")}`
    );
  };

  return {
    // state
    loading,
    error,
    milestones,
    active,
    uploadActive,
    saving,
    uploading,
    formError,
    fileToUpload,
    form,
    operarios,
    // derived
    milestonesByStage,
    selectedStage,
    globalSummary,
    obligatorioPendiente,
    hallazgos,
    indicadores,
    contextSummary,
    nextStep,
    // actions
    setSelectedStageName,
    setFileToUpload,
    openModal,
    closeModal,
    openUploadModal,
    closeUploadModal,
    onChange,
    handleUpload,
    handleSubmit,
    navigateToTareas,
  };
};
