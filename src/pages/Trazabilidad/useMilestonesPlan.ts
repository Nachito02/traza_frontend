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

export const useMilestonesPlan = () => {
  const { id } = useParams();
  const navigate = useNavigate();
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
        try {
          const fetchedOperarios = await fetchOperariosByBodega(trazabilidadData.bodega_id);
          if (!mounted) return;
          setOperarios((fetchedOperarios ?? []).filter((item) => item.is_active !== false));
        } catch {
          if (!mounted) return;
          setOperarios([]);
        }
      })
      .catch(() => {
        if (!mounted) return;
        setError("No se pudieron cargar los milestones.");
        setOperarios([]);
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [id]);

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
    setForm(nextForm);
    setActive(milestone);
  }, []);

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

      const TIPOS_CUARTEL = new Set([
        "riego", "cosecha", "fenologia", "fertilizacion", "labor_suelo",
        "canopia", "aplicacion_fitosanitaria", "monitoreo_enfermedad",
        "monitoreo_plaga", "enmienda", "cobertura_erosion",
      ]);
      const TIPOS_BODEGA = new Set([
        "accidente", "capacitacion", "entrega_epp", "limpieza_cosecha",
        "mantenimiento", "no_conforme", "reclamo", "residuo",
        "sanitizacion_banos", "sobrante_lavado",
      ]);

      if (TIPOS_CUARTEL.has(tipo)) {
        payload.cuartelId = trazabilidad.cuartel_id;
        payload.campaniaId = trazabilidad.campania_id;
      } else if (TIPOS_BODEGA.has(tipo)) {
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
