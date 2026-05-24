import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  fetchTareasByBodega,
  fetchTareaAsignacionDetail,
  createTareaEntrada,
  finalizarTareaAsignacion,
  uploadEntradaAdjunto,
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
  AppTextarea,
  MetricCard,
  NoticeBanner,
  SectionIntro,
  useAppNotifications,
} from "../../components/ui";
import { EVENTO_CONFIG, type EventoConfig } from "../Trazabilidad/eventoConfig";

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
        <span className="flex flex-wrap items-center gap-2">
          {tarea.titulo}
          {estadoBadge(tarea.estado)}
        </span>
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
            <AppButton type="button" variant="ghost" size="sm" onClick={onClose}>
              Cerrar
            </AppButton>
          </div>
        ) : (
          <AppButton type="button" variant="ghost" size="sm" onClick={onClose}>
            Cerrar
          </AppButton>
        )
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
              {entradas.map((e, i) => {
                let parsedFields: [string, string][] | null = null;
                const rawDesc = e.notas ?? e.descripcion ?? "";
                try {
                  const parsed = JSON.parse(rawDesc) as unknown;
                  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
                    parsedFields = Object.entries(parsed as Record<string, unknown>)
                      .filter(([, v]) => v !== null && v !== "")
                      .map(([k, v]) => {
                        const label = eventoConfig?.fields.find((f) => f.name === k)?.label ?? k.replace(/_/g, " ");
                        return [label, String(v)];
                      });
                  }
                } catch { /* texto plano */ }

                return (
                  <div
                    key={e.entradaId ?? i}
                    className="rounded border border-[color:var(--border-shell)] bg-[color:var(--surface-soft)] px-3 py-2"
                  >
                    <p className="text-xs text-[color:var(--text-ink-muted)]">
                      #{i + 1} · {new Date(e.fecha).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      {e.creadoPor?.nombre ? ` · ${e.creadoPor.nombre}` : ""}
                    </p>
                    {parsedFields ? (
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
                    {/* Adjuntos (images + files from IPFS) */}
                    {Array.isArray(e.adjuntos) && e.adjuntos.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(e.adjuntos as AdjuntoRecord[]).map((adj) =>
                          adj.tipo.startsWith("image/") ? (
                            <a
                              key={adj.cid}
                              href={adj.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block h-16 w-16 shrink-0 overflow-hidden rounded-[var(--radius-md)] border border-[color:var(--border-shell)] transition hover:border-[color:var(--accent-primary)]"
                            >
                              <img src={adj.url} alt={adj.nombre} className="h-full w-full object-cover" />
                            </a>
                          ) : (
                            <a
                              key={adj.cid}
                              href={adj.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex h-16 w-16 shrink-0 flex-col items-center justify-center gap-0.5 overflow-hidden rounded-[var(--radius-md)] border border-[color:var(--border-shell)] bg-[color:var(--surface-soft)] px-1 text-center transition hover:border-[color:var(--accent-primary)]"
                            >
                              <span className="text-xl leading-none">{fileIcon(adj.tipo)}</span>
                              <span className="line-clamp-2 text-[9px] font-medium text-[color:var(--text-ink-muted)]">{adj.nombre}</span>
                            </a>
                          )
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
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

            {eventoConfig ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {eventoConfig.fields
                  .filter((field) => field.type !== "user_select")
                  .map((field) => {
                    const value = draft[field.name] ?? field.defaultValue ?? "";
                    if (field.type === "textarea") {
                      return (
                        <div key={field.name} className="sm:col-span-2">
                          <AppTextarea
                            label={field.label}
                            value={value}
                            onChange={(e) => setDraftField(field.name, e.target.value)}
                            placeholder={field.placeholder}
                            uiSize="lg"
                          />
                        </div>
                      );
                    }
                    if (field.type === "select" && field.options) {
                      return (
                        <AppSelect
                          key={field.name}
                          label={field.label}
                          value={value}
                          onChange={(e) => setDraftField(field.name, e.target.value)}
                        >
                          <option value="">Seleccionar...</option>
                          {field.options.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </AppSelect>
                      );
                    }
                    return (
                      <AppInput
                        key={field.name}
                        label={`${field.label}${field.required ? " *" : ""}`}
                        type={field.type === "date" ? "date" : field.type === "number" ? "number" : "text"}
                        value={value}
                        onChange={(e) => setDraftField(field.name, e.target.value)}
                        placeholder={field.placeholder}
                        step={field.step}
                        uiSize="lg"
                      />
                    );
                  })}
              </div>
            ) : (
              <AppTextarea
                label="Notas del registro"
                value={draft["_notas"] ?? ""}
                onChange={(e) => setDraftField("_notas", e.target.value)}
                placeholder="Describí qué se hizo, mediciones, observaciones..."
                uiSize="lg"
              />
            )}

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

// ─── Page ────────────────────────────────────────────────────────────────────

export default function CampoPage({ standalone = false }: { standalone?: boolean }) {
  const activeBodegaId = useAuthStore((state) => state.activeBodegaId);
  const fincas = useFincasStore((state) => state.fincas);
  const loadFincas = useFincasStore((state) => state.loadFincas);
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTareas = () => {
    if (!activeBodegaId) { setLoading(false); return; }
    setLoading(true);
    fetchTareasByBodega(String(activeBodegaId))
      .then((data) => setTareas(data))
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
        <SectionIntro
          eyebrow="Operaciones de campo"
          title="Actividad por finca"
          description="Tareas registradas en las fincas vinculadas a esta bodega. Hacé click en una tarea para ver el detalle y registrar avances."
        />

        {tareasDeCampo.length > 0 && (
          <div className="mt-5 grid gap-4 md:grid-cols-4">
            <MetricCard label="Tareas de campo" value={totales.total} hint="Total vinculadas a fincas" />
            <MetricCard label="Completadas" value={totales.completadas} tone="success" hint="Trabajo cerrado" />
            <MetricCard label="En progreso" value={totales.enProgreso} tone="warning" hint="Con actividad activa" />
            <MetricCard label="Pendientes" value={totales.pendientes} hint="Sin iniciar o vencidas" />
          </div>
        )}
      </AppCard>

      {tareasDeCampo.length === 0 ? (
        <NoticeBanner tone="info">
          No hay tareas de campo registradas para las fincas vinculadas a esta bodega.
          Las tareas aparecen cuando los operarios reciben órdenes de trabajo asociadas a una finca.
        </NoticeBanner>
      ) : (
        porFinca.map((grupo) => (
          <AppCard
            key={grupo.fincaId}
            as="section"
            tone="default"
            padding="lg"
            header={(
              <SectionIntro
                title={grupo.nombre}
                description={`${grupo.tareas.length} tarea${grupo.tareas.length !== 1 ? "s" : ""} registrada${grupo.tareas.length !== 1 ? "s" : ""}`}
              />
            )}
          >
            <div className="space-y-2">
              {grupo.tareas
                .slice()
                .sort((a, b) => {
                  const aTime = new Date(String(a.updated_at ?? a.created_at ?? 0)).getTime();
                  const bTime = new Date(String(b.updated_at ?? b.created_at ?? 0)).getTime();
                  return bTime - aTime;
                })
                .map((tarea) => (
                  <TareaRow
                    key={String(tarea.tarea_id ?? tarea.id ?? "")}
                    tarea={tarea}
                    onCompleted={loadTareas}
                  />
                ))}
            </div>
          </AppCard>
        ))
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
