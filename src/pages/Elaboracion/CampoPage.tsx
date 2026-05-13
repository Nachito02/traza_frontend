import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  fetchTareasByBodega,
  fetchTareaAsignacionDetail,
  createTareaEntrada,
  finalizarTareaAsignacion,
  assignTareaToUser,
  type Tarea,
  type TareaEntradaDetail,
} from "../../features/encargos/api";
import { fetchProtocoloById } from "../../features/protocolos/api";
import { fetchCuartelesByFinca, type Cuartel } from "../../features/cuarteles/api";
import { fetchAuthUsers, type AuthUser } from "../../features/users/api";
import { EVENTO_CONFIG, type FieldDef } from "../Trazabilidad/eventoConfig";
import { useFincasStore } from "../../features/fincas/store";
import { useOperacionStore } from "../../store/operacionStore";
import { useAuthStore } from "../../store/authStore";
import { AppCard, AppButton, MetricCard, NoticeBanner, SectionIntro } from "../../components/ui";

// ─── helpers ────────────────────────────────────────────────────────────────

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
        <span className="rounded-full border border-[color:var(--feedback-success-border)] bg-[color:var(--feedback-success-bg)] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--feedback-success-text)]">
          Completado
        </span>
      );
    case "en_progreso":
      return (
        <span className="rounded-full border border-[color:var(--feedback-warning-border)] bg-[color:var(--feedback-warning-bg)] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--feedback-warning-text)]">
          En progreso
        </span>
      );
    case "cancelado":
      return (
        <span className="rounded-full border border-[color:var(--feedback-neutral-border)] bg-[color:var(--feedback-neutral-bg)] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--feedback-neutral-text)]">
          Cancelado
        </span>
      );
    default:
      return (
        <span className="rounded-full border border-[color:var(--border-shell)] bg-[color:var(--surface-muted)] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--text-on-dark-muted)]">
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
    return <p className="mt-1 text-xs text-[color:var(--text-ink)]">{descripcion}</p>;
  }

  return (
    <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2">
      {Object.entries(parsed).map(([key, val]) => (
        <div key={key}>
          <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[color:var(--text-ink-muted)]">
            {formatKey(key)}
          </p>
          <p className="mt-0.5 text-xs font-medium text-[color:var(--text-ink)]">
            {val === null || val === undefined ? "—" : typeof val === "boolean" ? (val ? "Sí" : "No") : String(val)}
          </p>
        </div>
      ))}
    </div>
  );
}

type AdjuntosCampo = { campo: string; type?: string; unit?: string; required?: boolean; enum?: string[] };
type AdjuntosPayload = {
  draft?: Record<string, unknown>;
  notas?: string | null;
  plantilla?: {
    camposObligatorios?: AdjuntosCampo[];
    camposOpcionales?: AdjuntosCampo[];
  };
};

function getTaskId(tarea: Tarea) {
  return String(tarea.tarea_id ?? tarea.id ?? "");
}

// ─── SmartField ──────────────────────────────────────────────────────────────

const INPUT_CLS =
  "w-full rounded-[var(--radius-md)] border border-[color:var(--border-shell)] bg-[color:var(--surface-soft)] px-2 py-1.5 text-xs text-[color:var(--text-ink)] focus:border-[color:var(--accent-primary)] focus:outline-none";

function SmartField({
  campo,
  value,
  onChange,
  fieldDef,
  cuarteles,
  users,
}: {
  campo: AdjuntosCampo;
  value: string;
  onChange: (v: string) => void;
  fieldDef?: FieldDef;
  cuarteles: Cuartel[];
  users: AuthUser[];
}) {
  const label = fieldDef?.label ?? formatKey(campo.campo);
  const effType = fieldDef?.type ?? campo.type ?? "text";
  const isRequired = fieldDef?.required ?? campo.required;

  const labelEl = (
    <label className="mb-1 block text-[9px] font-semibold uppercase tracking-[0.14em] text-[color:var(--text-ink-muted)]">
      {label}
      {isRequired ? " *" : ""}
    </label>
  );

  if (effType === "user_select" || campo.campo.endsWith("_user_id")) {
    return (
      <div>
        {labelEl}
        <select value={value} onChange={(e) => onChange(e.target.value)} className={INPUT_CLS}>
          <option value="">— Seleccionar —</option>
          {users.map((u) => (
            <option key={String(u.id)} value={String(u.id)}>
              {u.nombre}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (campo.campo === "cuartel_id" || campo.campo === "cuartel") {
    return (
      <div>
        {labelEl}
        <select value={value} onChange={(e) => onChange(e.target.value)} className={INPUT_CLS}>
          <option value="">— Seleccionar cuartel —</option>
          {cuarteles.map((c) => {
            const id = String(c.cuartel_id ?? c.id ?? "");
            return (
              <option key={id} value={id}>
                {c.codigo_cuartel}
                {c.variedad ? ` — ${c.variedad}` : ""}
              </option>
            );
          })}
        </select>
      </div>
    );
  }

  if (effType === "select" && (fieldDef?.options?.length ?? 0) > 0) {
    return (
      <div>
        {labelEl}
        <select value={value} onChange={(e) => onChange(e.target.value)} className={INPUT_CLS}>
          <option value="">— Seleccionar —</option>
          {fieldDef!.options!.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if ((campo.enum?.length ?? 0) > 0) {
    return (
      <div>
        {labelEl}
        <select value={value} onChange={(e) => onChange(e.target.value)} className={INPUT_CLS}>
          <option value="">— Seleccionar —</option>
          {campo.enum!.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (effType === "textarea") {
    return (
      <div className="col-span-2">
        {labelEl}
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          className={`${INPUT_CLS} resize-none`}
        />
      </div>
    );
  }

  return (
    <div>
      {labelEl}
      <input
        type={effType === "date" ? "date" : effType === "number" ? "number" : "text"}
        step={effType === "number" ? (fieldDef?.step ?? "any") : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={fieldDef?.placeholder ?? "—"}
        className={INPUT_CLS}
      />
    </div>
  );
}

// ─── TareaRow ────────────────────────────────────────────────────────────────

function TareaRow({
  tarea,
  onRefresh,
  defaultOpen = false,
  preloadedSchemaFields = [],
  eventoTipo,
}: {
  tarea: Tarea;
  onRefresh: () => void;
  defaultOpen?: boolean;
  preloadedSchemaFields?: AdjuntosCampo[];
  eventoTipo?: string;
}) {
  const currentUser = useAuthStore((state) => state.user);
  const [open, setOpen] = useState(defaultOpen);
  const rowRef = useRef<HTMLDivElement>(null);
  const [entradas, setEntradas] = useState<TareaEntradaDetail[] | null>(null);
  const [loadingEntradas, setLoadingEntradas] = useState(false);
  const [cuarteles, setCuarteles] = useState<Cuartel[]>([]);
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [formNotas, setFormNotas] = useState("");
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [savedOk, setSavedOk] = useState(false);

  const eventoCampos = useMemo(
    () => EVENTO_CONFIG[eventoTipo ?? ""]?.fields ?? [],
    [eventoTipo],
  );
  const fecha = fechaLabel(tarea);

  const isCompleted =
    normalizeEstado(tarea.estado) === "completado" ||
    (tarea.tarea_asignacion?.some((a) => normalizeEstado(a.estado) === "completado") ?? false);

  const activeAsignacion = useMemo(
    () =>
      (tarea.tarea_asignacion ?? []).find(
        (a) => normalizeEstado(a.estado) !== "completado" && normalizeEstado(a.estado) !== "cancelado",
      ) ?? null,
    [tarea.tarea_asignacion],
  );

  const schemaFields = useMemo((): AdjuntosCampo[] => {
    // Prefer schema embedded in existing entries (chatbot format)
    if (entradas) {
      for (const e of entradas) {
        const adj = e.adjuntos as AdjuntosPayload | undefined;
        const campos = [
          ...(adj?.plantilla?.camposObligatorios ?? []),
          ...(adj?.plantilla?.camposOpcionales ?? []),
        ];
        if (campos.length > 0) return campos;
      }
    }
    // Fallback: use schema from protocol proceso passed by parent
    return preloadedSchemaFields;
  }, [entradas, preloadedSchemaFields]);

  async function loadEntradas() {
    const results = await Promise.all(
      (tarea.tarea_asignacion ?? []).map((a) =>
        fetchTareaAsignacionDetail(a.tarea_asignacion_id),
      ),
    );
    setEntradas(results.flat());
  }

  function fetchSideData() {
    const fincaId = tarea.finca_id ?? tarea.finca?.finca_id;
    if (fincaId) {
      fetchCuartelesByFinca(fincaId).then(setCuarteles).catch(() => {});
    }
    fetchAuthUsers().then(setUsers).catch(() => {});
  }

  function handleToggle() {
    const willOpen = !open;
    setOpen(willOpen);
    if (!willOpen) return;
    fetchSideData();
    if (entradas !== null) return;
    if ((tarea.tarea_asignacion?.length ?? 0) === 0) {
      setEntradas([]);
      return;
    }
    setLoadingEntradas(true);
    loadEntradas().finally(() => setLoadingEntradas(false));
  }

  async function handleGuardar() {
    if (!activeAsignacion) return;
    setSaving(true);
    setSavedOk(false);
    try {
      const draft = schemaFields.length > 0 ? { ...formValues } : undefined;
      await createTareaEntrada(activeAsignacion.tarea_asignacion_id, {
        draft,
        notas: formNotas || undefined,
        descripcion: formNotas || undefined,
      });
      setFormValues({});
      setFormNotas("");
      setSavedOk(true);
      await loadEntradas();
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (!defaultOpen) return;
    if (rowRef.current) {
      rowRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    fetchSideData();
    if (entradas === null && (tarea.tarea_asignacion?.length ?? 0) > 0) {
      setLoadingEntradas(true);
      loadEntradas().finally(() => setLoadingEntradas(false));
    } else if (entradas === null) {
      setEntradas([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleTomar() {
    if (!currentUser) return;
    setAssigning(true);
    try {
      await assignTareaToUser(getTaskId(tarea), String(currentUser.id));
      onRefresh();
    } finally {
      setAssigning(false);
    }
  }

  async function handleFinalizar() {
    if (!activeAsignacion) return;
    setFinalizing(true);
    try {
      await finalizarTareaAsignacion(activeAsignacion.tarea_asignacion_id);
      onRefresh();
    } finally {
      setFinalizing(false);
    }
  }

  return (
    <div ref={rowRef} className="overflow-hidden rounded-[var(--radius-md)] border border-[color:var(--border-shell)] bg-[color:var(--surface-muted)]">
      <button
        type="button"
        onClick={handleToggle}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left transition hover:bg-[color:var(--action-ghost-bg)]"
      >
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-[color:var(--text-ink)]">{tarea.titulo}</p>
          {tarea.cuartel?.codigo_cuartel && (
            <p className="text-[10px] text-[color:var(--text-ink-muted)]">
              Cuartel: {tarea.cuartel.codigo_cuartel}
            </p>
          )}
          {fecha && (
            <p className={`text-[10px] ${fecha.overdue ? "font-semibold text-red-400" : "text-[color:var(--text-ink-muted)]"}`}>
              {fecha.text}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {estadoBadge(tarea.estado)}
          <span className="text-[10px] text-[color:var(--text-ink-muted)]">{open ? "▲" : "▼"}</span>
        </div>
      </button>

      {open && (
        <div className="space-y-3 border-t border-[color:var(--border-default)]/50 px-3 py-3">
          {tarea.descripcion && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--text-ink-muted)]">
                Descripción
              </p>
              <p className="mt-0.5 text-xs text-[color:var(--text-ink)]">{tarea.descripcion}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-1.5">
            {tarea.prioridad && (
              <span className="rounded border border-[color:var(--border-shell)] bg-[color:var(--surface-soft)] px-2 py-0.5 text-[10px] capitalize text-[color:var(--text-ink-muted)]">
                Prioridad: {tarea.prioridad}
              </span>
            )}
          </div>

          {tarea.imagen_url && (
            <img
              src={tarea.imagen_url}
              alt="Evidencia"
              className="max-h-48 rounded-[var(--radius-md)] border border-[color:var(--border-shell)] object-cover"
            />
          )}

          {(tarea.tarea_asignacion?.length ?? 0) > 0 && (
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--text-ink-muted)]">
                Asignaciones
              </p>
              <div className="space-y-1.5">
                {tarea.tarea_asignacion!.map((a) => (
                  <div
                    key={a.tarea_asignacion_id}
                    className="space-y-1 rounded border border-[color:var(--border-shell)] bg-[color:var(--surface-soft)] px-3 py-2 text-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      {estadoBadge(a.estado)}
                      <span className="text-[10px] text-[color:var(--text-ink-muted)]">
                        Asignada el {new Date(a.assigned_at).toLocaleDateString("es-AR")}
                      </span>
                    </div>
                    {a.completed_at && (
                      <p className="text-[10px] text-[color:var(--feedback-success-text)]">
                        Completada el {new Date(a.completed_at).toLocaleString("es-AR")}
                      </p>
                    )}
                    {a.observaciones && (
                      <p className="border-t border-[color:var(--border-shell)]/50 pt-1 text-[color:var(--text-ink)]">
                        {a.observaciones}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {loadingEntradas && (
            <p className="text-[10px] text-[color:var(--text-ink-muted)]">Cargando registros…</p>
          )}
          {entradas && entradas.length > 0 && (
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--text-ink-muted)]">
                Registros guardados ({entradas.length})
              </p>
              <div className="space-y-1.5">
                {entradas.map((e) => (
                  <div
                    key={e.entradaId}
                    className="rounded border border-[color:var(--border-shell)] bg-[color:var(--surface-soft)] px-3 py-2 text-xs"
                  >
                    <p className="text-[10px] text-[color:var(--text-ink-muted)]">
                      {new Date(e.fecha).toLocaleString("es-AR")}
                      {e.creadoPor?.nombre ? ` · ${e.creadoPor.nombre}` : ""}
                    </p>
                    {e.descripcion && <EntradaDescripcion descripcion={e.descripcion} />}
                  </div>
                ))}
              </div>
            </div>
          )}
          {entradas !== null && entradas.length === 0 && (
            <p className="text-[10px] text-[color:var(--text-ink-muted)]">
              {(tarea.tarea_asignacion?.length ?? 0) === 0
                ? "Sin asignaciones — la tarea todavía no fue tomada por ningún operario."
                : normalizeEstado(tarea.estado) === "completado"
                  ? "Completada sin datos de formulario guardados."
                  : "Sin registros guardados aún."}
            </p>
          )}

          <p className="border-t border-[color:var(--border-shell)]/50 pt-2 text-[10px] text-[color:var(--text-ink-muted)]">
            Creada: {tarea.created_at ? new Date(tarea.created_at).toLocaleString("es-AR") : "—"}
            {tarea.updated_at
              ? ` · Actualizada: ${new Date(tarea.updated_at).toLocaleString("es-AR")}`
              : ""}
          </p>

          {!isCompleted && !activeAsignacion && currentUser && (
            <div className="border-t border-[color:var(--border-shell)]/50 pt-3 space-y-2">
              <p className="text-xs text-[color:var(--text-ink-muted)]">
                Esta tarea no tiene asignaciones activas. Tomala para poder registrar actividad.
              </p>
              <AppButton variant="primary" size="sm" onClick={handleTomar} disabled={assigning}>
                {assigning ? "Tomando…" : "Tomar tarea"}
              </AppButton>
            </div>
          )}

          {!isCompleted && activeAsignacion && (
            <div className="border-t border-[color:var(--border-shell)]/50 pt-3 space-y-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--text-ink-muted)]">
                Registrar actividad
              </p>

              {schemaFields.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {schemaFields.map((sc) => {
                    const fieldDef = eventoCampos.find((f) => f.name === sc.campo);
                    return (
                      <SmartField
                        key={sc.campo}
                        campo={sc}
                        value={formValues[sc.campo] ?? ""}
                        onChange={(v) =>
                          setFormValues((prev) => ({ ...prev, [sc.campo]: v }))
                        }
                        fieldDef={fieldDef}
                        cuarteles={cuarteles}
                        users={users}
                      />
                    );
                  })}
                </div>
              )}

              <div>
                <label className="mb-1 block text-[9px] font-semibold uppercase tracking-[0.14em] text-[color:var(--text-ink-muted)]">
                  Observaciones / Notas
                </label>
                <textarea
                  value={formNotas}
                  onChange={(e) => setFormNotas(e.target.value)}
                  rows={3}
                  className="w-full resize-none rounded-[var(--radius-md)] border border-[color:var(--border-shell)] bg-[color:var(--surface-soft)] px-2 py-1.5 text-xs text-[color:var(--text-ink)] focus:border-[color:var(--accent-primary)] focus:outline-none"
                  placeholder="Notas opcionales…"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <AppButton
                  variant="primary"
                  size="sm"
                  onClick={handleGuardar}
                  disabled={saving}
                >
                  {saving ? "Guardando…" : "Guardar registro"}
                </AppButton>
                <AppButton
                  variant="secondary"
                  size="sm"
                  onClick={handleFinalizar}
                  disabled={finalizing}
                >
                  {finalizing ? "Finalizando…" : "Marcar como completada"}
                </AppButton>
              </div>

              {savedOk && (
                <p className="text-[10px] text-[color:var(--feedback-success-text)]">
                  Registro guardado correctamente.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function CampoPage() {
  const [searchParams] = useSearchParams();
  const targetTareaId = searchParams.get("tareaId") ?? null;
  const activeBodegaId = useAuthStore((state) => state.activeBodegaId);
  const { activeProtocoloId } = useOperacionStore();
  const fincas = useFincasStore((state) => state.fincas);
  const loadFincas = useFincasStore((state) => state.loadFincas);
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [loading, setLoading] = useState(true);
  const [fincasOpen, setFincasOpen] = useState<Record<string, boolean>>({});
  const [procesoSchemaMap, setProcesoSchemaMap] = useState<Map<string, { campos: AdjuntosCampo[]; eventoTipo: string }>>(new Map());

  function refreshTareas() {
    if (!activeBodegaId) return;
    fetchTareasByBodega(String(activeBodegaId))
      .then((data) => setTareas(data))
      .catch(() => {});
  }

  useEffect(() => {
    if (!activeBodegaId) {
      setLoading(false);
      return;
    }
    void loadFincas(activeBodegaId);
    setLoading(true);
    fetchTareasByBodega(String(activeBodegaId))
      .then((data) => setTareas(data))
      .catch(() => setTareas([]))
      .finally(() => setLoading(false));
  }, [activeBodegaId, loadFincas]);

  useEffect(() => {
    if (!activeProtocoloId) return;
    fetchProtocoloById(activeProtocoloId)
      .then((proto) => {
        const map = new Map<string, { campos: AdjuntosCampo[]; eventoTipo: string }>();
        for (const etapa of proto.protocolo_etapa ?? []) {
          for (const proceso of etapa.protocolo_proceso ?? []) {
            const pid = String(proceso.proceso_id ?? proceso.id ?? "");
            if (!pid) continue;
            const campos = proceso.plantilla?.campos?.map((c) => ({
              campo: c.campo,
              type: c.type,
              unit: c.unit,
              required: c.required,
              enum: (c as { enum?: string[] }).enum,
            })) ?? [];
            if (campos.length > 0) {
              map.set(pid, { campos, eventoTipo: proceso.evento_tipo ?? "" });
            }
          }
        }
        setProcesoSchemaMap(map);
      })
      .catch(() => {});
  }, [activeProtocoloId]);

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
        const nombre =
          finca?.nombre_finca ?? finca?.nombre ?? finca?.name ?? `Finca ${fincaId.slice(0, 6)}`;
        map.set(fincaId, { fincaId, nombre, tareas: [tarea] });
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      a.nombre.localeCompare(b.nombre, "es"),
    );
  }, [tareasDeCampo, fincas]);

  useEffect(() => {
    if (!targetTareaId) return;
    for (const grupo of porFinca) {
      if (grupo.tareas.some((t) => getTaskId(t) === targetTareaId)) {
        setFincasOpen((prev) => ({ ...prev, [grupo.fincaId]: true }));
        break;
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetTareaId, porFinca]);

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
    return (
      <NoticeBanner tone="info">Cargando operaciones de campo…</NoticeBanner>
    );
  }

  return (
    <div className="space-y-6">
      <AppCard as="section" tone="default" padding="lg">
        <SectionIntro
          eyebrow="Operaciones de finca"
          title="Actividad por finca"
          description="Tareas registradas en las fincas vinculadas a esta bodega. Expandí cada tarea para ver los datos registrados por el operario."
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
        porFinca.map((grupo) => {
          const isOpen = fincasOpen[grupo.fincaId] ?? false;
          const pendientes = grupo.tareas.filter(
            (t) =>
              normalizeEstado(t.estado) !== "completado" &&
              normalizeEstado(t.estado) !== "cancelado",
          ).length;
          return (
            <AppCard
              key={grupo.fincaId}
              as="section"
              tone="default"
              padding="lg"
              header={(
                <button
                  type="button"
                  onClick={() =>
                    setFincasOpen((prev) => ({ ...prev, [grupo.fincaId]: !isOpen }))
                  }
                  className="flex w-full items-center justify-between gap-3 text-left"
                >
                  <SectionIntro
                    title={grupo.nombre}
                    description={`${grupo.tareas.length} tarea${grupo.tareas.length !== 1 ? "s" : ""}${pendientes > 0 ? ` · ${pendientes} pendiente${pendientes !== 1 ? "s" : ""}` : ""}`}
                  />
                  <span
                    className={`shrink-0 text-sm text-[color:var(--text-ink-muted)] transition-transform duration-[var(--motion-fast)] ${isOpen ? "rotate-90" : ""}`}
                  >
                    ▶
                  </span>
                </button>
              )}
            >
              {isOpen && (
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
                        onRefresh={refreshTareas}
                        defaultOpen={targetTareaId !== null && getTaskId(tarea) === targetTareaId}
                        preloadedSchemaFields={procesoSchemaMap.get(String(tarea.proceso_id ?? ""))?.campos ?? []}
                        eventoTipo={procesoSchemaMap.get(String(tarea.proceso_id ?? ""))?.eventoTipo}
                      />
                    ))}
                </div>
              )}
            </AppCard>
          );
        })
      )}
    </div>
  );
}
