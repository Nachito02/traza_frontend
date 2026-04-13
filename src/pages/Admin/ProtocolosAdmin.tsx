import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  createEtapa,
  createProceso,
  createProtocolo,
  deleteEtapa,
  deleteProceso,
  deleteProtocolo,
  fetchProtocoloById,
  fetchProtocolos,
  type Protocolo,
  type ProtocoloPlantillaIteracion,
  type ProtocoloEtapa,
  type ProtocoloExpanded,
  type ProtocoloProceso,
  updateEtapa,
  updateProceso,
  updateProtocolo,
} from "../../features/protocolos/api";
import {
  AppButton,
  AppCard,
  AppInput,
  AppModal,
  AppSelect,
  AppTextarea,
  NoticeBanner,
  SectionIntro,
} from "../../components/ui";
import { getApiErrorMessage } from "../../lib/api";
import { resolveModuleAccess } from "../../lib/permissions";
import { useAuthStore } from "../../store/authStore";
import { EVENTO_CONFIG } from "../Trazabilidad/eventoConfig";

type FormState = {
  nombre: string;
  version: string;
  descripcion: string;
};

type EtapaDraft = {
  nombre: string;
  orden: string;
};

type ProcesoDraft = {
  nombre: string;
  orden: string;
  evento_tipo: string;
  campos_obligatorios: string[];
  plantilla_json: string;
};

const emptyForm: FormState = {
  nombre: "",
  version: "",
  descripcion: "",
};

const emptyEtapaDraft: EtapaDraft = {
  nombre: "",
  orden: "",
};

const emptyProcesoDraft: ProcesoDraft = {
  nombre: "",
  orden: "",
  evento_tipo: "",
  campos_obligatorios: [],
  plantilla_json: "",
};

function resolveId(item: Protocolo) {
  return String(item.protocolo_id ?? item.id ?? "");
}

function resolveEtapaId(item: ProtocoloEtapa) {
  return String(item.etapa_id ?? item.id ?? "");
}

function resolveProcesoId(item: ProtocoloProceso) {
  return String(item.proceso_id ?? item.id ?? "");
}

function mapFieldTypeToTemplateType(fieldType: string) {
  if (fieldType === "number") return "number";
  if (fieldType === "date") return "date";
  return "string";
}

function buildDefaultPlantillaFromEvento(eventoTipo: string) {
  const fields = EVENTO_CONFIG[eventoTipo]?.fields ?? [];
  return {
    version: 1,
    campos: fields.map((field) => ({
      campo: field.name,
      type: mapFieldTypeToTemplateType(field.type),
      required: Boolean(field.required),
      ...(field.options ? { enum: field.options.map((option) => option.value) } : {}),
    })),
  };
}

function stringifyPlantilla(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function parsePlantillaJson(raw: string) {
  if (!raw.trim()) return null;
  const parsed = JSON.parse(raw) as {
    version?: number;
    campos?: Array<{
      campo?: string;
      type?: string;
      required?: boolean;
      unit?: string;
      enum?: string[];
    }>;
  };
  const campos = Array.isArray(parsed.campos)
    ? parsed.campos
        .filter((item) => item && typeof item.campo === "string" && item.campo.trim())
        .map((item) => ({
          campo: String(item.campo).trim(),
          type: typeof item.type === "string" && item.type.trim() ? item.type.trim() : "string",
          required: Boolean(item.required),
          ...(typeof item.unit === "string" && item.unit.trim() ? { unit: item.unit.trim() } : {}),
          ...(Array.isArray(item.enum) ? { enum: item.enum.filter((entry) => typeof entry === "string") } : {}),
        }))
    : [];
  return {
    version: typeof parsed.version === "number" ? parsed.version : 1,
    campos,
  };
}

function resolveProcesoIdFromIteracion(item: ProtocoloPlantillaIteracion) {
  return String(item.proceso?.proceso_id ?? "");
}

function getFieldOptions(
  eventoTipo: string,
  plantillaIteracion?: ProtocoloPlantillaIteracion,
) {
  const required = plantillaIteracion?.plantilla?.campos_obligatorios ?? [];
  const optional = plantillaIteracion?.plantilla?.campos_opcionales ?? [];
  const fromPlantilla = [...required, ...optional]
    .filter((field): field is { campo: string } => Boolean(field?.campo))
    .map((field) => ({
      name: field.campo,
      label: field.campo,
      required: required.some((req) => req.campo === field.campo),
    }));
  if (fromPlantilla.length > 0) return fromPlantilla;
  return EVENTO_CONFIG[eventoTipo]?.fields ?? [];
}

function getDefaultRequiredFields(
  eventoTipo: string,
  plantillaIteracion?: ProtocoloPlantillaIteracion,
) {
  return getFieldOptions(eventoTipo, plantillaIteracion)
    .filter((field) => field.required)
    .map((field) => field.name);
}

function normalizeCamposObligatorios(
  source: ProtocoloProceso,
  defaultFromPlantilla: string[] = [],
) {
  const raw =
    source.campos_obligatorios ??
    source.required_fields ??
    source.camposObligatorios ??
    source.requiredFields ??
    [];
  const parsed = Array.isArray(raw) ? raw.filter((item): item is string => typeof item === "string") : [];
  if (parsed.length > 0) return parsed;
  if (defaultFromPlantilla.length > 0) return defaultFromPlantilla;
  return source.evento_tipo ? getDefaultRequiredFields(source.evento_tipo) : [];
}

export default function ProtocolosAdmin() {
  const user = useAuthStore((state) => state.user);
  const activeBodegaId = useAuthStore((state) => state.activeBodegaId);
  const access = resolveModuleAccess(user, activeBodegaId);

  const [items, setItems] = useState<Protocolo[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<"none" | "create" | "edit">("none");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [expanded, setExpanded] = useState<ProtocoloExpanded | null>(null);
  const [etapaDraftById, setEtapaDraftById] = useState<Record<string, EtapaDraft>>({});
  const [procesoDraftById, setProcesoDraftById] = useState<Record<string, ProcesoDraft>>({});
  const [newEtapa, setNewEtapa] = useState<EtapaDraft>(emptyEtapaDraft);
  const [newProcesoByEtapa, setNewProcesoByEtapa] = useState<Record<string, ProcesoDraft>>({});
  const [processViewMode, setProcessViewMode] = useState<"cards" | "table">("table");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmDeleteItem, setConfirmDeleteItem] = useState<Protocolo | null>(null);

  const buildPlantillaMap = (item: ProtocoloExpanded) => {
    const entries = (item.plantilla?.iteraciones ?? [])
      .map((iteracion) => [resolveProcesoIdFromIteracion(iteracion), iteracion] as const)
      .filter(([procesoId]) => Boolean(procesoId));
    return new Map<string, ProtocoloPlantillaIteracion>(entries);
  };

  const plantillaByProcesoId = useMemo(() => {
    if (!expanded) return new Map<string, ProtocoloPlantillaIteracion>();
    return buildPlantillaMap(expanded);
  }, [expanded?.plantilla?.iteraciones]);

  if (!access.isAdminSistema) {
    return <Navigate to="/dashboard" replace />;
  }

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await fetchProtocolos());
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const hydrateDrafts = (item: ProtocoloExpanded) => {
    const plantillaMap = buildPlantillaMap(item);
    const nextEtapas: Record<string, EtapaDraft> = {};
    const nextProcesos: Record<string, ProcesoDraft> = {};

    for (const etapa of item.protocolo_etapa ?? []) {
      const etapaId = resolveEtapaId(etapa);
      if (!etapaId) continue;
      nextEtapas[etapaId] = {
        nombre: etapa.nombre ?? "",
        orden: String(etapa.orden ?? ""),
      };

      for (const proceso of etapa.protocolo_proceso ?? []) {
        const procesoId = resolveProcesoId(proceso);
        if (!procesoId) continue;
        nextProcesos[procesoId] = {
          nombre: proceso.nombre ?? "",
          orden: String(proceso.orden ?? ""),
          evento_tipo: proceso.evento_tipo ?? "",
          campos_obligatorios: normalizeCamposObligatorios(
            proceso,
            getDefaultRequiredFields(proceso.evento_tipo ?? "", plantillaMap.get(procesoId)),
          ),
          plantilla_json: stringifyPlantilla(
            proceso.plantilla && Array.isArray(proceso.plantilla.campos)
              ? proceso.plantilla
              : buildDefaultPlantillaFromEvento(proceso.evento_tipo ?? ""),
          ),
        };
      }
    }

    setEtapaDraftById(nextEtapas);
    setProcesoDraftById(nextProcesos);
  };

  const loadProtocolExpanded = async (id: string) => {
    const item = await fetchProtocoloById(id);
    setExpanded(item);
    hydrateDrafts(item);
  };

  const onSubmit = async () => {
    if (!form.nombre.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    if (!editingId && !form.version.trim()) {
      setError("La versión es obligatoria.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      if (editingId) {
        await updateProtocolo(editingId, {
          nombre: form.nombre.trim(),
          version: form.version.trim() || undefined,
          descripcion: form.descripcion.trim() || null,
        });
        setSuccess("Protocolo actualizado.");
        await loadProtocolExpanded(editingId);
      } else {
        await createProtocolo({
          nombre: form.nombre.trim(),
          version: form.version.trim(),
          descripcion: form.descripcion.trim() || undefined,
        });
        setSuccess("Protocolo creado.");
        setForm(emptyForm);
        setFormMode("none");
        await load();
      }
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  const onEditById = async (id: string) => {
    if (!id) return;
    setLoadingEdit(true);
    setError(null);
    try {
      const item = await fetchProtocoloById(id);
      setEditingId(id);
      setFormMode("edit");
      setForm({
        nombre: item.nombre ?? "",
        version: item.version ?? "",
        descripcion: item.descripcion ?? "",
      });
      setExpanded(item);
      hydrateDrafts(item);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoadingEdit(false);
    }
  };

  const onCreateEtapa = async () => {
    if (!editingId) return;
    if (!newEtapa.nombre.trim()) {
      setError("El nombre de la etapa es obligatorio.");
      return;
    }
    const orden = Number(newEtapa.orden);
    if (Number.isNaN(orden)) {
      setError("El orden de la etapa debe ser numérico.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await createEtapa(editingId, { nombre: newEtapa.nombre.trim(), orden });
      setNewEtapa(emptyEtapaDraft);
      setSuccess("Etapa creada.");
      await loadProtocolExpanded(editingId);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  const onUpdateEtapa = async (etapaId: string) => {
    const draft = etapaDraftById[etapaId];
    if (!draft) return;
    if (!draft.nombre.trim()) {
      setError("El nombre de la etapa es obligatorio.");
      return;
    }
    const orden = Number(draft.orden);
    if (Number.isNaN(orden)) {
      setError("El orden de la etapa debe ser numérico.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await updateEtapa(etapaId, { nombre: draft.nombre.trim(), orden });
      setSuccess("Etapa actualizada.");
      if (editingId) await loadProtocolExpanded(editingId);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  const onDeleteEtapa = async (etapaId: string) => {
    if (!window.confirm("¿Eliminar esta etapa?")) return;

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await deleteEtapa(etapaId);
      setSuccess("Etapa eliminada.");
      if (editingId) await loadProtocolExpanded(editingId);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  const onCreateProceso = async (etapaId: string) => {
    if (!editingId) return;
    const draft = newProcesoByEtapa[etapaId] ?? emptyProcesoDraft;
    if (!draft.nombre.trim()) {
      setError("El nombre del proceso es obligatorio.");
      return;
    }
    if (!draft.evento_tipo.trim()) {
      setError("El tipo de evento del proceso es obligatorio.");
      return;
    }
    const orden = Number(draft.orden);
    if (Number.isNaN(orden)) {
      setError("El orden del proceso debe ser numérico.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const plantilla = parsePlantillaJson(draft.plantilla_json);
      const requiredFromPlantilla = (plantilla?.campos ?? [])
        .filter((field) => field.required)
        .map((field) => field.campo);
      await createProceso(etapaId, {
        nombre: draft.nombre.trim(),
        orden,
        evento_tipo: draft.evento_tipo.trim(),
        campos_obligatorios:
          requiredFromPlantilla.length > 0 ? requiredFromPlantilla : draft.campos_obligatorios,
        ...(plantilla ? { plantilla } : {}),
      });
      setNewProcesoByEtapa((prev) => ({ ...prev, [etapaId]: emptyProcesoDraft }));
      setSuccess("Proceso creado.");
      await loadProtocolExpanded(editingId);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  const onUpdateProceso = async (procesoId: string) => {
    const draft = procesoDraftById[procesoId];
    if (!draft) return;
    if (!draft.nombre.trim()) {
      setError("El nombre del proceso es obligatorio.");
      return;
    }
    if (!draft.evento_tipo.trim()) {
      setError("El tipo de evento del proceso es obligatorio.");
      return;
    }
    const orden = Number(draft.orden);
    if (Number.isNaN(orden)) {
      setError("El orden del proceso debe ser numérico.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const plantilla = parsePlantillaJson(draft.plantilla_json);
      const requiredFromPlantilla = (plantilla?.campos ?? [])
        .filter((field) => field.required)
        .map((field) => field.campo);
      await updateProceso(procesoId, {
        nombre: draft.nombre.trim(),
        orden,
        evento_tipo: draft.evento_tipo.trim(),
        campos_obligatorios:
          requiredFromPlantilla.length > 0 ? requiredFromPlantilla : draft.campos_obligatorios,
        ...(plantilla ? { plantilla } : {}),
      });
      setSuccess("Proceso actualizado.");
      if (editingId) await loadProtocolExpanded(editingId);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  const onDeleteProceso = async (procesoId: string) => {
    if (!window.confirm("¿Eliminar este proceso?")) return;

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await deleteProceso(procesoId);
      setSuccess("Proceso eliminado.");
      if (editingId) await loadProtocolExpanded(editingId);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  const onDeleteConfirm = async () => {
    if (!confirmDeleteItem) return;
    const id = resolveId(confirmDeleteItem);
    setConfirmDeleteItem(null);
    try {
      await deleteProtocolo(id);
      setSuccess("Protocolo eliminado.");
      await load();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    }
  };

  return (
    <div className="min-h-screen bg-secondary px-6 py-10">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        {formMode === "none" ? (
          <AppCard
            as="section"
            tone="default"
            padding="lg"
            header={(
              <SectionIntro
                title="Protocolos"
                description="Administrá la estructura base de protocolos, versiones y su configuración general."
                actions={(
                  <>
                <AppButton
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setEditingId(null);
                    setForm(emptyForm);
                    setFormMode("create");
                    setError(null);
                  }}
                >
                  Nuevo protocolo
                </AppButton>
                <AppButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => void load()}
                >
                  Actualizar listado
                </AppButton>
                  </>
                )}
              />
            )}
          >

            <div className="mt-3 space-y-2">
              {loading ? (
                <NoticeBanner>Cargando...</NoticeBanner>
              ) : items.length === 0 ? (
                <NoticeBanner>Sin protocolos.</NoticeBanner>
              ) : (
                items.map((item) => {
                  const id = resolveId(item);
                  return (
                    <AppCard key={id} as="article" tone="soft" padding="sm">
                      <div className="text-sm font-semibold text-[color:var(--text-ink)]">{item.nombre ?? "Sin nombre"}</div>
                      {item.version ? (
                        <div className="text-xs text-[color:var(--text-ink-muted)]">Versión: {item.version}</div>
                      ) : null}
                      {item.descripcion ? (
                        <div className="mt-1 text-xs text-[color:var(--text-ink-muted)]">{item.descripcion}</div>
                      ) : null}
                      <div className="mt-2 flex gap-2">
                        <AppButton
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => void onEditById(id)}
                        >
                          Editar
                        </AppButton>
                        <AppButton
                          type="button"
                          variant="danger"
                          size="sm"
                          onClick={() => setConfirmDeleteItem(item)}
                        >
                          Eliminar
                        </AppButton>
                      </div>
                    </AppCard>
                  );
                })
              )}
            </div>

            {error ? <NoticeBanner tone="danger" className="mt-3">{error}</NoticeBanner> : null}
            {success ? <NoticeBanner tone="success" className="mt-3">{success}</NoticeBanner> : null}
          </AppCard>
        ) : null}

        {formMode !== "none" ? (
          <AppCard
            as="section"
            tone="default"
            padding="lg"
            header={(
              <SectionIntro
                title={formMode === "edit" ? "Editar protocolo" : "Nuevo protocolo"}
                description="Definí nombre, versión y descripción del protocolo antes de trabajar etapas y procesos."
                actions={(
                  <AppButton
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setEditingId(null);
                      setForm(emptyForm);
                      setExpanded(null);
                      setFormMode("none");
                    }}
                  >
                    Cancelar edición
                  </AppButton>
                )}
              />
            )}
          >

            {loadingEdit ? (
              <NoticeBanner className="mt-3">
                Cargando datos del protocolo...
              </NoticeBanner>
            ) : null}

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <AppInput
                label="Nombre"
                value={form.nombre}
                onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
                placeholder="Nombre *"
                uiSize="lg"
              />
              <AppInput
                label="Versión"
                value={form.version}
                onChange={(e) => setForm((p) => ({ ...p, version: e.target.value }))}
                placeholder="Versión *"
                uiSize="lg"
              />
              <AppTextarea
                label="Descripción"
                value={form.descripcion}
                onChange={(e) => setForm((p) => ({ ...p, descripcion: e.target.value }))}
                placeholder="Descripción"
                rows={3}
                className="md:col-span-2"
                uiSize="lg"
              />
            </div>

            <div className="mt-3 flex gap-2">
              <AppButton
                type="button"
                variant="primary"
                loading={saving}
                onClick={() => void onSubmit()}
                disabled={saving}
              >
                {editingId ? "Guardar" : "Crear"}
              </AppButton>
              <AppButton
                type="button"
                variant="secondary"
                onClick={() => {
                  setEditingId(null);
                  setForm(emptyForm);
                  setExpanded(null);
                  setFormMode("none");
                }}
              >
                Cancelar
              </AppButton>
            </div>

            {error ? <NoticeBanner tone="danger" className="mt-3">{error}</NoticeBanner> : null}
            {success ? <NoticeBanner tone="success" className="mt-3">{success}</NoticeBanner> : null}

            {editingId ? (
              <div className="mt-6 rounded-[var(--radius-xl)] border border-[color:var(--border-default)] bg-[color:var(--surface-soft)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-[color:var(--text-ink)]">Etapas y procesos</h2>
                    <p className="mt-1 text-xs text-[color:var(--text-ink-muted)]">
                      Definí procesos, evento tipo y plantilla de campos obligatorios por tarea.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <AppButton
                      type="button"
                      variant={processViewMode === "cards" ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => setProcessViewMode("cards")}
                    >
                      Tarjetas
                    </AppButton>
                    <AppButton
                      type="button"
                      variant={processViewMode === "table" ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => setProcessViewMode("table")}
                    >
                      Tabla compacta
                    </AppButton>
                  </div>
                </div>

                <div className="mt-3 grid gap-2 md:grid-cols-[1fr_120px_auto]">
                  <AppInput
                    value={newEtapa.nombre}
                    onChange={(e) => setNewEtapa((prev) => ({ ...prev, nombre: e.target.value }))}
                    placeholder="Nueva etapa"
                  />
                  <AppInput
                    type="number"
                    value={newEtapa.orden}
                    onChange={(e) => setNewEtapa((prev) => ({ ...prev, orden: e.target.value }))}
                    placeholder="Orden"
                  />
                  <AppButton type="button" variant="secondary" size="sm" disabled={saving} onClick={() => void onCreateEtapa()}>
                    Agregar etapa
                  </AppButton>
                </div>

                <div className="mt-4 space-y-3">
                  {(expanded?.protocolo_etapa ?? [])
                    .slice()
                    .sort((a, b) => Number(a.orden ?? 999) - Number(b.orden ?? 999))
                    .map((etapa) => {
                      const etapaId = resolveEtapaId(etapa);
                      const etapaDraft = etapaDraftById[etapaId] ?? {
                        nombre: etapa.nombre ?? "",
                        orden: String(etapa.orden ?? ""),
                      };
                      const newProceso = newProcesoByEtapa[etapaId] ?? emptyProcesoDraft;
                      const procesos = (etapa.protocolo_proceso ?? [])
                        .slice()
                        .sort((a, b) => Number(a.orden ?? 999) - Number(b.orden ?? 999));

                      return (
                        <div key={etapaId} className="rounded-[var(--radius-lg)] border border-[color:var(--border-default)] bg-white p-3">
                          <div className="grid gap-2 md:grid-cols-[1fr_120px_auto_auto]">
                            <AppInput
                              value={etapaDraft.nombre}
                              onChange={(e) =>
                                setEtapaDraftById((prev) => ({
                                  ...prev,
                                  [etapaId]: { ...etapaDraft, nombre: e.target.value },
                                }))
                              }
                              placeholder="Nombre etapa"
                            />
                            <AppInput
                              type="number"
                              value={etapaDraft.orden}
                              onChange={(e) =>
                                setEtapaDraftById((prev) => ({
                                  ...prev,
                                  [etapaId]: { ...etapaDraft, orden: e.target.value },
                                }))
                              }
                              placeholder="Orden"
                            />
                            <AppButton type="button" variant="secondary" size="sm" disabled={saving} onClick={() => void onUpdateEtapa(etapaId)}>
                              Guardar etapa
                            </AppButton>
                            <AppButton type="button" variant="danger" size="sm" disabled={saving} onClick={() => void onDeleteEtapa(etapaId)}>
                              Eliminar etapa
                            </AppButton>
                          </div>

                          <div className="mt-3 space-y-2">
                            <h3 className="text-xs font-semibold text-[color:var(--text-accent)]">Procesos</h3>

                            <div className="grid gap-2 rounded-[var(--radius-md)] border border-[color:var(--border-default)] bg-[color:var(--surface-soft)] p-2 md:grid-cols-[1fr_90px_1fr_auto]">
                              <AppInput
                                value={newProceso.nombre}
                                onChange={(e) =>
                                  setNewProcesoByEtapa((prev) => ({
                                    ...prev,
                                    [etapaId]: { ...newProceso, nombre: e.target.value },
                                  }))
                                }
                                placeholder="Nuevo proceso"
                              />
                              <AppInput
                                type="number"
                                value={newProceso.orden}
                                onChange={(e) =>
                                  setNewProcesoByEtapa((prev) => ({
                                    ...prev,
                                    [etapaId]: { ...newProceso, orden: e.target.value },
                                  }))
                                }
                                placeholder="Orden"
                              />
                              <AppSelect
                                value={newProceso.evento_tipo}
                                onChange={(e) =>
                                  setNewProcesoByEtapa((prev) => ({
                                    ...prev,
                                    [etapaId]: {
                                      ...newProceso,
                                      evento_tipo: e.target.value,
                                      campos_obligatorios:
                                        newProceso.campos_obligatorios.length > 0
                                          ? newProceso.campos_obligatorios.filter((name) =>
                                              getFieldOptions(e.target.value).some((field) => field.name === name),
                                            )
                                          : getDefaultRequiredFields(e.target.value),
                                      plantilla_json:
                                        newProceso.plantilla_json.trim().length > 0
                                          ? newProceso.plantilla_json
                                        : stringifyPlantilla(buildDefaultPlantillaFromEvento(e.target.value)),
                                    },
                                  }))
                                }
                              >
                                <option value="">Tipo de evento</option>
                                {Object.keys(EVENTO_CONFIG).map((tipo) => (
                                  <option key={`new-${etapaId}-${tipo}`} value={tipo}>
                                    {tipo}
                                  </option>
                                ))}
                              </AppSelect>
                              <AppButton type="button" variant="secondary" size="sm" disabled={saving} onClick={() => void onCreateProceso(etapaId)}>
                                Agregar
                              </AppButton>
                            </div>
                            {newProceso.evento_tipo ? (
                              <div className="rounded-[var(--radius-md)] border border-[color:var(--border-default)] bg-white p-2">
                                <div className="mb-1 text-xs font-semibold text-[color:var(--text-accent)]">
                                  Plantilla de campos obligatorios para este proceso
                                </div>
                                <div className="grid gap-1 md:grid-cols-2">
                                  {getFieldOptions(newProceso.evento_tipo).map((field) => {
                                    const checked = newProceso.campos_obligatorios.includes(field.name);
                                    return (
                                      <label
                                        key={`new-field-${etapaId}-${field.name}`}
                                        className="flex items-center gap-2 text-xs text-[color:var(--text-ink)]"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={checked}
                                          onChange={(e) =>
                                            setNewProcesoByEtapa((prev) => {
                                              const current = prev[etapaId] ?? emptyProcesoDraft;
                                              const nextFields = e.target.checked
                                                ? Array.from(new Set([...current.campos_obligatorios, field.name]))
                                                : current.campos_obligatorios.filter((name) => name !== field.name);
                                              return {
                                                ...prev,
                                                [etapaId]: { ...current, campos_obligatorios: nextFields },
                                              };
                                            })
                                          }
                                        />
                                        {field.label}
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                            ) : null}
                            <div className="rounded-[var(--radius-md)] border border-[color:var(--border-default)] bg-white p-2">
                              <div className="mb-1 text-xs font-semibold text-[color:var(--text-accent)]">
                                Plantilla JSON del proceso (campo, type, required, unit, enum)
                              </div>
                              <AppTextarea
                                value={newProceso.plantilla_json}
                                onChange={(e) =>
                                  setNewProcesoByEtapa((prev) => ({
                                    ...prev,
                                    [etapaId]: { ...newProceso, plantilla_json: e.target.value },
                                  }))
                                }
                                placeholder={stringifyPlantilla(buildDefaultPlantillaFromEvento(newProceso.evento_tipo || "riego"))}
                                textareaClassName="font-mono text-xs"
                              />
                            </div>

                            {processViewMode === "table" ? (
                              <div className="overflow-x-auto rounded-[var(--radius-md)] border border-[color:var(--border-default)]">
                                <table className="min-w-full text-xs">
                                  <thead className="bg-[color:var(--surface-soft)] text-[color:var(--text-accent)]">
                                    <tr>
                                      <th className="px-2 py-2 text-left">Proceso</th>
                                      <th className="px-2 py-2 text-left">Orden</th>
                                      <th className="px-2 py-2 text-left">Evento</th>
                                      <th className="px-2 py-2 text-left">Campos obligatorios</th>
                                      <th className="px-2 py-2 text-left">Acciones</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {procesos.map((proceso) => {
                                      const procesoId = resolveProcesoId(proceso);
                                      const draft = procesoDraftById[procesoId] ?? {
                                        nombre: proceso.nombre ?? "",
                                        orden: String(proceso.orden ?? ""),
                                        evento_tipo: proceso.evento_tipo ?? "",
                                        campos_obligatorios: normalizeCamposObligatorios(proceso),
                                        plantilla_json: stringifyPlantilla(
                                          proceso.plantilla && Array.isArray(proceso.plantilla.campos)
                                            ? proceso.plantilla
                                            : buildDefaultPlantillaFromEvento(proceso.evento_tipo ?? ""),
                                        ),
                                      };
                                      const plantillaIteracion = plantillaByProcesoId.get(procesoId);
                                      const requiredFields = draft.campos_obligatorios
                                        .map(
                                          (name) =>
                                            getFieldOptions(draft.evento_tipo, plantillaIteracion).find(
                                              (field) => field.name === name,
                                            )?.label ?? name,
                                        )
                                        .join(", ");

                                      return [
                                        <tr key={`${procesoId}-row`} className="border-t border-[color:var(--border-default)]">
                                          <td className="px-2 py-2">
                                            <AppInput
                                              value={draft.nombre}
                                              onChange={(e) =>
                                                setProcesoDraftById((prev) => ({
                                                  ...prev,
                                                  [procesoId]: { ...draft, nombre: e.target.value },
                                                }))
                                              }
                                              className="w-full"
                                              uiSize="sm"
                                            />
                                          </td>
                                          <td className="px-2 py-2">
                                            <AppInput
                                              type="number"
                                              value={draft.orden}
                                              onChange={(e) =>
                                                setProcesoDraftById((prev) => ({
                                                  ...prev,
                                                  [procesoId]: { ...draft, orden: e.target.value },
                                                }))
                                              }
                                              className="w-20"
                                              uiSize="sm"
                                            />
                                          </td>
                                          <td className="px-2 py-2">
                                            <AppSelect
                                              value={draft.evento_tipo}
                                              onChange={(e) =>
                                                setProcesoDraftById((prev) => {
                                                  const nextEvento = e.target.value;
                                                  const plantillaIter = plantillaByProcesoId.get(procesoId);
                                                  const validFieldNames = new Set(
                                                    getFieldOptions(nextEvento, plantillaIter).map((field) => field.name),
                                                  );
                                                  const filtered = draft.campos_obligatorios.filter((name) => validFieldNames.has(name));
                                                  return {
                                                    ...prev,
                                                    [procesoId]: {
                                                      ...draft,
                                                      evento_tipo: nextEvento,
                                                      campos_obligatorios:
                                                        filtered.length > 0
                                                          ? filtered
                                                          : getDefaultRequiredFields(nextEvento, plantillaIter),
                                                      plantilla_json:
                                                        draft.plantilla_json.trim().length > 0
                                                          ? draft.plantilla_json
                                                          : stringifyPlantilla(buildDefaultPlantillaFromEvento(nextEvento)),
                                                    },
                                                  };
                                                })
                                              }
                                              uiSize="sm"
                                            >
                                              <option value="">Tipo de evento</option>
                                              {Object.keys(EVENTO_CONFIG).map((tipo) => (
                                                <option key={`${procesoId}-${tipo}`} value={tipo}>
                                                  {tipo}
                                                </option>
                                              ))}
                                            </AppSelect>
                                          </td>
                                          <td className="px-2 py-2 text-[color:var(--text-ink-muted)]">
                                            {requiredFields || "sin campos requeridos"}
                                          </td>
                                          <td className="px-2 py-2">
                                            <div className="flex gap-1">
                                              <AppButton type="button" variant="secondary" size="sm" disabled={saving} onClick={() => void onUpdateProceso(procesoId)}>
                                                Guardar
                                              </AppButton>
                                              <AppButton type="button" variant="danger" size="sm" disabled={saving} onClick={() => void onDeleteProceso(procesoId)}>
                                                Eliminar
                                              </AppButton>
                                            </div>
                                          </td>
                                        </tr>,
                                        <tr key={`${procesoId}-json`} className="border-t border-[color:var(--border-subtle)] bg-white">
                                          <td colSpan={5} className="px-2 py-2">
                                            <div className="mb-1 text-[11px] font-semibold text-[color:var(--text-accent)]">
                                              Plantilla JSON (campos + formatos)
                                            </div>
                                            <AppTextarea
                                              value={draft.plantilla_json}
                                              onChange={(e) =>
                                                setProcesoDraftById((prev) => ({
                                                  ...prev,
                                                  [procesoId]: { ...draft, plantilla_json: e.target.value },
                                                }))
                                              }
                                              textareaClassName="font-mono text-[11px]"
                                              uiSize="sm"
                                            />
                                          </td>
                                        </tr>,
                                      ];
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {procesos.map((proceso) => {
                                  const procesoId = resolveProcesoId(proceso);
                                  const draft = procesoDraftById[procesoId] ?? {
                                    nombre: proceso.nombre ?? "",
                                    orden: String(proceso.orden ?? ""),
                                    evento_tipo: proceso.evento_tipo ?? "",
                                    campos_obligatorios: normalizeCamposObligatorios(proceso),
                                    plantilla_json: stringifyPlantilla(
                                      proceso.plantilla && Array.isArray(proceso.plantilla.campos)
                                        ? proceso.plantilla
                                        : buildDefaultPlantillaFromEvento(proceso.evento_tipo ?? ""),
                                    ),
                                  };
                                  const plantillaIteracion = plantillaByProcesoId.get(procesoId);
                                  const requiredFields = draft.campos_obligatorios.map(
                                    (name) =>
                                      getFieldOptions(draft.evento_tipo, plantillaIteracion).find(
                                        (field) => field.name === name,
                                      )?.label ?? name,
                                  );

                                  return (
                                    <div key={procesoId} className="rounded-[var(--radius-md)] border border-[color:var(--border-default)] bg-white p-2">
                                      <div className="grid gap-2 md:grid-cols-[1fr_90px_1fr_auto_auto]">
                                        <AppInput
                                          value={draft.nombre}
                                          onChange={(e) =>
                                            setProcesoDraftById((prev) => ({
                                              ...prev,
                                              [procesoId]: { ...draft, nombre: e.target.value },
                                            }))
                                          }
                                          uiSize="sm"
                                        />
                                        <AppInput
                                          type="number"
                                          value={draft.orden}
                                          onChange={(e) =>
                                            setProcesoDraftById((prev) => ({
                                              ...prev,
                                              [procesoId]: { ...draft, orden: e.target.value },
                                            }))
                                          }
                                          uiSize="sm"
                                        />
                                        <AppSelect
                                          value={draft.evento_tipo}
                                          onChange={(e) =>
                                            setProcesoDraftById((prev) => {
                                              const nextEvento = e.target.value;
                                              const plantillaIter = plantillaByProcesoId.get(procesoId);
                                              const validFieldNames = new Set(
                                                getFieldOptions(nextEvento, plantillaIter).map((field) => field.name),
                                              );
                                              const filtered = draft.campos_obligatorios.filter((name) => validFieldNames.has(name));
                                              return {
                                                ...prev,
                                                [procesoId]: {
                                                  ...draft,
                                                  evento_tipo: nextEvento,
                                                  campos_obligatorios:
                                                    filtered.length > 0
                                                      ? filtered
                                                      : getDefaultRequiredFields(nextEvento, plantillaIter),
                                                  plantilla_json:
                                                    draft.plantilla_json.trim().length > 0
                                                      ? draft.plantilla_json
                                                      : stringifyPlantilla(buildDefaultPlantillaFromEvento(nextEvento)),
                                                },
                                              };
                                            })
                                          }
                                          uiSize="sm"
                                        >
                                          <option value="">Tipo de evento</option>
                                          {Object.keys(EVENTO_CONFIG).map((tipo) => (
                                            <option key={`${procesoId}-card-${tipo}`} value={tipo}>
                                              {tipo}
                                            </option>
                                          ))}
                                        </AppSelect>
                                        <AppButton type="button" variant="secondary" size="sm" disabled={saving} onClick={() => void onUpdateProceso(procesoId)}>
                                          Guardar
                                        </AppButton>
                                        <AppButton type="button" variant="danger" size="sm" disabled={saving} onClick={() => void onDeleteProceso(procesoId)}>
                                          Eliminar
                                        </AppButton>
                                      </div>
                                      <div className="mt-2 rounded-[var(--radius-md)] border border-[color:var(--border-default)] bg-[color:var(--surface-soft)] p-2">
                                        <div className="mb-1 text-xs font-semibold text-[color:var(--text-accent)]">
                                          Plantilla JSON (campos + formatos)
                                        </div>
                                        <AppTextarea
                                          value={draft.plantilla_json}
                                          onChange={(e) =>
                                            setProcesoDraftById((prev) => ({
                                              ...prev,
                                              [procesoId]: { ...draft, plantilla_json: e.target.value },
                                            }))
                                          }
                                          textareaClassName="font-mono text-[11px]"
                                          uiSize="sm"
                                        />
                                      </div>
                                      {draft.evento_tipo ? (
                                        <div className="mt-2 grid gap-1 md:grid-cols-2">
                                          {getFieldOptions(draft.evento_tipo, plantillaIteracion).map((field) => (
                                            <label
                                              key={`${procesoId}-field-${field.name}`}
                                              className="flex items-center gap-2 text-xs text-[color:var(--text-ink)]"
                                            >
                                              <input
                                                type="checkbox"
                                                checked={draft.campos_obligatorios.includes(field.name)}
                                                onChange={(e) =>
                                                  setProcesoDraftById((prev) => {
                                                    const current = prev[procesoId] ?? draft;
                                                    const nextFields = e.target.checked
                                                      ? Array.from(new Set([...current.campos_obligatorios, field.name]))
                                                      : current.campos_obligatorios.filter((name) => name !== field.name);
                                                    return {
                                                      ...prev,
                                                      [procesoId]: { ...current, campos_obligatorios: nextFields },
                                                    };
                                                  })
                                                }
                                              />
                                              {field.label}
                                            </label>
                                          ))}
                                        </div>
                                      ) : null}
                                      <div className="mt-2 text-xs text-[color:var(--text-ink-muted)]">
                                        Campos obligatorios de plantilla: {requiredFields.length > 0 ? requiredFields.join(", ") : "sin campos requeridos"}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            ) : null}
          </AppCard>
        ) : null}
      </div>

      {confirmDeleteItem ? (
        <AppModal
          opened
          onClose={() => setConfirmDeleteItem(null)}
          title="¿Eliminar protocolo?"
          size="sm"
          footer={(
            <div className="flex justify-end gap-2">
              <AppButton
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setConfirmDeleteItem(null)}
              >
                Cancelar
              </AppButton>
              <AppButton
                type="button"
                variant="danger"
                size="sm"
                onClick={() => void onDeleteConfirm()}
              >
                Eliminar
              </AppButton>
            </div>
          )}
        >
          <p className="text-xs text-[color:var(--text-ink-muted)]">
            {confirmDeleteItem.nombre ?? "Este protocolo"} - esta acción no se puede deshacer.
          </p>
        </AppModal>
      ) : null}
    </div>
  );
}
