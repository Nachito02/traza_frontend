import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  fetchTareasByBodega,
  fetchPendientesByScope,
  fetchTareaAsignacionDetail,
  createTareaEntrada,
  finalizarTareaAsignacion,
  uploadEntradaAdjunto,
  patchTareaEntrada,
  type AdjuntoRecord,
  type Tarea,
  type TareaEntradaDetail,
} from "../../features/encargos/api";
import { getApiErrorMessage } from "../../lib/api";
import { useFincasStore } from "../../features/fincas/store";
import { useAuthStore } from "../../store/authStore";
import {
  AppButton,
  AppCard,
  AppInput,
  AppModal,
  AppSelect,
  MetricCard,
  NoticeBanner,
  SectionIntro,
  useAppNotifications,
} from "../../components/ui";
import { EVENTO_CONFIG, type EventoConfig } from "../Trazabilidad/eventoConfig";
import { Link } from "react-router-dom";
import CostosActividadPanel from "../Costos/CostosActividadPanel";
import EventoFields from "../Tareas/components/EventoFields";

// ─── helpers ────────────────────────────────────────────────────────────────

function fileIcon(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "🖼️";
  if (mimeType.startsWith("video/")) return "🎬";
  if (mimeType === "application/pdf") return "📄";
  if (mimeType.includes("word") || mimeType.includes("document")) return "📝";
  if (mimeType.includes("excel") || mimeType.includes("spreadsheet") || mimeType === "text/csv") return "📊";
  if (mimeType.includes("powerpoint") || mimeType.includes("presentation")) return "📋";
  return "📎";
}

function normalizeStr(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function getEventoConfigForTask(tarea: Tarea): EventoConfig | null {
  // 1. Match directo por evento_tipo (plano o anidado en protocolo_proceso)
  const eventoTipo = tarea.evento_tipo ?? tarea.protocolo_proceso?.evento_tipo;
  if (eventoTipo && EVENTO_CONFIG[eventoTipo]) {
    return EVENTO_CONFIG[eventoTipo];
  }
  // 2. Fallback: match fuzzy por título
  const titleNorm = normalizeStr(tarea.titulo ?? "");
  for (const [key, config] of Object.entries(EVENTO_CONFIG)) {
    const keyNorm = normalizeStr(key);
    const labelNorm = normalizeStr(config.label);
    if (
      titleNorm === keyNorm ||
      titleNorm.includes(keyNorm) ||
      keyNorm.includes(titleNorm) ||
      titleNorm === labelNorm ||
      labelNorm.includes(titleNorm)
    ) {
      return config;
    }
  }
  return null;
}

function normalizeEstado(estado: string | undefined) {
  return String(estado ?? "").toLowerCase().trim();
}

function fechaLabel(tarea: Tarea): { text: string; overdue: boolean } | null {
  const estado = normalizeEstado(tarea.estado);
  if (estado === "completado") {
    const completedAt =
      tarea.tarea_asignacion
        ?.map((a) => a.completed_at)
        .filter(Boolean)
        .sort()
        .reverse()[0] ?? tarea.updated_at;
    if (!completedAt) return null;
    return {
      text: `Completada el ${new Date(completedAt).toLocaleDateString("es-AR")}`,
      overdue: false,
    };
  }
  if (!tarea.fecha_fin) return null;
  const fin = new Date(tarea.fecha_fin);
  const overdue = fin < new Date();
  return {
    text: overdue
      ? `Venció el ${fin.toLocaleDateString("es-AR")}`
      : `Vence el ${fin.toLocaleDateString("es-AR")}`,
    overdue,
  };
}

function estadoBadge(estado: string | undefined) {
  switch (normalizeEstado(estado)) {
    case "completado":
      return (
        <span className="rounded-full border border-[color:var(--feedback-success-border)] bg-[color:var(--feedback-success-bg)] px-2 py-0.5 text-xs font-semibold text-[color:var(--feedback-success-text)]">
          Completado
        </span>
      );
    case "en_progreso":
      return (
        <span className="rounded-full border border-[color:var(--feedback-warning-border)] bg-[color:var(--feedback-warning-bg)] px-2 py-0.5 text-xs font-semibold text-[color:var(--feedback-warning-text)]">
          En progreso
        </span>
      );
    case "cancelado":
      return (
        <span className="rounded-full border border-[color:var(--feedback-danger-border)] bg-[color:var(--feedback-danger-bg)] px-2 py-0.5 text-xs font-semibold text-[color:var(--feedback-danger-text)]">
          Cancelado
        </span>
      );
    default:
      return (
        <span className="rounded-full border border-[color:var(--feedback-warning-border)] bg-[color:var(--feedback-warning-bg)] px-2 py-0.5 text-xs font-semibold text-[color:var(--feedback-warning-text)]">
          Pendiente
        </span>
      );
  }
}

function formatKey(key: string) {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function EntradaDescripcion({ descripcion }: { descripcion: string }) {
  let parsed: Record<string, unknown> | null = null;
  try {
    const obj = JSON.parse(descripcion);
    if (obj && typeof obj === "object" && !Array.isArray(obj)) {
      parsed = obj as Record<string, unknown>;
    }
  } catch {
    /* texto plano */
  }

  if (!parsed) {
    return <p className="mt-1 text-sm text-[color:var(--text-ink)]">{descripcion}</p>;
  }

  return (
    <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2">
      {Object.entries(parsed).map(([key, val]) => (
        <div key={key}>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--text-ink-muted)]">
            {formatKey(key)}
          </p>
          <p className="mt-0.5 text-sm font-medium text-[color:var(--text-ink)]">
            {val === null || val === undefined
              ? "—"
              : typeof val === "boolean"
                ? val ? "Sí" : "No"
                : String(val)}
          </p>
        </div>
      ))}
    </div>
  );
}

// ─── EntradaItem con edición completa ────────────────────────────────────────

function parseDraft(rawDesc: string): Record<string, string> {
  try {
    const parsed = JSON.parse(rawDesc) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return Object.fromEntries(
        Object.entries(parsed as Record<string, unknown>).map(([k, v]) => [k, v == null ? "" : String(v)]),
      );
    }
  } catch { /* texto plano */ }
  return {};
}

function EntradaItem({
  entrada,
  index,
  eventoConfig,
  onUpdated,
}: {
  entrada: TareaEntradaDetail;
  index: number;
  eventoConfig: EventoConfig | null;
  onUpdated: (updated: TareaEntradaDetail) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editDraft, setEditDraft] = useState<Record<string, string>>({});
  const [editFecha, setEditFecha] = useState("");
  const [saving, setSaving] = useState(false);

  const rawDesc = entrada.notas ?? entrada.descripcion ?? "";
  const draft = parseDraft(rawDesc);
  const parsedFields = Object.entries(draft).filter(([, v]) => v !== "").map(([k, v]) => {
    const label = eventoConfig?.fields.find((f) => f.name === k)?.label ?? k.replace(/_/g, " ");
    return [label, v] as [string, string];
  });

  const openEdit = () => {
    const d = new Date(entrada.fecha);
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setEditFecha(local);
    setEditDraft({ ...draft });
    setEditing(true);
  };

  const handleSave = async () => {
    if (!entrada.entradaId) return;
    setSaving(true);
    try {
      const newDesc = Object.keys(editDraft).length > 0 ? JSON.stringify(editDraft) : rawDesc;
      const updated = await patchTareaEntrada(entrada.entradaId, {
        fecha: new Date(editFecha).toISOString(),
        descripcion: newDesc,
      });
      onUpdated(updated);
      setEditing(false);
    } catch {
      // el usuario puede reintentar
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded border border-[color:var(--border-shell)] bg-[color:var(--surface-soft)] px-3 py-2">
      {/* Cabecera */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-[color:var(--text-ink-muted)]">
          #{index + 1} · {new Date(entrada.fecha).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
          {entrada.creadoPor?.nombre ? ` · ${entrada.creadoPor.nombre}` : ""}
        </p>
        {!editing && (
          <button
            type="button"
            onClick={openEdit}
            className="shrink-0 text-[11px] text-[color:var(--text-ink-muted)] underline hover:text-[color:var(--text-ink)]"
          >
            Editar
          </button>
        )}
      </div>

      {/* Modo lectura */}
      {!editing && (
        <>
          {parsedFields.length > 0 ? (
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
              {parsedFields.map(([label, value]) => (
                <div key={label}>
                  <span className="text-sm capitalize text-[color:var(--text-ink-muted)]">{label}: </span>
                  <span className="text-sm font-medium text-[color:var(--text-ink)]">{value}</span>
                </div>
              ))}
            </div>
          ) : rawDesc ? (
            <EntradaDescripcion descripcion={rawDesc} />
          ) : null}
        </>
      )}

      {/* Modo edición */}
      {editing && (
        <div className="mt-3 space-y-3">
          {/* Fecha */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-[color:var(--text-ink-muted)]">Fecha</label>
            <input
              type="datetime-local"
              value={editFecha}
              onChange={(e) => setEditFecha(e.target.value)}
              className="w-full rounded border border-[color:var(--border-default)] bg-[color:var(--surface-base)] px-2 py-1.5 text-sm text-[color:var(--text-ink)] focus:outline-none"
            />
          </div>

          {/* Campos del evento */}
          {eventoConfig ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {eventoConfig.fields
                .filter((f) => f.type !== "user_select" && f.type !== "date")
                .filter((f) => !f.showWhen || editDraft[f.showWhen.field] === f.showWhen.value)
                .map((field) => {
                  const value = editDraft[field.name] ?? field.defaultValue ?? "";
                  if (field.type === "textarea") {
                    return (
                      <div key={field.name} className="sm:col-span-2">
                        <label className="mb-1 block text-xs font-semibold text-[color:var(--text-ink-muted)]">{field.label}</label>
                        <textarea
                          value={value}
                          onChange={(e) => setEditDraft((prev) => ({ ...prev, [field.name]: e.target.value }))}
                          placeholder={field.placeholder}
                          rows={3}
                          className="w-full rounded border border-[color:var(--border-default)] bg-[color:var(--surface-base)] px-2 py-1.5 text-sm text-[color:var(--text-ink)] focus:outline-none"
                        />
                      </div>
                    );
                  }
                  if (field.type === "select" && field.options) {
                    return (
                      <div key={field.name}>
                        <label className="mb-1 block text-xs font-semibold text-[color:var(--text-ink-muted)]">{field.label}</label>
                        <select
                          value={value}
                          onChange={(e) => setEditDraft((prev) => ({ ...prev, [field.name]: e.target.value }))}
                          className="w-full rounded border border-[color:var(--border-default)] bg-[color:var(--surface-base)] px-2 py-1.5 text-sm text-[color:var(--text-ink)] focus:outline-none"
                        >
                          <option value="">Seleccionar...</option>
                          {field.options.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                    );
                  }
                  return (
                    <div key={field.name}>
                      <label className="mb-1 block text-xs font-semibold text-[color:var(--text-ink-muted)]">{field.label}</label>
                      <input
                        type={field.type === "number" ? "number" : "text"}
                        value={value}
                        step={field.step}
                        placeholder={field.placeholder}
                        onChange={(e) => setEditDraft((prev) => ({ ...prev, [field.name]: e.target.value }))}
                        className="w-full rounded border border-[color:var(--border-default)] bg-[color:var(--surface-base)] px-2 py-1.5 text-sm text-[color:var(--text-ink)] focus:outline-none"
                      />
                    </div>
                  );
                })}
            </div>
          ) : (
            <div>
              <label className="mb-1 block text-xs font-semibold text-[color:var(--text-ink-muted)]">Notas</label>
              <textarea
                value={editDraft["_notas"] ?? rawDesc}
                onChange={(e) => setEditDraft({ _notas: e.target.value })}
                rows={3}
                className="w-full rounded border border-[color:var(--border-default)] bg-[color:var(--surface-base)] px-2 py-1.5 text-sm text-[color:var(--text-ink)] focus:outline-none"
              />
            </div>
          )}

          {/* Acciones */}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSave()}
              className="rounded bg-[color:var(--feedback-success-bg)] px-3 py-1.5 text-xs font-semibold text-[color:var(--feedback-success-text)] disabled:opacity-50"
            >
              {saving ? "Guardando…" : "Guardar cambios"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="text-xs text-[color:var(--text-ink-muted)] underline"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Adjuntos */}
      {!editing && Array.isArray(entrada.adjuntos) && entrada.adjuntos.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {(entrada.adjuntos as AdjuntoRecord[]).map((adj) =>
            adj.tipo.startsWith("image/") ? (
              <a key={adj.cid} href={adj.url} target="_blank" rel="noopener noreferrer"
                className="block h-16 w-16 shrink-0 overflow-hidden rounded-[var(--radius-md)] border border-[color:var(--border-shell)] transition hover:border-[color:var(--accent-primary)]">
                <img src={adj.url} alt={adj.nombre} className="h-full w-full object-cover" />
              </a>
            ) : (
              <a key={adj.cid} href={adj.url} target="_blank" rel="noopener noreferrer"
                className="flex h-16 w-16 shrink-0 flex-col items-center justify-center gap-0.5 overflow-hidden rounded-[var(--radius-md)] border border-[color:var(--border-shell)] bg-[color:var(--surface-soft)] px-1 text-center transition hover:border-[color:var(--accent-primary)]">
                <span className="text-xl leading-none">{fileIcon(adj.tipo)}</span>
                <span className="line-clamp-2 text-[9px] font-medium text-[color:var(--text-ink-muted)]">{adj.nombre}</span>
              </a>
            )
          )}
        </div>
      )}
    </div>
  );
}

// ─── Modal de detalle ────────────────────────────────────────────────────────

function TareaDetalleModal({
  tarea,
  opened,
  onClose,
  onCompleted,
}: {
  tarea: Tarea;
  opened: boolean;
  onClose: () => void;
  onCompleted?: () => void;
}) {
  const { notifySuccess, notifyError } = useAppNotifications();
  const modalBodegaId = useAuthStore((state) => state.activeBodegaId);
  const [entradas, setEntradas] = useState<TareaEntradaDetail[] | null>(null);
  const [loadingEntradas, setLoadingEntradas] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  // Unified pending attachments — images get an objectURL preview, other files don't
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

  const asignacionId = tarea.tarea_asignacion?.[0]?.tarea_asignacion_id ?? null;
  const isCompleted = normalizeEstado(tarea.estado) === "completado";
  const eventoConfig = getEventoConfigForTask(tarea);

  const loadEntradas = () => {
    if ((tarea.tarea_asignacion?.length ?? 0) === 0) {
      setEntradas([]);
      return;
    }
    setLoadingEntradas(true);
    Promise.all(
      (tarea.tarea_asignacion ?? []).map((a) =>
        fetchTareaAsignacionDetail(a.tarea_asignacion_id),
      ),
    )
      .then((results) => setEntradas(results.flat()))
      .finally(() => setLoadingEntradas(false));
  };

  useEffect(() => {
    if (opened && entradas === null) loadEntradas();
    if (!opened) {
      setDraft({});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened]);


  const setDraftField = (field: string, value: string) =>
    setDraft((prev) => ({ ...prev, [field]: value }));

  const hasDraftValues = eventoConfig
    ? Object.values(draft).some((v) => v.trim() !== "")
    : (draft["_notas"] ?? "").trim() !== "";

  const handleRegister = async () => {
    if (!asignacionId || !hasDraftValues) return;

    let descripcion: string;
    let notas: string;
    if (eventoConfig) {
      const filtered = Object.fromEntries(
        Object.entries(draft).filter(([, v]) => v.trim() !== ""),
      );
      descripcion = JSON.stringify(filtered);
      notas = Object.entries(filtered)
        .map(([k, v]) => {
          const label = eventoConfig.fields.find((f) => f.name === k)?.label ?? k;
          return `${label}: ${v}`;
        })
        .join(", ");
    } else {
      const text = draft["_notas"] ?? "";
      descripcion = text;
      notas = text;
    }

    setSaving(true);
    try {
      const entry = await createTareaEntrada(asignacionId, { notas, descripcion }) as { entradaId?: string };
      setDraft({});

      // Upload pending files to the newly created entry
      if (pendingFiles.length > 0 && entry?.entradaId) {
        setUploadingFiles(true);
        try {
          await Promise.all(
            pendingFiles.map(({ file }) => uploadEntradaAdjunto(entry.entradaId!, file)),
          );
          setPendingFiles((prev) => {
            prev.forEach((p) => { if (p.previewUrl) URL.revokeObjectURL(p.previewUrl); });
            return [];
          });
        } catch {
          notifyError({ title: "Archivos no subidos", message: "El registro se guardó pero no se pudieron subir los archivos. Verificá la configuración del servidor IPFS." });
        } finally {
          setUploadingFiles(false);
        }
      }

      notifySuccess({ title: "Registro guardado", message: "La entrada fue registrada correctamente." });
      loadEntradas();
    } catch (e) {
      notifyError({ title: "Error al registrar", message: getApiErrorMessage(e) });
    } finally {
      setSaving(false);
    }
  };

  const handleFinalize = async () => {
    if (!asignacionId || (entradas ?? []).length === 0) return;
    setFinalizing(true);
    try {
      await finalizarTareaAsignacion(asignacionId);
      notifySuccess({ title: "Tarea completada", message: "La tarea fue marcada como completada." });
      onClose();
      onCompleted?.();
    } catch (e) {
      notifyError({ title: "Error al finalizar", message: getApiErrorMessage(e) });
    } finally {
      setFinalizing(false);
    }
  };

  const fecha = fechaLabel(tarea);

  return (
    <AppModal
      opened={opened}
      onClose={onClose}
      size="lg"
      showHeaderDivider
      title={
        <div className="flex w-full items-center justify-between">
          <span className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="truncate">{tarea.titulo}</span>
            {estadoBadge(tarea.estado)}
          </span>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
            className="ml-3 shrink-0 rounded-[var(--radius-md)] p-1.5 text-[color:var(--text-ink-muted)] transition-colors hover:bg-[color:var(--surface-soft)] hover:text-[color:var(--text-ink)]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      }
      description={
        <span className="flex flex-wrap gap-3 text-sm text-[color:var(--text-ink-muted)]">
          {tarea.cuartel?.codigo_cuartel && (
            <span>Cuartel: <strong className="text-[color:var(--text-ink)]">{tarea.cuartel.codigo_cuartel}</strong></span>
          )}
          {fecha && (
            <span className={fecha.overdue ? "font-semibold text-red-400" : ""}>
              {fecha.text}
            </span>
          )}
        </span>
      }
      footer={
        asignacionId && !isCompleted ? (
          <div className="flex flex-wrap items-center gap-2">
            <AppButton
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => void handleRegister()}
              disabled={saving || !hasDraftValues}
              loading={saving}
            >
              {saving ? "Guardando…" : "Registrar avance"}
            </AppButton>
            <AppButton
              type="button"
              variant="primary"
              size="sm"
              onClick={() => void handleFinalize()}
              disabled={finalizing || (entradas ?? []).length === 0}
              loading={finalizing}
              title={(entradas ?? []).length === 0 ? "Registrá al menos un avance antes de finalizar" : undefined}
            >
              {finalizing ? "Finalizando…" : "Finalizar tarea"}
            </AppButton>
          </div>
        ) : undefined
      }
    >
      <div className="space-y-5">
        {/* Metadata badges */}
        <div className="flex flex-wrap gap-2">
          {tarea.prioridad && (
            <span className="rounded border border-[color:var(--border-shell)] bg-[color:var(--surface-soft)] px-2 py-0.5 text-xs capitalize text-[color:var(--text-ink-muted)]">
              Prioridad: {tarea.prioridad}
            </span>
          )}
          {eventoConfig && (
            <span className="rounded border border-[color:var(--border-shell)] bg-[color:var(--surface-soft)] px-2 py-0.5 text-xs text-[color:var(--accent-primary)]">
              {eventoConfig.label}
            </span>
          )}
        </div>

        {/* Descripción */}
        {tarea.descripcion && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--text-ink-muted)]">
              Descripción
            </p>
            <p className="mt-1 text-sm text-[color:var(--text-ink)]">{tarea.descripcion}</p>
          </div>
        )}

        {/* Imagen */}
        {tarea.imagen_url && (
          <img
            src={tarea.imagen_url}
            alt="Evidencia"
            className="max-h-56 rounded-[var(--radius-md)] border border-[color:var(--border-shell)] object-cover"
          />
        )}

        {/* Asignaciones */}
        {(tarea.tarea_asignacion?.length ?? 0) > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--text-ink-muted)]">
              Asignaciones
            </p>
            <div className="space-y-2">
              {tarea.tarea_asignacion!.map((a) => (
                <div
                  key={a.tarea_asignacion_id}
                  className="space-y-1 rounded border border-[color:var(--border-shell)] bg-[color:var(--surface-soft)] px-3 py-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {normalizeEstado(a.estado) !== "pendiente" && estadoBadge(a.estado)}
                      {a.app_user?.nombre && (
                        <span className="text-sm font-medium text-[color:var(--text-ink)]">
                          {a.app_user.nombre}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-[color:var(--text-ink-muted)]">
                      Asignada el {new Date(a.assigned_at).toLocaleDateString("es-AR")}
                    </span>
                  </div>
                  {a.completed_at && (
                    <p className="text-xs text-[color:var(--feedback-success-text)]">
                      Completada el {new Date(a.completed_at).toLocaleString("es-AR")}
                    </p>
                  )}
                  {a.observaciones && (
                    <p className="border-t border-[color:var(--border-shell)]/50 pt-1 text-sm text-[color:var(--text-ink)]">
                      {a.observaciones}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Entradas guardadas */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--text-ink-muted)]">
            Registros guardados {entradas !== null ? `(${entradas.length})` : ""}
          </p>
          {loadingEntradas ? (
            <p className="text-sm text-[color:var(--text-ink-muted)]">Cargando registros…</p>
          ) : entradas && entradas.length > 0 ? (
            <div className="space-y-2">
              {entradas.map((e, i) => (
                  <EntradaItem
                    key={e.entradaId ?? i}
                    entrada={e}
                    index={i}
                    eventoConfig={eventoConfig}
                    onUpdated={(updated) =>
                      setEntradas((prev) =>
                        prev ? prev.map((x) => (x.entradaId === updated.entradaId ? { ...x, ...updated } : x)) : prev,
                      )
                    }
                  />
              ))}
            </div>
          ) : entradas !== null ? (
            <p className="text-sm text-[color:var(--text-ink-muted)]">
              {(tarea.tarea_asignacion?.length ?? 0) === 0
                ? "Sin asignaciones — la tarea todavía no fue tomada por ningún operario."
                : isCompleted
                  ? "Completada sin datos de formulario guardados."
                  : "Sin registros guardados aún."}
            </p>
          ) : null}
        </div>

        {/* Formulario de registro */}
        {asignacionId && !isCompleted && (
          <div className="space-y-3 border-t border-[color:var(--border-default)]/50 pt-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--text-ink-muted)]">
              Registrar avance{eventoConfig ? ` — ${eventoConfig.label}` : ""}
            </p>

            <EventoFields eventoConfig={eventoConfig} draft={draft} onChange={setDraftField} />


            {/* ── Adjuntos picker ─────────────────────────────────────── */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--text-ink-muted)]">
                Adjuntos <span className="font-normal normal-case">(fotos y archivos — opcional)</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {/* Pending previews */}
                {pendingFiles.map(({ file, previewUrl }, idx) => (
                  <div key={idx} className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-[color:var(--border-shell)] bg-[color:var(--surface-soft)] overflow-hidden">
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

                {/* Add photo button */}
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="flex h-20 w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-[var(--radius-md)] border border-dashed border-[color:var(--border-default)] bg-[color:var(--surface-soft)] text-[color:var(--text-ink-muted)] transition hover:border-[color:var(--accent-primary)] hover:text-[color:var(--text-ink)]"
                >
                  <span className="text-2xl leading-none">📷</span>
                  <span className="text-[10px] font-semibold">Foto</span>
                </button>

                {/* Add file button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-20 w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-[var(--radius-md)] border border-dashed border-[color:var(--border-default)] bg-[color:var(--surface-soft)] text-[color:var(--text-ink-muted)] transition hover:border-[color:var(--accent-primary)] hover:text-[color:var(--text-ink)]"
                >
                  <span className="text-2xl leading-none">📎</span>
                  <span className="text-[10px] font-semibold">Archivo</span>
                </button>

                {/* Hidden inputs */}
                <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePickImages} />
                <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv" multiple className="hidden" onChange={handlePickFiles} />
              </div>
              {uploadingFiles && (
                <p className="mt-2 text-xs text-[color:var(--text-ink-muted)]">Subiendo archivos a IPFS…</p>
              )}
            </div>

            {(entradas ?? []).length === 0 && (
              <p className="text-xs text-[color:var(--text-ink-muted)]">
                Necesitás registrar al menos una entrada antes de poder finalizar la tarea.
              </p>
            )}
          </div>
        )}

        {tarea.tarea_id && asignacionId && !isCompleted && (
          <div className="border-t border-[color:var(--border-shell)]/50 pt-4">
            <CostosActividadPanel
              tareaId={tarea.tarea_id}
              bodegaId={tarea.bodega_id ?? modalBodegaId}
              esFertilizacion={eventoConfig?.label === "Fertilización"}
            />
          </div>
        )}

        <p className="border-t border-[color:var(--border-shell)]/50 pt-3 text-xs text-[color:var(--text-ink-muted)]">
          Creada: {tarea.created_at ? new Date(tarea.created_at).toLocaleString("es-AR") : "—"}
          {tarea.updated_at ? ` · Actualizada: ${new Date(tarea.updated_at).toLocaleString("es-AR")}` : ""}
        </p>
      </div>
    </AppModal>
  );
}

// ─── TareaRow ────────────────────────────────────────────────────────────────

function TareaRow({
  tarea,
  onCompleted,
}: {
  tarea: Tarea;
  onCompleted?: () => void;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const fecha = fechaLabel(tarea);

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="flex w-full items-center justify-between gap-2 rounded-[var(--radius-md)] border border-[color:var(--border-shell)] bg-[color:var(--surface-muted)] px-4 py-3 text-left transition hover:border-[color:var(--border-subtle)] hover:bg-[color:var(--surface-soft)]"
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-[color:var(--text-ink)]">{tarea.titulo}</p>
          <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
            {tarea.cuartel?.codigo_cuartel && (
              <p className="text-xs text-[color:var(--text-ink-muted)]">
                Cuartel: {tarea.cuartel.codigo_cuartel}
              </p>
            )}
            {(tarea.tarea_asignacion ?? []).length > 0 && (
              <p className="text-xs text-[color:var(--text-ink-muted)]">
                Asignada a:{" "}
                <span className="font-medium text-[color:var(--text-ink)]">
                  {tarea.tarea_asignacion!
                    .map((a) => a.app_user?.nombre ?? "Operario")
                    .join(", ")}
                </span>
              </p>
            )}
            {fecha && (
              <p className={`text-xs ${fecha.overdue ? "font-semibold text-red-400" : "text-[color:var(--text-ink-muted)]"}`}>
                {fecha.text}
              </p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {estadoBadge(tarea.estado)}
          <span className="text-xs text-[color:var(--text-ink-muted)]">→</span>
        </div>
      </button>

      <TareaDetalleModal
        tarea={tarea}
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        onCompleted={onCompleted}
      />
    </>
  );
}

// ─── FincaGroupCard (colapsable) ─────────────────────────────────────────────

function FincaGroupCard({
  nombre,
  tareas,
  defaultOpen,
  onCompleted,
}: {
  nombre: string;
  tareas: Tarea[];
  defaultOpen: boolean;
  onCompleted?: () => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const pendientes = tareas.filter(
    (t) => normalizeEstado(t.estado) !== "completado" && normalizeEstado(t.estado) !== "cancelado",
  ).length;

  return (
    <AppCard as="section" tone="default" padding="lg">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-[color:var(--text-ink)]">{nombre}</p>
          <p className="text-xs text-[color:var(--text-ink-muted)]">
            {tareas.length} tarea{tareas.length !== 1 ? "s" : ""}
            {pendientes > 0 ? ` · ${pendientes} pendiente${pendientes !== 1 ? "s" : ""}` : ""}
          </p>
        </div>
        <span
          className={`shrink-0 text-[color:var(--text-ink-muted)] transition-transform ${open ? "rotate-90" : ""}`}
          aria-hidden="true"
        >
          ▸
        </span>
      </button>

      {open && (
        <div className="mt-4 space-y-2">
          {tareas.map((tarea) => (
            <TareaRow
              key={String(tarea.tarea_id ?? tarea.id ?? "")}
              tarea={tarea}
              onCompleted={onCompleted}
            />
          ))}
        </div>
      )}
    </AppCard>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

type SortDir = "desc" | "asc";
type StatusFilter = "todos" | "pendientes" | "completadas";

// Fecha relevante para ordenar: completada → completed_at; si no, fecha_fin; si no, created_at
function tareaSortTime(tarea: Tarea): number {
  if (normalizeEstado(tarea.estado) === "completado") {
    const completedAt =
      tarea.tarea_asignacion
        ?.map((a) => a.completed_at)
        .filter(Boolean)
        .sort()
        .reverse()[0] ?? tarea.updated_at;
    if (completedAt) return new Date(completedAt).getTime();
  }
  const ref = tarea.fecha_fin ?? tarea.updated_at ?? tarea.created_at;
  return ref ? new Date(String(ref)).getTime() : 0;
}

export default function CampoPage({ standalone = false }: { standalone?: boolean }) {
  const activeBodegaId = useAuthStore((state) => state.activeBodegaId);
  const fincas = useFincasStore((state) => state.fincas);
  const loadFincas = useFincasStore((state) => state.loadFincas);
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pendientes");
  const [fincaFilter, setFincaFilter] = useState<string>("todas");
  const [query, setQuery] = useState("");

  const loadTareas = () => {
    if (!activeBodegaId) { setLoading(false); return; }
    setLoading(true);
    const bodegaIdStr = String(activeBodegaId);
    // Fetch en paralelo:
    // - fetchTareasByBodega: todas las tareas de la bodega (requiere rol manager; retorna [] en silencio si el usuario no tiene acceso)
    // - fetchPendientesByScope "mine": tareas propias pendientes (funciona para cualquier rol)
    // Se mergean y deduplicán para que operario_campo vea al menos sus propias asignaciones de campo
    Promise.all([
      fetchTareasByBodega(bodegaIdStr),
      fetchPendientesByScope({ bodegaId: bodegaIdStr, mode: "mine" }),
    ])
      .then(([all, mine]) => {
        const seen = new Set<string>();
        const merged: Tarea[] = [];
        for (const t of [...all, ...mine]) {
          const key = String(t.tarea_id ?? t.id ?? "");
          if (!key || seen.has(key)) continue;
          seen.add(key);
          merged.push(t);
        }
        setTareas(merged);
      })
      .catch(() => setTareas([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!activeBodegaId) {
      setLoading(false);
      return;
    }
    void loadFincas(activeBodegaId);
    loadTareas();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBodegaId, loadFincas]);

  const tareasDeCampo = useMemo(
    () => tareas.filter((t) => Boolean(t.finca_id ?? t.finca?.finca_id)),
    [tareas],
  );

  const porFinca = useMemo(() => {
    const map = new Map<
      string,
      { fincaId: string; nombre: string; tareas: Tarea[] }
    >();
    for (const tarea of tareasDeCampo) {
      const fincaId = String(tarea.finca_id ?? tarea.finca?.finca_id ?? "");
      if (!fincaId) continue;
      const existing = map.get(fincaId);
      if (existing) {
        existing.tareas.push(tarea);
      } else {
        const finca = fincas.find(
          (f) => String(f.finca_id ?? f.id ?? "") === fincaId,
        );
        const nombre = finca?.nombre_finca ?? `Finca ${fincaId.slice(0, 6)}`;
        map.set(fincaId, { fincaId, nombre, tareas: [tarea] });
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      a.nombre.localeCompare(b.nombre, "es"),
    );
  }, [tareasDeCampo, fincas]);

  const totales = useMemo(() => {
    const completadas = tareasDeCampo.filter(
      (t) => normalizeEstado(t.estado) === "completado",
    ).length;
    const enProgreso = tareasDeCampo.filter(
      (t) => normalizeEstado(t.estado) === "en_progreso",
    ).length;
    const pendientes = tareasDeCampo.filter(
      (t) =>
        normalizeEstado(t.estado) !== "completado" &&
        normalizeEstado(t.estado) !== "en_progreso" &&
        normalizeEstado(t.estado) !== "cancelado",
    ).length;
    return { total: tareasDeCampo.length, completadas, enProgreso, pendientes };
  }, [tareasDeCampo]);

  if (loading) {
    return standalone ? (
      <div className="min-h-screen bg-secondary px-6 py-10">
        <div className="mx-auto w-full max-w-6xl">
          <NoticeBanner tone="info">Cargando operaciones de campo…</NoticeBanner>
        </div>
      </div>
    ) : (
      <NoticeBanner tone="info">Cargando operaciones de campo…</NoticeBanner>
    );
  }

  const content = (
    <div className="space-y-6">
      <AppCard as="section" tone="default" padding="lg">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <SectionIntro
            eyebrow="Operaciones de campo"
            title="Actividad por finca"
            description="Tareas registradas en las fincas vinculadas a esta bodega. Hacé click en una tarea para ver el detalle y registrar avances."
          />
          {!standalone && (
            <Link to="/operacion/registro" className="shrink-0">
              <AppButton variant="primary">+ Registrar actividad</AppButton>
            </Link>
          )}
        </div>

        {tareasDeCampo.length > 0 && (
          <div className="mt-5 grid gap-4 md:grid-cols-4">
            <MetricCard label="Tareas de campo" value={totales.total} hint="Total vinculadas a fincas" />
            <MetricCard label="Completadas" value={totales.completadas} tone="success" hint="Trabajo cerrado" />
            <MetricCard label="En progreso" value={totales.enProgreso} tone="warning" hint="Con actividad activa" />
            <MetricCard label="Pendientes" value={totales.pendientes} hint="Sin iniciar o vencidas" />
          </div>
        )}

        {tareasDeCampo.length > 0 && (
          <div className="mt-5 flex flex-wrap items-end gap-3">
            <div className="min-w-52 flex-1">
              <AppInput
                label="Buscar tarea"
                type="search"
                placeholder="Título o cuartel…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="w-48">
              <AppSelect
                label="Finca"
                value={fincaFilter}
                onChange={(e) => setFincaFilter(e.target.value)}
              >
                <option value="todas">Todas las fincas</option>
                {porFinca.map((g) => (
                  <option key={g.fincaId} value={g.fincaId}>
                    {g.nombre}
                  </option>
                ))}
              </AppSelect>
            </div>
            <div className="w-40">
              <AppSelect
                label="Estado"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              >
                <option value="pendientes">Pendientes</option>
                <option value="completadas">Completadas</option>
                <option value="todos">Todas</option>
              </AppSelect>
            </div>
            <div className="w-40">
              <AppSelect
                label="Ordenar por fecha"
                value={sortDir}
                onChange={(e) => setSortDir(e.target.value as SortDir)}
              >
                <option value="desc">Más recientes</option>
                <option value="asc">Más antiguas</option>
              </AppSelect>
            </div>
          </div>
        )}
      </AppCard>

      {tareasDeCampo.length === 0 ? (
        <NoticeBanner tone="info">
          No hay tareas de campo para las fincas de esta bodega.
          Esta sección muestra únicamente órdenes de trabajo asociadas a una finca y cuartel (riego, cosecha, fenología, etc.).
          Las tareas de bodega (recepción, CIU, vasijas) se gestionan desde las secciones de operación correspondientes.
        </NoticeBanner>
      ) : (
        (() => {
          const needle = query.trim().toLowerCase();
          const gruposVisibles = porFinca
            .filter((grupo) => fincaFilter === "todas" || grupo.fincaId === fincaFilter)
            .map((grupo) => {
              const tareasFiltradas = grupo.tareas
                .filter((t) => {
                  // Las canceladas no son trabajo de campo activo: no aparecen
                  // en "pendientes" (se gestionan/eliminan desde Órdenes).
                  if (statusFilter === "pendientes" && normalizeEstado(t.estado) === "cancelado") {
                    return false;
                  }
                  if (statusFilter !== "todos") {
                    const completada = normalizeEstado(t.estado) === "completado";
                    if (statusFilter === "completadas" ? !completada : completada) return false;
                  }
                  if (needle) {
                    const haystack = `${t.titulo ?? ""} ${t.cuartel?.codigo_cuartel ?? ""}`.toLowerCase();
                    if (!haystack.includes(needle)) return false;
                  }
                  return true;
                })
                .slice()
                .sort((a, b) => {
                  const aTime = tareaSortTime(a);
                  const bTime = tareaSortTime(b);
                  return sortDir === "desc" ? bTime - aTime : aTime - bTime;
                });
              return { ...grupo, tareas: tareasFiltradas };
            })
            .filter((grupo) => grupo.tareas.length > 0);

          if (gruposVisibles.length === 0) {
            return (
              <NoticeBanner tone="info">
                No hay tareas que coincidan con los filtros seleccionados.
              </NoticeBanner>
            );
          }

          // Con una sola finca visible la abrimos; con varias, expandimos solo las
          // que tienen tareas para no saturar la vista.
          const expandirTodas = gruposVisibles.length <= 3;

          return gruposVisibles.map((grupo) => (
            <FincaGroupCard
              key={grupo.fincaId}
              nombre={grupo.nombre}
              tareas={grupo.tareas}
              defaultOpen={expandirTodas}
              onCompleted={loadTareas}
            />
          ));
        })()
      )}
    </div>
  );

  if (standalone) {
    return (
      <div className="min-h-screen bg-secondary px-6 py-10">
        <div className="mx-auto w-full max-w-6xl">
          {content}
        </div>
      </div>
    );
  }

  return content;
}
