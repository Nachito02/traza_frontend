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
  useAppNotifications,
} from "../../components/ui";
import {
  fetchProtocoloById,
  fetchProtocolosExpanded,
  type ProtocoloExpanded,
} from "../../features/protocolos/api";
import { resolveModuleAccess } from "../../lib/permissions";
import { EVENTO_CONFIG } from "../Trazabilidad/eventoConfig";
import {
  fetchTareaAsignacionDetail,
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
  { value: "recepcion", label: "Ingreso de uva" },
  { value: "vasijas", label: "Vasijas y Proceso" },
  { value: "cortes", label: "Cortes y Producto" },
  { value: "fraccionamiento", label: "Fraccionamiento y Despacho" },
  { value: "qr", label: "Producto y Trazabilidad" },
];

const OPERACION_TASK_TEMPLATES: OperacionTaskTemplate[] = [
  { id: "remito_uva", categoria: "recepcion", titulo: "Remito Uva", label: "Remito Uva" },
  { id: "recepcion_bodega", categoria: "recepcion", titulo: "Recepción Bodega", label: "Recepción Bodega" },
  { id: "analisis_recepcion", categoria: "recepcion", titulo: "Análisis Recepción", label: "Análisis Recepción" },
  { id: "ciu", categoria: "recepcion", titulo: "CIU", label: "CIU" },
  { id: "ciu_recepcion", categoria: "recepcion", titulo: "CIU-Recepción", label: "CIU-Recepción" },
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
  ciu: "/operacion/recepcion?paso=ciu",
  ciu_recepcion: "/operacion/recepcion?paso=ciu",
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

function getActivityDate(task: Tarea): number {
  const candidates: number[] = [];
  for (const a of task.tarea_asignacion ?? []) {
    if (a.completed_at) candidates.push(new Date(a.completed_at).getTime());
  }
  if (task.updated_at) candidates.push(new Date(task.updated_at).getTime());
  if (task.created_at) candidates.push(new Date(task.created_at).getTime());
  return candidates.length > 0 ? Math.max(...candidates) : 0;
}

type TareasProps = {
  mode?: "manager" | "operator";
};

const Tareas = ({ mode = "operator" }: TareasProps) => {
  const user = useAuthStore((state) => state.user);
  const bodegas = useAuthStore((state) => state.bodegas);
  const activeBodegaId = useAuthStore((state) => state.activeBodegaId);
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
  const [timelineExpandedId, setTimelineExpandedId] = useState<string | null>(null);
  const [timelineEntriesMap, setTimelineEntriesMap] = useState<Record<string, TareaEntradaDetail[]>>({});
  const [timelineLoadingMap, setTimelineLoadingMap] = useState<Record<string, boolean>>({});
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [completedLoading, setCompletedLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { notifySuccess, notifyError } = useAppNotifications();
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
    const normalize = (s: string | null | undefined) =>
      String(s ?? "").toLowerCase().trim();

    if (task.proceso_id) {
      const inProtocol = protocolProcesses.find(
        (p) => p.proceso_id === String(task.proceso_id),
      );
      if (inProtocol?.evento_tipo) return normalize(inProtocol.evento_tipo);

      const inOptions = protocoloTaskOptions.find((opt) =>
        opt.value.endsWith(`:${task.proceso_id}`),
      );
      if (inOptions?.eventoTipo) return normalize(inOptions.eventoTipo);
    }

    // Last-resort: infer from task title so tasks created without a matching
    // active protocol still show their form (e.g. protocol was switched).
    const titleNorm = normalize(task.titulo).replace(/[\s_-]+/g, "_");
    const exactMatch = Object.keys(EVENTO_CONFIG).find(
      (k) => titleNorm === k || titleNorm.startsWith(k) || k.startsWith(titleNorm),
    );
    return exactMatch ?? null;
  };

  const openTimelineTask = (taskId: string, task: Tarea) => {
    if (timelineExpandedId === taskId) {
      setTimelineExpandedId(null);
      return;
    }
    setTimelineExpandedId(taskId);
    if (timelineEntriesMap[taskId] !== undefined) return;
    const asignacionId = task.tarea_asignacion?.[0]?.tarea_asignacion_id;
    if (!asignacionId) {
      setTimelineEntriesMap((prev) => ({ ...prev, [taskId]: [] }));
      return;
    }
    setTimelineLoadingMap((prev) => ({ ...prev, [taskId]: true }));
    void fetchTareaAsignacionDetail(asignacionId)
      .then((entries) => setTimelineEntriesMap((prev) => ({ ...prev, [taskId]: entries })))
      .catch(() => setTimelineEntriesMap((prev) => ({ ...prev, [taskId]: [] })))
      .finally(() => setTimelineLoadingMap((prev) => ({ ...prev, [taskId]: false })));
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

  const timelineTasks = useMemo(
    () =>
      dedupeTasksById([...tasks, ...completedTasks]).sort(
        (a, b) => getActivityDate(b) - getActivityDate(a),
      ),
    [tasks, completedTasks],
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
          notifySuccess({
            title: "Orden registrada",
            message: assigneeHasAccount
              ? "Orden creada y asignada correctamente."
              : `Orden creada y asignada a ${selectedAssignee?.label ?? "operario"}. Sin cuenta — no recibirá notificación en la app.`,
          });
        } catch (assignError) {
          notifyError({
            title: "Asignación incompleta",
            message: `Orden creada, pero no se pudo confirmar la asignación: ${getApiErrorMessage(assignError)}`,
          });
        }
      } else {
        notifySuccess({
          title: "Orden registrada",
          message: "Se convertirá en tarea al asignar un operario.",
        });
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
    try {
      await deleteTarea(tareaId);
      notifySuccess({ title: "Orden eliminada", message: "La orden de trabajo fue eliminada correctamente." });
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

        {activeBodegaId && timelineTasks.length > 0 ? (
          <AppCard
            as="section"
            tone="default"
            padding="lg"
            header={(
              <div className="flex items-center justify-between gap-3">
                <SectionIntro
                  title="Historial de actividad"
                  description="Todas las tareas ordenadas de más reciente a más antigua."
                />
                <button
                  type="button"
                  onClick={() => setTimelineOpen((v) => !v)}
                  className="shrink-0 rounded-[var(--radius-md)] border border-[color:var(--border-shell)] bg-[color:var(--action-secondary-bg)] px-3 py-1.5 text-xs font-semibold text-[color:var(--text-on-dark-muted)] transition-all duration-[var(--motion-fast)] hover:border-[color:var(--border-default)] hover:text-[color:var(--text-on-dark)]"
                >
                  {timelineOpen ? "Ocultar" : "Mostrar"}
                </button>
              </div>
            )}
          >
            {timelineOpen && (
              <div className="relative mt-2 space-y-1 pl-6">
                <div className="pointer-events-none absolute bottom-2 left-[7px] top-2 w-px bg-[color:var(--border-shell)]" aria-hidden />
                {timelineTasks.map((task) => {
                  const taskId = String(task.tarea_id ?? task.id ?? "");
                  const isExpanded = timelineExpandedId === taskId;
                  const completed = isCompletedTask(task);
                  const pending = !completed;
                  const date = getActivityDate(task);
                  const dateStr = date > 0
                    ? new Date(date).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })
                    : "Sin fecha";
                  const targetLabel = getTaskTargetLabel(task);
                  const entries = timelineEntriesMap[taskId];
                  const isLoading = timelineLoadingMap[taskId] ?? false;
                  const noAsignacion = (task.tarea_asignacion?.length ?? 0) === 0;
                  const estado = normalizeTaskStatus(task.estado ?? "pendiente");

                  return (
                    <div key={taskId} className="relative">
                      <div
                        className={[
                          "absolute -left-6 top-[14px] h-3.5 w-3.5 rounded-full border-2",
                          completed
                            ? "border-[color:var(--feedback-success)] bg-[color:var(--feedback-success)]"
                            : estado === "en_progreso"
                              ? "border-[color:var(--accent-primary)] bg-[color:var(--accent-primary)]"
                              : "border-[color:var(--feedback-warning)] bg-[color:var(--feedback-warning-bg)]",
                        ].join(" ")}
                        aria-hidden
                      />
                      <button
                        type="button"
                        onClick={() => openTimelineTask(taskId, task)}
                        className={[
                          "w-full rounded-[var(--radius-md)] border px-3 py-2.5 text-left transition-all duration-[var(--motion-fast)]",
                          isExpanded
                            ? "rounded-b-none border-b-0 border-[color:var(--border-default)] bg-[color:var(--surface-muted)]"
                            : "border-[color:var(--border-shell)] bg-transparent hover:border-[color:var(--border-default)] hover:bg-[color:var(--surface-muted)]",
                        ].join(" ")}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-[color:var(--text-ink)]">{task.titulo}</p>
                            {targetLabel ? (
                              <p className="mt-0.5 text-[11px] text-[color:var(--text-ink-muted)]">{targetLabel}</p>
                            ) : null}
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-1">
                            <span
                              className={[
                                "rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                                completed
                                  ? "border-[color:var(--feedback-success-border)] bg-[color:var(--feedback-success-bg)] text-[color:var(--feedback-success-text)]"
                                  : estado === "en_progreso"
                                    ? "border-[color:var(--border-default)] bg-[color:var(--surface-muted)] text-[color:var(--text-on-dark)]"
                                    : "border-[color:var(--feedback-warning-border)] bg-[color:var(--feedback-warning-bg)] text-[color:var(--feedback-warning-text)]",
                              ].join(" ")}
                            >
                              {completed ? "Completada" : estado === "en_progreso" ? "En progreso" : "Pendiente"}
                            </span>
                            <span className="text-[11px] text-[color:var(--text-ink-muted)]">{dateStr}</span>
                          </div>
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="rounded-b-[var(--radius-md)] border border-t-0 border-[color:var(--border-default)] bg-[color:var(--surface-muted)] px-3 pb-3 pt-2">
                          {isLoading ? (
                            <p className="text-[11px] text-[color:var(--text-ink-muted)]">Cargando registros…</p>
                          ) : noAsignacion ? (
                            <p className="text-[11px] text-[color:var(--text-ink-muted)]">Sin asignaciones — la tarea todavía no fue tomada.</p>
                          ) : entries === undefined ? (
                            <p className="text-[11px] text-[color:var(--text-ink-muted)]">Sin información disponible.</p>
                          ) : entries.length === 0 ? (
                            <div className="space-y-2">
                              <p className="text-[11px] text-[color:var(--text-ink-muted)]">Sin registros guardados aún.</p>
                              {pending && (
                                <Link
                                  to={Boolean(task.finca_id ?? task.finca?.finca_id) ? `/operacion/campo?tareaId=${taskId}` : "/operacion/recepcion"}
                                  className="text-[11px] font-semibold text-[color:var(--accent-primary)] hover:underline"
                                >
                                  Ir a Registro Operativo →
                                </Link>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <p className="text-[11px] font-semibold text-[color:var(--text-on-dark)]">
                                {entries.length} registro{entries.length !== 1 ? "s" : ""}
                              </p>
                              {entries.map((entry, i) => {
                                const entryContent = (() => {
                                  if (!entry.descripcion) return null;
                                  try {
                                    const json = JSON.parse(entry.descripcion) as unknown;
                                    if (json && typeof json === "object" && !Array.isArray(json)) {
                                      const kvPairs = Object.entries(json as Record<string, unknown>).filter(([, v]) => v !== null && v !== "");
                                      if (kvPairs.length === 0) return null;
                                      return (
                                        <div className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
                                          {kvPairs.map(([k, v]) => (
                                            <div key={k} className="contents">
                                              <span className="capitalize text-[color:var(--text-ink-muted)]">{k.replace(/_/g, " ")}</span>
                                              <span className="text-[color:var(--text-ink)]">{String(v)}</span>
                                            </div>
                                          ))}
                                        </div>
                                      );
                                    }
                                  } catch { /* not JSON */ }
                                  return <p className="mt-1 text-[color:var(--text-ink)]">{entry.descripcion}</p>;
                                })();
                                return (
                                  <div
                                    key={entry.entradaId ?? i}
                                    className="rounded-[var(--radius-sm)] border border-[color:var(--border-shell)] bg-[color:var(--surface-card)] px-2.5 py-2 text-[11px]"
                                  >
                                    <div className="flex items-center justify-between gap-2 text-[color:var(--text-ink-muted)]">
                                      <span>#{i + 1} · {new Date(entry.fecha).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                                      {entry.creadoPor?.nombre && <span>{entry.creadoPor.nombre}</span>}
                                    </div>
                                    {entryContent}
                                  </div>
                                );
                              })}
                              {pending && (
                                <Link
                                  to={Boolean(task.finca_id ?? task.finca?.finca_id) ? `/operacion/campo?tareaId=${taskId}` : "/operacion/recepcion"}
                                  className="mt-1 block text-[11px] font-semibold text-[color:var(--accent-primary)] hover:underline"
                                >
                                  Ir a Registro Operativo →
                                </Link>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </AppCard>
        ) : null}

        {!activeBodegaId ? (
          <GuidedState
            title="Seleccioná una bodega para ver órdenes"
            description="Las órdenes de trabajo se crean y se consultan dentro de una bodega activa. Elegí el contexto para continuar."
            action={(
              <Link to="/contexto">
                <AppButton variant="primary" size="sm">Elegir bodega</AppButton>
              </Link>
            )}
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
                        label="Actividad del protocolo"
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
                    label="Tarea del protocolo"
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
                    label="Prioridad"
                    value={form.prioridad}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        prioridad: e.target.value as "baja" | "media" | "alta",
                      }))
                    }
                  >
                    <option value="baja">Baja</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
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
                        label="Finca"
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
                        label="Cuartel"
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
                    label="Asignar a"
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
                    label="Fecha límite"
                    type="datetime-local"
                    value={form.fechaFin}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, fechaFin: e.target.value }))
                    }
                  />
                  <AppTextarea
                    label="Descripción"
                    value={form.descripcion}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, descripcion: e.target.value }))
                    }
                    placeholder="Opcional"
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
                          onClick={() => setExpandedTaskId(isExpanded ? null : taskId)}
                        >
                          {isExpanded ? "Cerrar" : "Abrir orden de trabajo"}
                        </AppButton>
                      </div>
                    )}
                  >
                    {isExpanded && (() => {
                      const isFincaTask = Boolean(task.finca_id ?? task.finca?.finca_id);
                      const eventoTipo = getEventoTipoForTask(task);
                      const catalogId = catalogTaskId ?? (eventoTipo ? getMatchedCatalogTaskId(task.titulo, eventoTipo) : null);
                      const registroRoute = isFincaTask
                        ? `/operacion/campo?tareaId=${getTaskId(task)}`
                        : catalogId && OPERACION_TASK_ROUTES[catalogId]
                          ? OPERACION_TASK_ROUTES[catalogId]
                          : "/operacion/recepcion";
                      const asignaciones = task.tarea_asignacion ?? [];
                      return (
                        <div className="rounded-[var(--radius-lg)] border border-[color:var(--border-shell)] bg-[color:var(--surface-muted)] p-4 shadow-[var(--shadow-inset-soft)] space-y-3">
                          {asignaciones.length > 0 ? (
                            <div className="space-y-1.5">
                              {asignaciones.map((a) => (
                                <div key={a.tarea_asignacion_id} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px]">
                                  <span className={[
                                    "rounded-full border px-2 py-0.5 font-semibold",
                                    a.estado === "completado"
                                      ? "border-[color:var(--feedback-success-border)] bg-[color:var(--feedback-success-bg)] text-[color:var(--feedback-success-text)]"
                                      : "border-[color:var(--border-shell)] bg-[color:var(--surface-muted)] text-[color:var(--text-on-dark-muted)]",
                                  ].join(" ")}>
                                    {a.estado ?? "pendiente"}
                                  </span>
                                  <span className="text-[color:var(--text-ink-muted)]">Asignada el {new Date(a.assigned_at).toLocaleDateString("es-AR")}</span>
                                  {a.completed_at && (
                                    <span className="text-[color:var(--feedback-success-text)]">
                                      Completada el {new Date(a.completed_at).toLocaleDateString("es-AR")}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[11px] text-[color:var(--text-ink-muted)]">Sin asignaciones todavía.</p>
                          )}
                          <Link to={registroRoute}>
                            <AppButton type="button" variant="secondary" size="sm">
                              Ir a Registro Operativo →
                            </AppButton>
                          </Link>
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
