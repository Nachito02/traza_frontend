import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { fetchCuartelesByFinca, type Cuartel } from "../../features/cuarteles/api";
import { useFincasStore } from "../../features/fincas/store";
import {
  assignTareaToUser,
  createTarea,
  deleteTarea,
  fetchCanManageTareas,
  fetchPendientesByScope,
  fetchTareasByBodega,
  type Tarea,
} from "../../features/encargos/api";
import { fetchAuthUsers, type AuthUser } from "../../features/users/api";
import { fetchOperariosByBodega, type Operario } from "../../features/operarios/api";
import { getApiErrorMessage } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import { useCampaniaStore } from "../../store/campaniaStore";
import { useOperacionStore } from "../../store/operacionStore";
import {
  AppButton,
  AppCard,
  GuidedState,
  AppInput,
  AppSelect,
  AppTextarea,
  NoticeBanner,
  SectionIntro,
} from "../../components/ui";
import {
  fetchProtocoloById,
  fetchProtocolosExpanded,
  type ProtocoloExpanded,
} from "../../features/protocolos/api";
import { resolveModuleAccess } from "../../lib/permissions";
import { EVENTO_CONFIG } from "../Trazabilidad/eventoConfig";
import {
  createTareaEntrada,
  fetchTareaAsignacionDetail,
  finalizarTareaAsignacion,
  type TareaEntradaDetail,
} from "../../features/encargos/api";

const FINCA_MANAGER_ROLES = [
  "encargado_finca",
];

const GLOBAL_MANAGER_ROLES = [
  "admin_sistema",
];

const BODEGA_MANAGER_ROLES = [
  "admin_bodega",
  "encargado_bodega",
  "productor",
  "responsable_calidad_inocuidad",
  "responsable_ssyo",
  "enologo",
];

const OPERATOR_ROLES = [
  "operador_campo",
  "operario_campo",
  "operario_finca",
  "operador_bodega",
  "operario_bodega",
];

type ProtocoloTaskOption = {
  value: string;
  label: string;
  titulo: string;
  eventoTipo: string;
  etapaLabel: string;
  protocoloLabel: string;
  ordenEtapa: number;
  ordenProceso: number;
};

type OperacionCategoria =
  | "recepcion"
  | "ciu-qc"
  | "vasijas"
  | "cortes"
  | "fraccionamiento"
  | "qr";

type OperacionTaskTemplate = {
  id: string;
  categoria: OperacionCategoria;
  titulo: string;
  label: string;
};

const OPERACION_CATEGORY_OPTIONS: Array<{ value: OperacionCategoria; label: string }> = [
  { value: "recepcion", label: "Recepción" },
  { value: "ciu-qc", label: "CIU y QC" },
  { value: "vasijas", label: "Vasijas y Proceso" },
  { value: "cortes", label: "Cortes y Producto" },
  { value: "fraccionamiento", label: "Fraccionamiento y Despacho" },
  { value: "qr", label: "Producto y Trazabilidad" },
];

const OPERACION_TASK_TEMPLATES: OperacionTaskTemplate[] = [
  { id: "remito_uva", categoria: "recepcion", titulo: "Remito Uva", label: "Remito Uva" },
  { id: "recepcion_bodega", categoria: "recepcion", titulo: "Recepción Bodega", label: "Recepción Bodega" },
  { id: "analisis_recepcion", categoria: "recepcion", titulo: "Análisis Recepción", label: "Análisis Recepción" },
  { id: "ciu", categoria: "ciu-qc", titulo: "CIU", label: "CIU" },
  { id: "ciu_recepcion", categoria: "ciu-qc", titulo: "CIU-Recepción", label: "CIU-Recepción" },
  { id: "qc_ingreso_uva", categoria: "ciu-qc", titulo: "QC Ingreso Uva", label: "QC Ingreso Uva" },
  { id: "vasija", categoria: "vasijas", titulo: "Vasija", label: "Vasija" },
  { id: "operacion_vasija", categoria: "vasijas", titulo: "Operación Vasija", label: "Operación Vasija" },
  { id: "existencia_vasija", categoria: "vasijas", titulo: "Existencia Vasija", label: "Existencia Vasija" },
  { id: "control_fermentacion", categoria: "vasijas", titulo: "Control Fermentación", label: "Control Fermentación" },
  { id: "corte", categoria: "cortes", titulo: "Corte", label: "Corte" },
  { id: "producto", categoria: "cortes", titulo: "Producto", label: "Producto" },
  { id: "lote_fraccionamiento", categoria: "fraccionamiento", titulo: "Lote Fraccionamiento", label: "Lote Fraccionamiento" },
  { id: "codigo_envase", categoria: "fraccionamiento", titulo: "Código de Envase", label: "Código de Envase" },
  { id: "despacho", categoria: "fraccionamiento", titulo: "Despacho", label: "Despacho" },
  { id: "producto_trazabilidad", categoria: "qr", titulo: "Producto y Trazabilidad", label: "Producto y Trazabilidad" },
];

const OPERACION_TASK_ROUTES: Record<string, string> = {
  remito_uva: "/operacion/recepcion?section=remito",
  recepcion_bodega: "/operacion/recepcion?section=recepcion",
  analisis_recepcion: "/operacion/recepcion?section=analisis",
  ciu: "/operacion/ciu-qc?section=ciu",
  ciu_recepcion: "/operacion/ciu-qc?section=vinculo",
  qc_ingreso_uva: "/operacion/ciu-qc?section=qc",
  vasija: "/operacion/vasijas?section=vasijas",
  operacion_vasija: "/operacion/vasijas?section=operaciones",
  existencia_vasija: "/operacion/vasijas?section=existencias",
  control_fermentacion: "/operacion/vasijas?section=fermentacion",
  corte: "/operacion/cortes?section=cortes",
  producto: "/operacion/cortes?section=productos",
  lote_fraccionamiento: "/operacion/fraccionamiento?section=lotes",
  codigo_envase: "/operacion/fraccionamiento?section=codigos",
  despacho: "/operacion/fraccionamiento?section=despachos",
  producto_trazabilidad: "/operacion/qr",
};

const OPERACION_SCOPE_STORAGE_KEY = "operacion_scope";

const FINCA_PRODUCCION_EVENT_TYPES = new Set([
  "riego",
  "cosecha",
  "fenologia",
  "fertilizacion",
  "labor_suelo",
  "canopia",
  "aplicacion_fitosanitaria",
  "monitoreo_enfermedad",
  "monitoreo_plaga",
  "analisis_suelo",
  "precipitacion",
]);

const SETUP_ONLY_EVENT_TYPES = new Set([
  "origen_unidad_productiva",
]);

function isSetupOnlyProtocolItem(input: {
  eventoTipo?: string | null;
  etapaLabel?: string | null;
  etapaNombre?: string | null;
  titulo?: string | null;
  nombre?: string | null;
}) {
  const eventoTipo = String(input.eventoTipo ?? "").toLowerCase().trim();
  if (SETUP_ONLY_EVENT_TYPES.has(eventoTipo)) return true;

  const fingerprint = [
    input.etapaLabel,
    input.etapaNombre,
    input.titulo,
    input.nombre,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  return (
    fingerprint.includes("capitulo 0") ||
    fingerprint.includes("origen / unidad productiva")
  );
}

function isFincaProductionOption(option: ProtocoloTaskOption) {
  if (isSetupOnlyProtocolItem(option)) return false;
  if (FINCA_PRODUCCION_EVENT_TYPES.has(option.eventoTipo)) return true;
  const fingerprint = `${option.protocoloLabel} ${option.etapaLabel} ${option.titulo} ${option.eventoTipo}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return [
    "finca",
    "campo",
    "cuartel",
    "vinedo",
    "vinedo",
    "produccion",
    "agronom",
    "cosecha",
    "cultivo",
  ].some((keyword) => fingerprint.includes(keyword));
}

function getTaskTargetLabel(task: Tarea) {
  const fincaName =
    task.finca?.nombre_finca ??
    task.finca?.nombre ??
    (task.finca_id ? `Finca ${task.finca_id.slice(0, 8)}` : null);
  const cuartelName =
    task.cuartel?.codigo_cuartel ??
    (task.cuartel_id ? `Cuartel ${task.cuartel_id.slice(0, 8)}` : null);

  if (fincaName && cuartelName) return `${fincaName} / ${cuartelName}`;
  if (fincaName) return fincaName;
  return null;
}

function normalizeRoles(input: unknown): string[] {
  if (typeof input === "string") {
    const normalized = input.trim().toLowerCase();
    return normalized ? [normalized] : [];
  }
  if (Array.isArray(input)) {
    return input
      .flatMap((role) => {
        if (typeof role === "string") return [role];
        if (role && typeof role === "object") {
          const anyRole = role as Record<string, unknown>;
          return [
            anyRole.rol_global,
            anyRole.rol_en_bodega,
            anyRole.rol_en_finca,
            anyRole.rol,
            anyRole.role,
          ].filter((value): value is string => typeof value === "string");
        }
        return [];
      })
      .map((role) => role.trim().toLowerCase())
      .filter(Boolean);
  }
  if (input && typeof input === "object") {
    const anyRole = input as Record<string, unknown>;
    return normalizeRoles([
      anyRole.rol_global,
      anyRole.rol_en_bodega,
      anyRole.rol_en_finca,
      anyRole.rol,
      anyRole.role,
    ]);
  }
  return [];
}

function includesAnyRole(currentRoles: string[], expectedRoles: string[]) {
  const expected = new Set(expectedRoles.map((role) => role.toLowerCase()));
  return currentRoles.some((role) => expected.has(role));
}

function getDefaultTaskForCategory(categoria: OperacionCategoria) {
  return OPERACION_TASK_TEMPLATES.find((task) => task.categoria === categoria) ?? null;
}

function normalizeStr(str: string) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function getMatchedCatalogTaskId(titulo: string, eventoTipo?: string | null): string | null {
  if (eventoTipo) {
    const byType = OPERACION_TASK_TEMPLATES.find((t) => t.id === eventoTipo);
    if (byType) return byType.id;
  }
  const norm = normalizeStr(titulo);
  for (const template of OPERACION_TASK_TEMPLATES) {
    const templateNorm = normalizeStr(template.titulo);
    if (norm === templateNorm || norm.includes(templateNorm) || templateNorm.includes(norm)) {
      return template.id;
    }
  }
  return null;
}

function getTaskCompletedDate(task: Tarea) {
  const raw =
    task.tarea_asignacion?.find((assignment) => assignment.estado === "completado")?.completed_at ??
    task.updated_at ??
    task.created_at ??
    null;
  return raw ? new Date(raw) : null;
}

function getTaskId(task: Tarea) {
  return String(task.tarea_id ?? task.id ?? "");
}

function normalizeTaskStatus(status?: string | null) {
  return String(status ?? "").trim().toLowerCase();
}

function hasCompletedAssignment(task: Tarea) {
  return task.tarea_asignacion?.some(
    (assignment) => normalizeTaskStatus(assignment.estado) === "completado",
  ) ?? false;
}

function isCompletedTask(task: Tarea) {
  return normalizeTaskStatus(task.estado) === "completado" || hasCompletedAssignment(task);
}

function isPendingTask(task: Tarea) {
  const taskStatus = normalizeTaskStatus(task.estado || "pendiente");
  const hasActiveAssignment = task.tarea_asignacion?.some((assignment) =>
    ["pendiente", "en_progreso"].includes(normalizeTaskStatus(assignment.estado)),
  ) ?? false;

  return !isCompletedTask(task) && (
    ["pendiente", "en_progreso"].includes(taskStatus) ||
    hasActiveAssignment
  );
}

function dedupeTasksById(items: Tarea[]) {
  const unique = new Map<string, Tarea>();

  items.forEach((item) => {
    const taskId = getTaskId(item);
    if (!taskId) return;

    const current = unique.get(taskId);
    if (!current) {
      unique.set(taskId, item);
      return;
    }

    unique.set(taskId, {
      ...current,
      ...item,
      tarea_asignacion: item.tarea_asignacion?.length
        ? item.tarea_asignacion
        : current.tarea_asignacion,
    });
  });

  return Array.from(unique.values());
}

function formatTaskDate(date: Date | null) {
  if (!date || Number.isNaN(date.getTime())) return "Sin fecha";
  return date.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type TareasProps = {
  mode?: "manager" | "operator";
};

const Tareas = ({ mode = "operator" }: TareasProps) => {
  const user = useAuthStore((state) => state.user);
  const bodegas = useAuthStore((state) => state.bodegas);
  const activeBodegaId = useAuthStore((state) => state.activeBodegaId);
  const activeCampaniaId = useCampaniaStore((state) => state.activeCampaniaId);
  const loadFincas = useFincasStore((state) => state.loadFincas);
  const fincas = useFincasStore((state) => state.fincas);
  const [cuartelesByFinca, setCuartelesByFinca] = useState<Record<string, Cuartel[]>>({});
  const [operarios, setOperarios] = useState<AuthUser[]>([]);
  const [operariosCampo, setOperariosCampo] = useState<Operario[]>([]);
  const [tasks, setTasks] = useState<Tarea[]>([]);
  const [completedTasks, setCompletedTasks] = useState<Tarea[]>([]);
  const [ordersView, setOrdersView] = useState<"pending" | "completed">("pending");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [protocoloTaskOptions, setProtocoloTaskOptions] = useState<ProtocoloTaskOption[]>([]);
  const [canManageTasks, setCanManageTasks] = useState(false);
  const [forceMineMode, setForceMineMode] = useState(true);
  const { activeProtocoloId } = useOperacionStore();
  const [activeProtocolo, setActiveProtocolo] = useState<ProtocoloExpanded | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [expandedTaskForm, setExpandedTaskForm] = useState<Record<string, string>>({});
  const [expandedTaskSaving, setExpandedTaskSaving] = useState(false);
  const [expandedTaskFinalizing, setExpandedTaskFinalizing] = useState(false);
  const [expandedTaskError, setExpandedTaskError] = useState<string | null>(null);
  const [expandedTaskNotice, setExpandedTaskNotice] = useState<string | null>(null);
  const [expandedTaskEntries, setExpandedTaskEntries] = useState<TareaEntradaDetail[]>([]);
  const [expandedTaskEntriesLoading, setExpandedTaskEntriesLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [completedLoading, setCompletedLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [form, setForm] = useState({
    tareaProtocolo: "",
    tareaCatalogoId: "",
    categoriaOperacion: "recepcion" as OperacionCategoria,
    selectedProcesoId: "",
    titulo: "",
    descripcion: "",
    fechaFin: "",
    prioridad: "media" as "baja" | "media" | "alta",
    fincaId: "",
    cuartelId: "",
    assigneeKey: "",
  });
  const [searchParams] = useSearchParams();
  const activeBodega = useMemo(
    () => bodegas.find((item) => String(item.bodega_id) === String(activeBodegaId)),
    [activeBodegaId, bodegas],
  );
  const userRoles = useMemo(
    () =>
      normalizeRoles([
        user?.roles_globales,
        (user as { rol?: unknown } | null)?.rol,
        (user as { role?: unknown } | null)?.role,
      ]),
    [user],
  );
  const access = resolveModuleAccess(user, activeBodegaId);
  const activeBodegaRoles = useMemo(() => {
    const userAny = (user ?? {}) as {
      bodegas?: Array<{
        bodega_id?: string | number;
        roles_en_bodega?: string[];
        rol_en_bodega?: string;
      }>;
    };
    const targetBodegaId = String(activeBodegaId ?? "");
    const match = (userAny.bodegas ?? []).find(
      (item) => String(item.bodega_id ?? "") === targetBodegaId,
    );
    const localRoles = match
      ? match.roles_en_bodega ?? (match.rol_en_bodega ? [match.rol_en_bodega] : [])
      : [];
    return normalizeRoles(localRoles);
  }, [activeBodegaId, user]);
  const hasFincaManagerRole = useMemo(
    () => {
      const userAny = (user ?? {}) as {
        fincas?: Array<{
          roles_en_finca?: unknown;
          rol_en_finca?: unknown;
        }>;
      };
      const fincaRoles = (userAny.fincas ?? []).flatMap((finca) =>
        normalizeRoles([finca.roles_en_finca, finca.rol_en_finca]),
      );
      return (
        includesAnyRole(userRoles, FINCA_MANAGER_ROLES) ||
        includesAnyRole(activeBodegaRoles, FINCA_MANAGER_ROLES) ||
        includesAnyRole(fincaRoles, FINCA_MANAGER_ROLES)
      );
    },
    [activeBodegaRoles, user, userRoles],
  );
  const hasBodegaManagerRole = useMemo(
    () =>
      includesAnyRole(userRoles, BODEGA_MANAGER_ROLES) ||
      includesAnyRole(activeBodegaRoles, BODEGA_MANAGER_ROLES),
    [activeBodegaRoles, userRoles],
  );
  const managerScope = useMemo<"finca" | "bodega">(() => {
    if (access.hasBothOperacionScopes) {
      if (typeof window !== "undefined") {
        const preferred = window.localStorage.getItem(OPERACION_SCOPE_STORAGE_KEY);
        if (preferred === "finca") return "finca";
      }
      return "bodega";
    }
    if (hasBodegaManagerRole) return "bodega";
    return "finca";
  }, [access.hasBothOperacionScopes, hasBodegaManagerRole]);
  const canManageByRole = useMemo(
    () =>
      includesAnyRole(userRoles, GLOBAL_MANAGER_ROLES) || hasFincaManagerRole || hasBodegaManagerRole,
    [hasBodegaManagerRole, hasFincaManagerRole, userRoles],
  );
  const isManagerMode = mode === "manager";
  const canRenderManagerFlow = isManagerMode && canManageTasks;

  const selectedCatalogTask = useMemo(
    () => OPERACION_TASK_TEMPLATES.find((task) => task.id === form.tareaCatalogoId) ?? null,
    [form.tareaCatalogoId],
  );
  const bodegaDestinoOptions = useMemo(
    () =>
      bodegas.map((bodega) => ({
        value: bodega.nombre ?? String(bodega.bodega_id),
        label: bodega.nombre ?? `Bodega ${String(bodega.bodega_id).slice(0, 8)}`,
      })),
    [bodegas],
  );

  const getEventoFieldOptions = (field: { options?: { value: string; label: string }[]; optionsSource?: "bodegas" }) => {
    if (field.optionsSource === "bodegas") return bodegaDestinoOptions;
    return field.options ?? [];
  };

  const refreshTasks = async () => {
    if (!activeBodegaId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPendientesByScope({
        bodegaId: String(activeBodegaId),
        fincaId: form.fincaId || undefined,
        mode: forceMineMode ? "mine" : "scope",
      });
      setTasks(dedupeTasksById(data ?? []).filter(isPendingTask));
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const refreshCompletedTasks = async () => {
    if (!activeBodegaId) return;
    setCompletedLoading(true);
    try {
      const data = await fetchTareasByBodega(String(activeBodegaId));
      const completed = dedupeTasksById(data ?? [])
        .filter(isCompletedTask)
        .sort((a, b) => {
          const aDate = getTaskCompletedDate(a)?.getTime() ?? 0;
          const bDate = getTaskCompletedDate(b)?.getTime() ?? 0;
          return bDate - aDate;
        });
      setCompletedTasks(completed);
    } catch {
      setCompletedTasks([]);
    } finally {
      setCompletedLoading(false);
    }
  };

  useEffect(() => {
    if (!activeBodegaId) return;
    void loadFincas(activeBodegaId);
  }, [activeBodegaId, loadFincas]);

  useEffect(() => {
    if (!activeBodegaId) return;
    void refreshTasks();
    void refreshCompletedTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBodegaId]);

  useEffect(() => {
    let mounted = true;
    void fetchCanManageTareas().then((canManageFromApi) => {
      if (!mounted) return;
      const resolvedCanManage = Boolean(canManageFromApi || canManageByRole);
      if (mode === "operator") {
        setCanManageTasks(false);
        setForceMineMode(true);
        return;
      }
      setCanManageTasks(resolvedCanManage);
      setForceMineMode(!resolvedCanManage);
    });
    return () => {
      mounted = false;
    };
  }, [canManageByRole, mode]);

  useEffect(() => {
    const categoria = searchParams.get("categoria");
    const tarea = searchParams.get("tarea");
    if (
      categoria &&
      OPERACION_CATEGORY_OPTIONS.some((option) => option.value === categoria) &&
      managerScope === "bodega"
    ) {
      const isValidTaskForCategory = Boolean(
        tarea &&
          OPERACION_TASK_TEMPLATES.some(
            (task) => task.id === tarea && task.categoria === (categoria as OperacionCategoria),
          ),
      );
      const defaultTask = isValidTaskForCategory
        ? OPERACION_TASK_TEMPLATES.find((task) => task.id === tarea) ?? null
        : getDefaultTaskForCategory(categoria as OperacionCategoria);
      setForm((prev) => ({
        ...prev,
        categoriaOperacion: categoria as OperacionCategoria,
        tareaCatalogoId: defaultTask?.id ?? "",
        titulo: defaultTask?.titulo ?? prev.titulo,
      }));
    }
  }, [managerScope, searchParams]);

  useEffect(() => {
    if (!form.fincaId || cuartelesByFinca[form.fincaId]) return;
    fetchCuartelesByFinca(form.fincaId)
      .then((data) => {
        setCuartelesByFinca((prev) => ({ ...prev, [form.fincaId]: data ?? [] }));
      })
      .catch(() => {
        setCuartelesByFinca((prev) => ({ ...prev, [form.fincaId]: [] }));
      });
  }, [cuartelesByFinca, form.fincaId]);

  useEffect(() => {
    if (!canManageTasks) {
      setOperarios([]);
      return;
    }
    if (!activeBodega?.nombre) return;
    fetchAuthUsers(activeBodega.nombre)
      .then((users) => {
        const activeBodegaIdStr = String(activeBodegaId);
        const list = (users ?? []).filter((u) =>
          u.bodegas.some((b) => {
            if (String(b.bodega_id) !== activeBodegaIdStr) return false;
            const roles = Array.isArray(b.roles_en_bodega)
              ? b.roles_en_bodega
              : b.rol_en_bodega
                ? [b.rol_en_bodega]
                : [];
            const roleList = normalizeRoles(roles);
            if (managerScope === "finca") {
              return includesAnyRole(roleList, [
                "operador_campo",
                "operario_campo",
                "operario_finca",
              ]);
            }
            return includesAnyRole(roleList, OPERATOR_ROLES);
          }),
        );
        setOperarios(list);
      })
      .catch(() => {
        setOperarios([]);
      });
  }, [activeBodega?.nombre, activeBodegaId, canManageTasks, managerScope]);

  useEffect(() => {
    if (!canManageTasks || !activeBodegaId) {
      setOperariosCampo([]);
      return;
    }
    fetchOperariosByBodega(activeBodegaId)
      .then((data) => setOperariosCampo((data ?? []).filter((p) => p.is_active !== false)))
      .catch(() => setOperariosCampo([]));
  }, [activeBodegaId, canManageTasks]);

  useEffect(() => {
    if (!activeBodegaId) return;
    void refreshTasks();
    void refreshCompletedTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forceMineMode]);

  const cuartelOptions = useMemo(
    () => cuartelesByFinca[form.fincaId] ?? [],
    [cuartelesByFinca, form.fincaId],
  );

  type AssigneeOption = { key: string; label: string; userId: string; hasAccount: boolean };
  const assigneeOptions = useMemo<AssigneeOption[]>(() => {
    // Operarios from /operarios/bodega (all have user_id; email===null means no credentials)
    const fromOperarios: AssigneeOption[] = operariosCampo.map((op) => ({
      key: `op:${op.user_id}`,
      label: op.email
        ? `${op.nombre} (${op.email})`
        : `${op.nombre}${op.whatsapp_e164 ? ` · ${op.whatsapp_e164}` : ""}`,
      userId: op.user_id,
      hasAccount: op.email !== null,
    }));
    // System users with operator roles not already covered
    const opUserIds = new Set(operariosCampo.map((op) => op.user_id));
    const fromUsers: AssigneeOption[] = operarios
      .filter((u) => !opUserIds.has(u.id))
      .map((u) => ({
        key: `usr:${u.id}`,
        label: `${u.nombre} (${u.email ?? u.id})`,
        userId: u.id,
        hasAccount: true,
      }));
    return [...fromOperarios, ...fromUsers];
  }, [operariosCampo, operarios]);

  useEffect(() => {
    let mounted = true;
    fetchProtocolosExpanded()
      .then((data) => {
        if (!mounted) return;
        const options = (data ?? [])
          .flatMap((protocolo: ProtocoloExpanded) =>
              (protocolo.protocolo_etapa ?? []).flatMap((etapa) =>
              (etapa.protocolo_proceso ?? []).flatMap((proceso) => {
                const protocoloId = String(protocolo.protocolo_id ?? protocolo.id ?? "protocolo");
                const etapaId = String(etapa.etapa_id ?? etapa.nombre ?? "etapa");
                const procesoId = String(proceso.proceso_id ?? proceso.nombre ?? "proceso");
                const titulo = String(proceso.nombre ?? "Tarea");
                const etapaLabel = String(etapa.nombre ?? "Etapa");
                const protocoloLabel = String(protocolo.nombre ?? protocolo.codigo ?? "Protocolo");
                const eventoTipo = String(proceso.evento_tipo ?? "").toLowerCase().trim();
                if (isSetupOnlyProtocolItem({ eventoTipo, etapaLabel, titulo })) return [];
                return [{
                  value: `${protocoloId}:${etapaId}:${procesoId}`,
                  titulo,
                  label: `${protocoloLabel} · ${etapaLabel} · ${titulo}`,
                  eventoTipo,
                  etapaLabel,
                  protocoloLabel,
                  ordenEtapa: Number(etapa.orden ?? 999),
                  ordenProceso: Number(proceso.orden ?? 999),
                }];
              }),
            ),
          )
          .sort((a, b) => a.ordenEtapa - b.ordenEtapa || a.ordenProceso - b.ordenProceso)
          .map(({ value, label, titulo, eventoTipo, etapaLabel, protocoloLabel, ordenEtapa, ordenProceso }) => ({
            value,
            label,
            titulo,
            eventoTipo,
            etapaLabel,
            protocoloLabel,
            ordenEtapa,
            ordenProceso,
          }));

        setProtocoloTaskOptions(options);
      })
      .catch(() => {
        if (!mounted) return;
        setProtocoloTaskOptions([]);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!activeProtocoloId || managerScope !== "bodega") {
      setActiveProtocolo(null);
      return;
    }
    let mounted = true;
    fetchProtocoloById(activeProtocoloId)
      .then((data) => { if (mounted) setActiveProtocolo(data); })
      .catch(() => { if (mounted) setActiveProtocolo(null); });
    return () => { mounted = false; };
  }, [activeProtocoloId, managerScope]);

  const protocolProcesses = useMemo(() => {
    if (!activeProtocolo) return [];
    return (activeProtocolo.protocolo_etapa ?? []).flatMap((etapa) =>
      (etapa.protocolo_proceso ?? []).flatMap((proceso) => {
        const item = {
          proceso_id: String(proceso.proceso_id ?? proceso.id ?? ""),
          nombre: proceso.nombre ?? "",
          evento_tipo: proceso.evento_tipo ?? "",
          obligatorio: proceso.obligatorio ?? false,
          orden: proceso.orden ?? 999,
          etapaNombre: etapa.nombre ?? "",
          etapaOrden: etapa.orden ?? 999,
        };
        return isSetupOnlyProtocolItem({
          eventoTipo: item.evento_tipo,
          etapaNombre: item.etapaNombre,
          nombre: item.nombre,
        })
          ? []
          : [item];
      }),
    ).sort((a, b) => a.etapaOrden - b.etapaOrden || a.orden - b.orden);
  }, [activeProtocolo]);

  const selectedProtocolProcess = useMemo(
    () => protocolProcesses.find((process) => process.proceso_id === form.selectedProcesoId) ?? null,
    [form.selectedProcesoId, protocolProcesses],
  );

  const requiresFincaTarget = useMemo(() => {
    if (managerScope === "finca") return true;
    if (!selectedProtocolProcess?.evento_tipo) return false;
    return FINCA_PRODUCCION_EVENT_TYPES.has(
      selectedProtocolProcess.evento_tipo.toLowerCase().trim(),
    );
  }, [managerScope, selectedProtocolProcess]);

  const groupedProtocolProcesses = useMemo(() => {
    const groups = new Map<string, { nombre: string; orden: number; procesos: typeof protocolProcesses }>();
    protocolProcesses.forEach((proceso) => {
      const key = proceso.etapaNombre || "General";
      const existing = groups.get(key);
      if (existing) {
        existing.procesos.push(proceso);
      } else {
        groups.set(key, { nombre: key, orden: proceso.etapaOrden, procesos: [proceso] });
      }
    });
    return Array.from(groups.values()).sort((a, b) => a.orden - b.orden);
  }, [protocolProcesses]);

  const getEventoTipoForTask = (task: Tarea): string | null => {
    if (!task.proceso_id) return null;
    // Look up in active protocol processes first
    const inProtocol = protocolProcesses.find(
      (p) => p.proceso_id === String(task.proceso_id),
    );
    if (inProtocol?.evento_tipo) return inProtocol.evento_tipo;
    // Fall back to all loaded protocol options
    const inOptions = protocoloTaskOptions.find((opt) =>
      opt.value.endsWith(`:${task.proceso_id}`),
    );
    return inOptions?.eventoTipo ?? null;
  };

  const openExpandedTask = (taskId: string, task: Tarea) => {
    setExpandedTaskId(taskId);
    setExpandedTaskError(null);
    setExpandedTaskNotice(null);
    setExpandedTaskEntries([]);
    const tipo = getEventoTipoForTask(task) ?? "";
    const config = EVENTO_CONFIG[tipo];
    const initialForm: Record<string, string> = {};
    if (config) {
      config.fields.forEach((f) => { initialForm[f.name] = f.defaultValue ?? ""; });
      if ("fecha" in initialForm && !initialForm.fecha) {
        initialForm.fecha = new Date().toISOString().slice(0, 10);
      }
    }
    setExpandedTaskForm(initialForm);

    // Cargar historial de entradas desde el backend
    const asignacionId = task.tarea_asignacion?.[0]?.tarea_asignacion_id;
    if (asignacionId) {
      setExpandedTaskEntriesLoading(true);
      fetchTareaAsignacionDetail(asignacionId)
        .then((entries) => setExpandedTaskEntries(entries))
        .catch(() => setExpandedTaskEntries([]))
        .finally(() => setExpandedTaskEntriesLoading(false));
    }
  };

  const getAsignacionId = async (task: Tarea): Promise<string | null> => {
    const existing = task.tarea_asignacion?.[0]?.tarea_asignacion_id;
    if (existing) return existing;

    // Auto-asignar al usuario actual (encargado registrando directamente)
    const tareaId = String(task.tarea_id ?? task.id ?? "");
    const userId = String(user?.id ?? "");
    if (!tareaId || !userId) return null;

    try {
      const resp = await assignTareaToUser(tareaId, userId);
      const r = resp as Record<string, unknown>;
      // Extract from any response shape
      const newId = String(
        r?.tarea_asignacion_id ??
        r?.id ??
        (r?.asignacion as Record<string, unknown> | undefined)?.tarea_asignacion_id ??
        (Array.isArray(r) ? (r[0] as Record<string, unknown>)?.tarea_asignacion_id : undefined) ??
        ""
      );
      if (newId) return newId;
    } catch {
      // Asignación puede existir ya — intentar obtenerla desde el listado
    }

    // Fallback: recargar tareas y extraer el id de la asignacion creada
    try {
      const data = await fetchPendientesByScope({
        bodegaId: String(activeBodegaId),
        mode: forceMineMode ? "mine" : "scope",
      });
      const reloaded = data?.find(
        (t) => String(t.tarea_id ?? t.id ?? "") === tareaId,
      );
      return reloaded?.tarea_asignacion?.[0]?.tarea_asignacion_id ?? null;
    } catch {
      return null;
    }
  };

  const onSubmitTaskEvent = async (task: Tarea) => {
    const tipo = getEventoTipoForTask(task) ?? "";
    const config = EVENTO_CONFIG[tipo];
    if (!config) {
      setExpandedTaskError("Tipo de actividad no soportado.");
      return;
    }
    const missing = config.fields.filter((f) => f.required && !expandedTaskForm[f.name]);
    if (missing.length > 0) {
      setExpandedTaskError("Completá los campos obligatorios.");
      return;
    }

    const asignacionId = await getAsignacionId(task);
    console.log("[Tareas] asignacionId:", asignacionId, "task:", task);
    if (!asignacionId) {
      setExpandedTaskError("No se encontró asignación para esta tarea. Asignala a un operario primero.");
      return;
    }

    const draft: Record<string, unknown> = {};
    config.fields.forEach((field) => {
      const v = expandedTaskForm[field.name];
      if (!v) return;
      draft[field.name] = field.type === "number" ? Number(v) : v;
    });
    if (tipo === "cosecha") {
      if (!activeCampaniaId) {
        setExpandedTaskError("Seleccioná una campaña activa antes de registrar la cosecha.");
        return;
      }
      draft.campaniaId = activeCampaniaId;
    }

    setExpandedTaskSaving(true);
    setExpandedTaskError(null);
    try {
      const savedEntry = await createTareaEntrada(asignacionId, { draft });
      const loteCosechaId =
        typeof savedEntry?.loteCosechaId === "string" ? savedEntry.loteCosechaId : null;
      // Agregar al historial (optimistic, luego recarga del backend)
      const newEntry: TareaEntradaDetail = {
        entradaId: `local-${Date.now()}`,
        descripcion: Object.entries(draft).map(([k, v]) => `${k}: ${String(v)}`).join(", "),
        fecha: new Date().toISOString(),
        adjuntos: [],
        creadoPor: user ? { user_id: String(user.id ?? ""), nombre: String(user.nombre ?? user.email ?? "") } : null,
      };
      setExpandedTaskEntries((prev) => [...prev, newEntry]);
      setExpandedTaskNotice(
        loteCosechaId
          ? `Registro guardado y lote de cosecha generado: ${loteCosechaId}.`
          : "Registro guardado. Podés agregar otro o finalizar la tarea.",
      );
      // Resetear form para nuevo registro
      const initialForm: Record<string, string> = {};
      config.fields.forEach((f) => { initialForm[f.name] = f.defaultValue ?? ""; });
      if ("fecha" in initialForm) initialForm.fecha = new Date().toISOString().slice(0, 10);
      setExpandedTaskForm(initialForm);
    } catch (e) {
      setExpandedTaskError(`No se pudo guardar el registro. ${getApiErrorMessage(e)}`);
    } finally {
      setExpandedTaskSaving(false);
    }
  };

  const onFinalizeTask = async (task: Tarea) => {
    const asignacionId = await getAsignacionId(task);
    if (!asignacionId) {
      setExpandedTaskError("No se encontró asignación para finalizar.");
      return;
    }
    setExpandedTaskFinalizing(true);
    setExpandedTaskError(null);
    try {
      await finalizarTareaAsignacion(asignacionId);
      setExpandedTaskId(null);
      await refreshTasks();
      await refreshCompletedTasks();
    } catch {
      setExpandedTaskError("No se pudo finalizar la tarea.");
    } finally {
      setExpandedTaskFinalizing(false);
    }
  };

  const scopedProtocoloTaskOptions = useMemo(
    () =>
      protocoloTaskOptions.filter((option) =>
        managerScope === "finca"
          ? isFincaProductionOption(option)
          : !isFincaProductionOption(option),
      ),
    [managerScope, protocoloTaskOptions],
  );

  const groupedProtocoloTaskOptions = useMemo(() => {
    const groups = new Map<
      string,
      { label: string; orden: number; options: ProtocoloTaskOption[] }
    >();

    scopedProtocoloTaskOptions.forEach((option) => {
      const groupKey = option.etapaLabel || "Sin etapa";
      const current = groups.get(groupKey);
      if (current) {
        current.options.push(option);
        return;
      }
      groups.set(groupKey, {
        label: groupKey,
        orden: option.ordenEtapa,
        options: [option],
      });
    });

    return Array.from(groups.values())
      .sort((a, b) => a.orden - b.orden)
      .map((group) => ({
        ...group,
        options: group.options.sort((a, b) => a.ordenProceso - b.ordenProceso),
      }));
  }, [scopedProtocoloTaskOptions]);

  useEffect(() => {
    if (!form.tareaProtocolo) return;
    const stillAvailable = scopedProtocoloTaskOptions.some(
      (option) => option.value === form.tareaProtocolo,
    );
    if (stillAvailable) return;
    setForm((prev) => ({ ...prev, tareaProtocolo: "", titulo: "" }));
  }, [form.tareaProtocolo, scopedProtocoloTaskOptions]);

  const onCreate = async () => {
    if (!activeBodegaId) {
      setError("Seleccioná una bodega activa.");
      return;
    }
    if (managerScope === "bodega" && activeProtocolo && !form.selectedProcesoId) {
      setError("Seleccioná una actividad del protocolo.");
      return;
    }
    if (managerScope === "bodega" && !activeProtocolo && !form.tareaCatalogoId) {
      setError("Seleccioná un protocolo activo o una tarea operativa.");
      return;
    }
    if (managerScope === "finca" && !form.tareaProtocolo) {
      setError("Seleccioná una tarea del protocolo.");
      return;
    }
    if (requiresFincaTarget && (!form.fincaId || !form.cuartelId)) {
      setError("Seleccioná finca y cuartel para indicar dónde se debe ejecutar la orden.");
      return;
    }
    const procesoId =
      managerScope === "bodega" && activeProtocolo
        ? form.selectedProcesoId || undefined
        : managerScope === "finca"
          ? form.tareaProtocolo.split(":")[2] || undefined
          : undefined;
    const selectedAssignee = assigneeOptions.find((o) => o.key === form.assigneeKey) ?? null;
    const assigneeUserId = selectedAssignee?.userId ?? null;
    const assigneeHasAccount = selectedAssignee?.hasAccount ?? true;

    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const created = await createTarea({
        bodegaId: String(activeBodegaId),
        procesoId,
        fincaId: requiresFincaTarget ? form.fincaId : undefined,
        cuartelId: requiresFincaTarget ? form.cuartelId : undefined,
        descripcion: form.descripcion.trim() || undefined,
        fechaFin: form.fechaFin || undefined,
        prioridad: form.prioridad,
        operarioUserId: assigneeUserId ?? undefined,
      });

      const tareaId = String(created.tarea_id ?? created.id ?? "");
      if (tareaId && assigneeUserId) {
        try {
          await assignTareaToUser(tareaId, assigneeUserId);
          setNotice(
            assigneeHasAccount
              ? "Registro creado y tarea asignada correctamente."
              : `Registro creado y asignado a ${selectedAssignee?.label ?? "operario"}. Sin cuenta — no recibirá notificación en la app.`,
          );
        } catch (assignError) {
          setNotice(
            `Registro creado, pero no se pudo confirmar la asignación: ${getApiErrorMessage(assignError)}`,
          );
        }
      } else {
        setNotice("Registro creado correctamente. Se convertirá en tarea al asignar operario.");
      }

      setForm((prev) => ({
        ...prev,
        tareaProtocolo: "",
        tareaCatalogoId: "",
        selectedProcesoId: "",
        titulo: "",
        descripcion: "",
        fechaFin: "",
        fincaId: requiresFincaTarget ? prev.fincaId : "",
        cuartelId: requiresFincaTarget ? prev.cuartelId : "",
        assigneeKey: "",
      }));
      setShowCreateForm(false);
      await refreshTasks();
      await refreshCompletedTasks();
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const onDeleteTask = async (task: Tarea) => {
    const tareaId = String(task.tarea_id ?? task.id ?? "");
    if (!tareaId) {
      setError("No se pudo determinar el ID de la tarea.");
      return;
    }
    const ok = window.confirm(`¿Eliminar/cancelar la tarea "${task.titulo}"?`);
    if (!ok) return;

    setDeletingTaskId(tareaId);
    setError(null);
    setNotice(null);
    try {
      await deleteTarea(tareaId);
      setNotice("Orden de trabajo eliminada/cancelada correctamente.");
      await refreshTasks();
      await refreshCompletedTasks();
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setDeletingTaskId(null);
    }
  };

  return (
    <div className={isManagerMode ? "w-full" : "min-h-screen bg-secondary px-6 py-10"}>
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <SectionIntro
          title="Órdenes de trabajo"
          description={
            isManagerMode
              ? "Centro diario para crear, asignar y completar órdenes operativas."
              : "Vista operario: gestión de órdenes asignadas a tu usuario."
          }
          actions={(
            <AppButton
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => void refreshTasks()}
            >
              Refrescar
            </AppButton>
          )}
        />

        {!activeBodegaId ? (
          <GuidedState
            title="Seleccioná una bodega para ver órdenes"
            description="Las órdenes de trabajo se crean y se consultan dentro de una bodega activa. Elegí el contexto para continuar."
            action={(
              <Link to="/contexto">
                <AppButton variant="primary" size="sm">Elegir bodega</AppButton>
              </Link>
            )}
            steps={[
              { label: "Bodega activa", done: false },
              { label: "Órdenes disponibles", done: false },
            ]}
          />
        ) : canRenderManagerFlow ? (
          <AppCard
            as="section"
            tone="default"
            padding={showCreateForm ? "lg" : "md"}
            header={(
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-text">
                    {showCreateForm ? "Nueva orden de trabajo" : "Crear orden"}
                  </h2>
                  <p className="mt-1 text-xs text-text-secondary">
                    {showCreateForm
                      ? `Usuario actual: ${user?.nombre ?? user?.email ?? "Usuario"}`
                      : "Desplegá el formulario solo cuando necesites asignar un nuevo trabajo."}
                  </p>
                </div>
                <AppButton
                  type="button"
                  variant={showCreateForm ? "secondary" : "primary"}
                  size="sm"
                  onClick={() => setShowCreateForm((current) => !current)}
                >
                  {showCreateForm ? "Cerrar formulario" : "Crear orden de trabajo"}
                </AppButton>
              </div>
            )}
          >
            {showCreateForm ? (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  {managerScope === "bodega" ? (
                    activeProtocolo ? (
                      <AppSelect
                        value={form.selectedProcesoId}
                        onChange={(e) => {
                          const procesoId = e.target.value;
                          const proceso = protocolProcesses.find((p) => p.proceso_id === procesoId);
                          setForm((prev) => ({
                            ...prev,
                            selectedProcesoId: procesoId,
                            titulo: proceso?.nombre ?? "",
                            tareaCatalogoId: proceso?.evento_tipo
                              ? (getMatchedCatalogTaskId(proceso.nombre, proceso.evento_tipo) ?? "")
                              : "",
                          }));
                        }}
                        className="md:col-span-2"
                      >
                        <option value="">Seleccionar actividad del protocolo</option>
                        {groupedProtocolProcesses.map((group) => (
                          <optgroup key={group.nombre} label={group.nombre}>
                            {group.procesos.map((proceso) => (
                              <option key={proceso.proceso_id} value={proceso.proceso_id}>
                                {proceso.nombre}
                                {proceso.obligatorio ? " *" : ""}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </AppSelect>
                    ) : (
                      <div className="md:col-span-2 rounded-[var(--radius-lg)] border border-[color:var(--border-default)] bg-[color:var(--surface-soft)] px-4 py-3 text-sm text-[color:var(--text-ink-muted)]">
                        Seleccioná un <strong>Protocolo activo</strong> en el encabezado para ver las actividades disponibles.
                      </div>
                    )
                  ) : (
                  <AppSelect
                    value={form.tareaProtocolo}
                    onChange={(e) => {
                      const selected = e.target.value;
                      const task = scopedProtocoloTaskOptions.find(
                        (item) => item.value === selected,
                      );
                      setForm((prev) => ({
                        ...prev,
                        tareaProtocolo: selected,
                        titulo: task?.titulo ?? "",
                      }));
                    }}
                    className="md:col-span-2"
                  >
                    <option value="">Seleccionar tarea del protocolo</option>
                    {groupedProtocoloTaskOptions.map((group) => (
                      <optgroup key={group.label} label={group.label}>
                        {group.options.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.titulo}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </AppSelect>
                  )}
                  <AppSelect
                    value={form.prioridad}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        prioridad: e.target.value as "baja" | "media" | "alta",
                      }))
                    }
                  >
                    <option value="baja">baja</option>
                    <option value="media">media</option>
                    <option value="alta">alta</option>
                  </AppSelect>
                  {requiresFincaTarget ? (
                    <>
                      <div className="md:col-span-2 rounded-[var(--radius-lg)] border border-[color:var(--border-shell)] bg-[color:var(--surface-muted)] px-4 py-3">
                        <p className="text-sm font-semibold text-[color:var(--text-on-dark)]">
                          Destino obligatorio de finca
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-[color:var(--text-on-dark-muted)]">
                          Esta orden necesita finca y cuartel para que el operario sepa exactamente dónde ejecutarla.
                        </p>
                      </div>
                      <AppSelect
                        value={form.fincaId}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, fincaId: e.target.value, cuartelId: "" }))
                        }
                      >
                        <option value="">Seleccionar finca</option>
                        {fincas.map((finca) => {
                          const id = String(finca.finca_id ?? finca.id ?? "");
                          const label = finca.nombre ?? finca.nombre_finca ?? finca.name ?? "Finca";
                          return (
                            <option key={id} value={id}>
                              {label}
                            </option>
                          );
                        })}
                      </AppSelect>
                      <AppSelect
                        value={form.cuartelId}
                        onChange={(e) => setForm((prev) => ({ ...prev, cuartelId: e.target.value }))}
                        disabled={!form.fincaId}
                      >
                        <option value="">Seleccionar cuartel</option>
                        {cuartelOptions.map((cuartel) => {
                          const id = String(cuartel.cuartel_id ?? cuartel.id ?? "");
                          return (
                            <option key={id} value={id}>
                              {cuartel.codigo_cuartel}
                            </option>
                          );
                        })}
                      </AppSelect>
                    </>
                  ) : null}
                  <AppSelect
                    value={form.assigneeKey}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, assigneeKey: e.target.value }))
                    }
                  >
                    <option value="">Asignar a... (opcional)</option>
                    {assigneeOptions.length > 0 ? (
                      <>
                        <optgroup label="Con cuenta">
                          {assigneeOptions.filter((o) => o.hasAccount).map((o) => (
                            <option key={o.key} value={o.key}>{o.label}</option>
                          ))}
                        </optgroup>
                        <optgroup label="Sin cuenta (operarios de campo)">
                          {assigneeOptions.filter((o) => !o.hasAccount).map((o) => (
                            <option key={o.key} value={o.key}>{o.label}</option>
                          ))}
                        </optgroup>
                      </>
                    ) : null}
                  </AppSelect>
                  <AppInput
                    type="datetime-local"
                    value={form.fechaFin}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, fechaFin: e.target.value }))
                    }
                  />
                  <AppTextarea
                    value={form.descripcion}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, descripcion: e.target.value }))
                    }
                    placeholder="Descripción (opcional)"
                    className="md:col-span-2"
                    uiSize="lg"
                  />
                </div>
                {managerScope === "bodega" && selectedCatalogTask ? (
                  <div className="mt-6 rounded-[var(--radius-lg)] border border-[color:var(--border-shell)] bg-[color:var(--surface-muted)] p-4 shadow-[var(--shadow-inset-soft)]">
                    <p className="text-sm font-semibold text-[color:var(--text-on-dark)]">
                      Primero creamos la orden de trabajo
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-[color:var(--text-on-dark-muted)]">
                      La carga operativa se completa al abrir la orden asignada. De esta forma no mezclamos
                      la planificación del trabajo con el registro técnico de recepción, vasijas, cortes o despacho.
                    </p>
                  </div>
                ) : null}
                <div className="mt-6">
                  <AppButton type="button" onClick={() => void onCreate()} disabled={saving} loading={saving}>
                  {saving ? "Guardando..." : "Registrar orden de trabajo"}
                  </AppButton>
                </div>
              </>
            ) : null}
          </AppCard>
        ) : isManagerMode ? (
          <AppCard
            as="section"
            tone="default"
            padding="lg"
            header={<h2 className="text-lg font-semibold text-text">Sin permisos de encargado</h2>}
          >
            <p className="text-xs text-text-secondary">
              Para asignar tareas necesitás rol de encargado de finca o de bodega.
            </p>
          </AppCard>
        ) : (
         <></>
        )}

        {error ? <NoticeBanner tone="danger">{error}</NoticeBanner> : null}
        {notice ? <NoticeBanner tone="success">{notice}</NoticeBanner> : null}

        <AppCard
          as="section"
          tone="default"
          padding="lg"
          header={(
            <div className="space-y-4">
              <SectionIntro
                title={ordersView === "pending" ? "Pendientes" : "Completadas"}
                description={
                  ordersView === "pending"
                    ? isManagerMode
                      ? "Seguimiento de órdenes creadas y registros pendientes por completar."
                      : "Tus órdenes activas, listas para registrar avances y finalizarlas."
                    : "Historial reciente de trabajos cerrados para revisar qué ya quedó resuelto."
                }
              />
              {isManagerMode && activeBodegaId ? (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setOrdersView("pending")}
                    className={[
                      "inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-md)] border px-3 py-2 text-xs font-semibold shadow-[var(--shadow-inset-soft)] transition-all duration-[var(--motion-fast)] ease-[var(--motion-standard)]",
                      ordersView === "pending"
                        ? "border-[color:var(--border-default)] bg-[color:var(--action-primary-bg)] text-[color:var(--text-primary)]"
                        : "border-[color:var(--border-shell)] bg-[color:var(--action-secondary-bg)] text-[color:var(--text-on-dark-muted)] hover:border-[color:var(--border-default)] hover:bg-[color:var(--action-secondary-hover)] hover:text-[color:var(--text-on-dark)]",
                    ].join(" ")}
                  >
                    Pendientes
                    <span className="rounded-full bg-[color:var(--surface-muted)] px-2 py-0.5 text-[11px] text-[color:var(--text-on-dark)]">
                      {loading ? "..." : tasks.length}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrdersView("completed")}
                    className={[
                      "inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-md)] border px-3 py-2 text-xs font-semibold shadow-[var(--shadow-inset-soft)] transition-all duration-[var(--motion-fast)] ease-[var(--motion-standard)]",
                      ordersView === "completed"
                        ? "border-[color:var(--border-default)] bg-[color:var(--action-primary-bg)] text-[color:var(--text-primary)]"
                        : "border-[color:var(--border-shell)] bg-[color:var(--action-secondary-bg)] text-[color:var(--text-on-dark-muted)] hover:border-[color:var(--border-default)] hover:bg-[color:var(--action-secondary-hover)] hover:text-[color:var(--text-on-dark)]",
                    ].join(" ")}
                  >
                    Completadas
                    <span className="rounded-full bg-[color:var(--surface-muted)] px-2 py-0.5 text-[11px] text-[color:var(--text-on-dark)]">
                      {completedLoading ? "..." : completedTasks.length}
                    </span>
                  </button>
                </div>
              ) : null}
            </div>
          )}
        >
          <div>
          {ordersView === "pending" ? loading ? (
            <NoticeBanner tone="info">Cargando tareas…</NoticeBanner>
          ) : tasks.length === 0 ? (
            <GuidedState
              title="No hay órdenes pendientes"
              description={
                isManagerMode
                  ? "Cuando crees una orden de trabajo, aparecerá acá para seguir su estado y completar el registro operativo."
                  : "Cuando te asignen una orden, aparecerá en este espacio con la acción correspondiente."
              }
              action={isManagerMode ? (
                <AppButton
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => setShowCreateForm(true)}
                >
                  Crear orden de trabajo
                </AppButton>
              ) : undefined}
              steps={[
                { label: "Bodega activa", done: true },
                { label: "Órdenes pendientes", done: false },
              ]}
            />
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => {
                const taskId = String(task.tarea_id ?? task.id ?? "");
                const isExpanded = expandedTaskId === taskId;
                const catalogTaskId = getMatchedCatalogTaskId(task.titulo, getEventoTipoForTask(task));
                const targetLabel = getTaskTargetLabel(task);
                return (
                  <AppCard
                    key={taskId}
                    as="article"
                    tone="soft"
                    padding="md"
                    header={(
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-[color:var(--text-ink)]">{task.titulo}</div>
                          <div className="mt-1 text-xs text-[color:var(--text-ink-muted)]">
                            Prioridad: {task.prioridad ?? "media"} · Estado: {task.estado ?? "pendiente"}
                          </div>
                          {task.descripcion && (
                            <div className="mt-1 text-xs text-[color:var(--text-ink)]/80">{task.descripcion}</div>
                          )}
                          {targetLabel ? (
                            <div className="mt-2 inline-flex rounded-full border border-[color:var(--border-shell)] bg-[color:var(--surface-muted)] px-3 py-1 text-[11px] font-semibold text-[color:var(--text-on-dark)]">
                              Destino: {targetLabel}
                            </div>
                          ) : null}
                          {task.fecha_fin && (
                            <div className="mt-1 text-xs text-[color:var(--text-ink-muted)]">Vence: {task.fecha_fin}</div>
                          )}
                        </div>
                        <AppButton
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            if (isExpanded) {
                              setExpandedTaskId(null);
                            } else {
                              openExpandedTask(taskId, task);
                            }
                          }}
                        >
                          {isExpanded ? "Cerrar" : "Abrir orden de trabajo"}
                        </AppButton>
                      </div>
                    )}
                  >
                    {isExpanded && (() => {
                      const eventoTipo = getEventoTipoForTask(task);
                      const catalogId = catalogTaskId ?? (eventoTipo ? getMatchedCatalogTaskId(task.titulo, eventoTipo) : null);
                      const eventoConfig = eventoTipo ? EVENTO_CONFIG[eventoTipo] : null;
                      return (
                        <div className="rounded-[var(--radius-lg)] border border-[color:var(--border-shell)] bg-[color:var(--surface-muted)] p-4 shadow-[var(--shadow-inset-soft)]">
                          {catalogId ? (
                            <div className="space-y-3">
                              <div>
                                <h4 className="text-sm font-semibold text-[color:var(--text-on-dark)]">
                                  Registro operativo separado
                                </h4>
                                <p className="mt-1 text-xs leading-relaxed text-[color:var(--text-on-dark-muted)]">
                                  Esta orden corresponde a{" "}
                                  {OPERACION_TASK_TEMPLATES.find((template) => template.id === catalogId)?.label ??
                                    "una actividad operativa"}
                                  . La carga técnica se completa desde Registro operativo para mantener un solo lugar de verdad.
                                </p>
                              </div>
                              <Link to={OPERACION_TASK_ROUTES[catalogId] ?? "/operacion/recepcion"}>
                                <AppButton type="button" variant="secondary" size="sm">
                                  Ir a registro operativo
                                </AppButton>
                              </Link>
                            </div>
                          ) : eventoConfig ? (
                            <div className="space-y-3">
                              <h4 className="text-sm font-semibold text-[color:var(--text-ink)]">
                                {eventoConfig.label}
                              </h4>

                              {expandedTaskEntriesLoading ? (
                                <p className="text-[11px] text-[color:var(--text-ink-muted)]">Cargando registros…</p>
                              ) : expandedTaskEntries.length > 0 ? (
                                <div className="rounded-[var(--radius-md)] border border-[color:var(--feedback-success-border)] bg-[color:var(--feedback-success-bg)] p-2">
                                  <p className="mb-1 text-[11px] font-semibold text-[color:var(--feedback-success-text)]">
                                    Registros guardados ({expandedTaskEntries.length})
                                  </p>
                                  {expandedTaskEntries.map((entry, i) => (
                                    <div
                                      key={entry.entradaId ?? i}
                                      className="mt-1 rounded-[var(--radius-sm)] border border-[color:var(--feedback-success-border)] bg-[color:var(--feedback-success-bg)] px-2 py-1 text-[11px] text-[color:var(--feedback-success-text)]"
                                    >
                                      #{i + 1} · {new Date(entry.fecha).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                                      {entry.creadoPor?.nombre ? ` · ${entry.creadoPor.nombre}` : ""}
                                      {entry.descripcion ? <span className="ml-1 text-[color:var(--feedback-success)]">— {entry.descripcion}</span> : null}
                                    </div>
                                  ))}
                                </div>
                              ) : null}

                              {eventoConfig.fields.map((field) => (
                                <div key={field.name}>
                                  {field.type === "textarea" ? (
                                    <AppTextarea
                                      label={`${field.label}${field.required ? " *" : ""}`}
                                      uiSize="lg"
                                      value={expandedTaskForm[field.name] ?? ""}
                                      onChange={(e) => setExpandedTaskForm((prev) => ({ ...prev, [field.name]: e.target.value }))}
                                      placeholder={field.placeholder}
                                    />
                                  ) : field.type === "select" ? (
                                    <AppSelect
                                      label={`${field.label}${field.required ? " *" : ""}`}
                                      value={expandedTaskForm[field.name] ?? ""}
                                      onChange={(e) => setExpandedTaskForm((prev) => ({ ...prev, [field.name]: e.target.value }))}
                                    >
                                      <option value="">{field.required ? "Seleccionar..." : "Sin especificar"}</option>
                                      {getEventoFieldOptions(field).map((opt) => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                      ))}
                                    </AppSelect>
                                  ) : field.type === "user_select" ? (
                                    <AppSelect
                                      label={`${field.label}${field.required ? " *" : ""}`}
                                      value={expandedTaskForm[field.name] ?? ""}
                                      onChange={(e) => setExpandedTaskForm((prev) => ({ ...prev, [field.name]: e.target.value }))}
                                    >
                                      <option value="">Sin especificar</option>
                                      {operariosCampo.map((op) => (
                                        <option key={op.user_id} value={op.user_id}>{op.nombre}</option>
                                      ))}
                                    </AppSelect>
                                  ) : (
                                    <AppInput
                                      label={`${field.label}${field.required ? " *" : ""}`}
                                      type={field.type}
                                      step={field.step}
                                      value={expandedTaskForm[field.name] ?? ""}
                                      onChange={(e) => setExpandedTaskForm((prev) => ({ ...prev, [field.name]: e.target.value }))}
                                      placeholder={field.placeholder}
                                    />
                                  )}
                                </div>
                              ))}

                              {expandedTaskError ? (
                                <NoticeBanner tone="danger" className="text-xs">
                                  {expandedTaskError}
                                </NoticeBanner>
                              ) : null}
                              {expandedTaskNotice ? (
                                <NoticeBanner tone="success" className="text-xs">
                                  {expandedTaskNotice}
                                </NoticeBanner>
                              ) : null}

                              <div className="flex flex-wrap items-center gap-2 pt-1">
                                <AppButton
                                  type="button"
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => void onSubmitTaskEvent(task)}
                                  disabled={expandedTaskSaving}
                                  loading={expandedTaskSaving}
                                >
                                  {expandedTaskSaving ? "Guardando..." : expandedTaskEntries.length > 0 ? "Registrar otro" : "Registrar"}
                                </AppButton>
                                <AppButton
                                  type="button"
                                  variant="primary"
                                  size="sm"
                                  onClick={() => void onFinalizeTask(task)}
                                  disabled={expandedTaskFinalizing || expandedTaskSaving}
                                  loading={expandedTaskFinalizing}
                                >
                                  {expandedTaskFinalizing ? "Finalizando..." : "Finalizar tarea"}
                                </AppButton>
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-[color:var(--text-ink-muted)]">
                              Tipo de actividad no soportado todavía.
                            </p>
                          )}
                        </div>
                      );
                    })()}

                    {canRenderManagerFlow && (
                      <div className="mt-3">
                        <AppButton
                          type="button"
                          variant="danger"
                          size="sm"
                          onClick={() => void onDeleteTask(task)}
                          disabled={deletingTaskId === taskId}
                          loading={deletingTaskId === taskId}
                        >
                          {deletingTaskId === taskId ? "Eliminando..." : "Eliminar tarea"}
                        </AppButton>
                      </div>
                    )}
                  </AppCard>
                );
              })}
            </div>
          ) : completedLoading ? (
            <NoticeBanner tone="info">Cargando órdenes completadas…</NoticeBanner>
          ) : completedTasks.length === 0 ? (
            <GuidedState
              title="Todavía no hay órdenes completadas"
              description="Cuando una orden se finalice, aparecerá en este historial para que el equipo pueda auditar el trabajo cerrado."
              steps={[
                { label: "Pendientes bajo control", done: tasks.length === 0 },
                { label: "Historial operativo", done: false },
              ]}
            />
          ) : (
            <div className="max-h-[32rem] space-y-3 overflow-y-auto pr-1">
              {completedTasks.map((task) => {
                const taskId = String(task.tarea_id ?? task.id ?? "");
                const completedAt = getTaskCompletedDate(task);
                const assigneeCount = task.tarea_asignacion?.length ?? 0;
                return (
                  <AppCard
                    key={taskId}
                    as="article"
                    tone="soft"
                    padding="md"
                    className="border-[color:var(--feedback-success-border)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[color:var(--text-ink)]">
                          {task.titulo}
                        </p>
                        <p className="mt-1 text-xs text-[color:var(--text-ink-muted)]">
                          Cerrada: {formatTaskDate(completedAt)}
                        </p>
                        {task.descripcion ? (
                          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-[color:var(--text-ink)]/75">
                            {task.descripcion}
                          </p>
                        ) : null}
                      </div>
                      <span className="shrink-0 rounded-full border border-[color:var(--feedback-success-border)] bg-[color:var(--feedback-success-bg)] px-3 py-1 text-[11px] font-semibold text-[color:var(--feedback-success-text)]">
                        Completada
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-[color:var(--text-ink-muted)]">
                      <span>Prioridad: {task.prioridad ?? "media"}</span>
                      <span>Asignaciones: {assigneeCount}</span>
                    </div>
                  </AppCard>
                );
              })}
            </div>
          )}
          </div>
        </AppCard>
      </div>
    </div>
  );
};

export default Tareas;
