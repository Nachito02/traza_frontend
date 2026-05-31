import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
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
import { fetchOperariosByBodega } from "../../features/operarios/api";
import { getApiErrorMessage } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import { useOperacionStore } from "../../store/operacionStore";
import { useAppNotifications, useConfirmDialog } from "../../components/ui";
import {
  fetchProtocoloById,
  fetchProtocolosExpanded,
  type ProtocoloExpanded,
} from "../../features/protocolos/api";
import { resolveModuleAccess } from "../../lib/permissions";
import { EVENTO_CONFIG } from "../Trazabilidad/eventoConfig";
import {
  BODEGA_MANAGER_ROLES,
  FINCA_MANAGER_ROLES,
  FINCA_PRODUCCION_EVENT_TYPES,
  GLOBAL_MANAGER_ROLES,
  OPERACION_CATEGORY_OPTIONS,
  OPERACION_SCOPE_STORAGE_KEY,
  OPERACION_TASK_TEMPLATES,
  OPERATOR_ROLES,
  type OperacionCategoria,
  type OperacionTaskTemplate,
  type ProtocoloTaskOption,
} from "./tareas.constants";
import {
  dedupeTasksById,
  getDefaultTaskForCategory,
  getTaskCompletedDate,
  includesAnyRole,
  isCompletedTask,
  isFincaProductionOption,
  isPendingTask,
  isSetupOnlyProtocolItem,
  normalizeRoles,
} from "./tareas.helpers";
import type {
  AssigneeOption,
  FormState,
  GroupedProtocoloTaskOption,
  GroupedProtocolProcess,
  ProtocolProcess,
} from "./components/CreateOrderForm";

// ─── Valor inicial del formulario ─────────────────────────────────────────────

const INITIAL_FORM: FormState = {
  tareaProtocolo: "",
  tareaCatalogoId: "",
  categoriaOperacion: "recepcion",
  selectedProcesoId: "",
  titulo: "",
  descripcion: "",
  fechaFin: "",
  prioridad: "media",
  fincaId: "",
  cuartelId: "",
  assigneeKey: "",
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export type UseTareasDataReturn = {
  // Usuario / autenticación
  user: ReturnType<typeof useAuthStore.getState>["user"];
  activeBodegaId: ReturnType<typeof useAuthStore.getState>["activeBodegaId"];
  isManagerMode: boolean;
  canRenderManagerFlow: boolean;
  managerScope: "finca" | "bodega";

  // Formulario de creación
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;

  // Tareas
  tasks: Tarea[];
  completedTasks: Tarea[];
  loading: boolean;
  completedLoading: boolean;
  saving: boolean;
  error: string | null;
  deletingTaskId: string | null;

  // Fincas y cuarteles
  fincas: ReturnType<typeof useFincasStore.getState>["fincas"];
  cuartelOptions: Cuartel[];

  // Asignación
  assigneeOptions: AssigneeOption[];

  // Protocolo
  activeProtocolo: ProtocoloExpanded | null;
  protocolProcesses: ProtocolProcess[];
  groupedProtocolProcesses: GroupedProtocolProcess[];
  scopedProtocoloTaskOptions: ProtocoloTaskOption[];
  groupedProtocoloTaskOptions: GroupedProtocoloTaskOption[];
  requiresFincaTarget: boolean;
  selectedCatalogTask: OperacionTaskTemplate | null;
  getEventoTipoForTask: (task: Tarea) => string | null;

  // Acciones
  refreshTasks: () => Promise<void>;
  refreshCompletedTasks: () => Promise<void>;
  onCreate: () => Promise<void>;
  onDeleteTask: (task: Tarea) => Promise<void>;

  // Confirm dialog
  confirmDialog: React.ReactElement;
};

export function useTareasData(mode: "manager" | "operator"): UseTareasDataReturn {
  const { confirm, ConfirmDialog } = useConfirmDialog();

  // ── Stores ────────────────────────────────────────────────────────────────
  const user = useAuthStore((state) => state.user);
  const bodegas = useAuthStore((state) => state.bodegas);
  const activeBodegaId = useAuthStore((state) => state.activeBodegaId);
  const loadFincas = useFincasStore((state) => state.loadFincas);
  const fincas = useFincasStore((state) => state.fincas);
  const { activeProtocoloId } = useOperacionStore();
  const { notifySuccess, notifyError } = useAppNotifications();
  const [searchParams] = useSearchParams();

  // ── Estado local ──────────────────────────────────────────────────────────
  const [cuartelesByFinca, setCuartelesByFinca] = useState<Record<string, Cuartel[]>>({});
  const [operarios, setOperarios] = useState<AuthUser[]>([]);
  const [operariosCampo, setOperariosCampo] = useState<Awaited<ReturnType<typeof fetchOperariosByBodega>>>([]);
  const [tasks, setTasks] = useState<Tarea[]>([]);
  const [completedTasks, setCompletedTasks] = useState<Tarea[]>([]);
  const [protocoloTaskOptions, setProtocoloTaskOptions] = useState<ProtocoloTaskOption[]>([]);
  const [canManageTasks, setCanManageTasks] = useState(false);
  const [forceMineMode, setForceMineMode] = useState(true);
  const [activeProtocolo, setActiveProtocolo] = useState<ProtocoloExpanded | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [completedLoading, setCompletedLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);

  // ── Cálculo de roles y scope ──────────────────────────────────────────────
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

  const hasFincaManagerRole = useMemo(() => {
    const userAny = (user ?? {}) as {
      fincas?: Array<{ roles_en_finca?: unknown; rol_en_finca?: unknown }>;
    };
    const fincaRoles = (userAny.fincas ?? []).flatMap((finca) =>
      normalizeRoles([finca.roles_en_finca, finca.rol_en_finca]),
    );
    return (
      includesAnyRole(userRoles, FINCA_MANAGER_ROLES) ||
      includesAnyRole(activeBodegaRoles, FINCA_MANAGER_ROLES) ||
      includesAnyRole(fincaRoles, FINCA_MANAGER_ROLES)
    );
  }, [activeBodegaRoles, user, userRoles]);

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

  // ── Catálogo ──────────────────────────────────────────────────────────────
  const selectedCatalogTask = useMemo(
    () => OPERACION_TASK_TEMPLATES.find((task) => task.id === form.tareaCatalogoId) ?? null,
    [form.tareaCatalogoId],
  );

  // ── Tareas: carga y refresco ──────────────────────────────────────────────
  const refreshTasks = useCallback(async () => {
    if (!activeBodegaId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPendientesByScope({
        bodegaId: String(activeBodegaId),
        fincaId: form.fincaId || undefined,
        mode: forceMineMode ? "mine" : "scope",
      });
      setTasks(
        dedupeTasksById(data ?? [])
          .filter(isPendingTask)
          .sort((a, b) => {
            const aDate = a.fecha_fin ? new Date(a.fecha_fin).getTime() : Infinity;
            const bDate = b.fecha_fin ? new Date(b.fecha_fin).getTime() : Infinity;
            return aDate - bDate;
          }),
      );
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [activeBodegaId, forceMineMode, form.fincaId]);

  const refreshCompletedTasks = useCallback(async () => {
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
  }, [activeBodegaId]);

  // ── Effects: datos principales ────────────────────────────────────────────
  useEffect(() => {
    if (!activeBodegaId) return;
    void loadFincas(activeBodegaId);
  }, [activeBodegaId, loadFincas]);

  useEffect(() => {
    if (!activeBodegaId) return;
    void refreshTasks();
    void refreshCompletedTasks();
  }, [activeBodegaId, forceMineMode, refreshTasks, refreshCompletedTasks]);

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
    return () => { mounted = false; };
  }, [canManageByRole, mode]);

  // ── Effect: pre-populate form desde query params ──────────────────────────
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

  // ── Effect: cuarteles de la finca seleccionada ────────────────────────────
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

  // ── Effect: usuarios con cuentas (para asignar) ───────────────────────────
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
              return includesAnyRole(roleList, ["operador_campo", "operario_campo", "operario_finca"]);
            }
            return includesAnyRole(roleList, OPERATOR_ROLES);
          }),
        );
        setOperarios(list);
      })
      .catch(() => { setOperarios([]); });
  }, [activeBodega?.nombre, activeBodegaId, canManageTasks, managerScope]);

  // ── Effect: operarios de campo ────────────────────────────────────────────
  useEffect(() => {
    if (!canManageTasks || !activeBodegaId) {
      setOperariosCampo([]);
      return;
    }
    fetchOperariosByBodega(activeBodegaId)
      .then((data) => setOperariosCampo((data ?? []).filter((p) => p.is_active !== false)))
      .catch(() => setOperariosCampo([]));
  }, [activeBodegaId, canManageTasks]);

  // ── Opciones de asignación ────────────────────────────────────────────────
  const cuartelOptions = useMemo(
    () => cuartelesByFinca[form.fincaId] ?? [],
    [cuartelesByFinca, form.fincaId],
  );

  const assigneeOptions = useMemo<AssigneeOption[]>(() => {
    const fromOperarios: AssigneeOption[] = operariosCampo.map((op) => ({
      key: `op:${op.user_id}`,
      label: op.email
        ? `${op.nombre} (${op.email})`
        : `${op.nombre}${op.whatsapp_e164 ? ` · ${op.whatsapp_e164}` : ""}`,
      userId: op.user_id,
      hasAccount: op.email !== null,
    }));
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

  // ── Effect: opciones de protocolo (todas) ─────────────────────────────────
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
            value, label, titulo, eventoTipo, etapaLabel, protocoloLabel, ordenEtapa, ordenProceso,
          }));
        setProtocoloTaskOptions(options);
      })
      .catch(() => { if (mounted) setProtocoloTaskOptions([]); });
    return () => { mounted = false; };
  }, []);

  // ── Effect: protocolo activo (bodega scope) ───────────────────────────────
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

  // ── Procesos del protocolo activo ─────────────────────────────────────────
  const protocolProcesses = useMemo<ProtocolProcess[]>(() => {
    if (!activeProtocolo) return [];
    return (activeProtocolo.protocolo_etapa ?? []).flatMap((etapa) =>
      (etapa.protocolo_proceso ?? []).flatMap((proceso) => {
        const item: ProtocolProcess = {
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

  const groupedProtocolProcesses = useMemo<GroupedProtocolProcess[]>(() => {
    const groups = new Map<string, GroupedProtocolProcess>();
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

  // ── Función: tipo de evento para una tarea dada ────────────────────────────
  const getEventoTipoForTask = useCallback((task: Tarea): string | null => {
    const normalize = (s: string | null | undefined) => String(s ?? "").toLowerCase().trim();
    if (task.proceso_id) {
      const inProtocol = protocolProcesses.find((p) => p.proceso_id === String(task.proceso_id));
      if (inProtocol?.evento_tipo) return normalize(inProtocol.evento_tipo);
      const inOptions = protocoloTaskOptions.find((opt) =>
        opt.value.endsWith(`:${task.proceso_id}`),
      );
      if (inOptions?.eventoTipo) return normalize(inOptions.eventoTipo);
    }
    const titleNorm = normalize(task.titulo).replace(/[\s_-]+/g, "_");
    const exactMatch = Object.keys(EVENTO_CONFIG).find(
      (k) => titleNorm === k || titleNorm.startsWith(k) || k.startsWith(titleNorm),
    );
    return exactMatch ?? null;
  }, [protocolProcesses, protocoloTaskOptions]);

  // ── Opciones de protocolo filtradas por scope ─────────────────────────────
  const scopedProtocoloTaskOptions = useMemo(
    () =>
      protocoloTaskOptions.filter((option) =>
        managerScope === "finca"
          ? isFincaProductionOption(option)
          : !isFincaProductionOption(option),
      ),
    [managerScope, protocoloTaskOptions],
  );

  const groupedProtocoloTaskOptions = useMemo<GroupedProtocoloTaskOption[]>(() => {
    const groups = new Map<string, GroupedProtocoloTaskOption>();
    scopedProtocoloTaskOptions.forEach((option) => {
      const groupKey = option.etapaLabel || "Sin etapa";
      const current = groups.get(groupKey);
      if (current) {
        current.options.push(option);
        return;
      }
      groups.set(groupKey, { label: groupKey, orden: option.ordenEtapa, options: [option] });
    });
    return Array.from(groups.values())
      .sort((a, b) => a.orden - b.orden)
      .map((group) => ({ ...group, options: group.options.sort((a, b) => a.ordenProceso - b.ordenProceso) }));
  }, [scopedProtocoloTaskOptions]);

  // ── Effect: limpiar selección de protocolo inválida ───────────────────────
  useEffect(() => {
    if (!form.tareaProtocolo) return;
    const stillAvailable = scopedProtocoloTaskOptions.some(
      (option) => option.value === form.tareaProtocolo,
    );
    if (stillAvailable) return;
    setForm((prev) => ({ ...prev, tareaProtocolo: "", titulo: "" }));
  }, [form.tareaProtocolo, scopedProtocoloTaskOptions]);

  // ── Acciones ──────────────────────────────────────────────────────────────
  const onCreate = async () => {
    if (!activeBodegaId) { setError("Seleccioná una bodega activa."); return; }
    if (managerScope === "bodega" && activeProtocolo && !form.selectedProcesoId) {
      setError("Seleccioná una actividad del protocolo."); return;
    }
    if (managerScope === "bodega" && !activeProtocolo && !form.tareaCatalogoId) {
      setError("Seleccioná un protocolo activo o una tarea operativa."); return;
    }
    if (managerScope === "finca" && !form.tareaProtocolo) {
      setError("Seleccioná una tarea del protocolo."); return;
    }
    if (requiresFincaTarget && (!form.fincaId || !form.cuartelId)) {
      setError("Seleccioná finca y cuartel para indicar dónde se debe ejecutar la orden."); return;
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
        ...INITIAL_FORM,
        fincaId: requiresFincaTarget ? prev.fincaId : "",
        cuartelId: requiresFincaTarget ? prev.cuartelId : "",
      }));
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
    if (!tareaId) { setError("No se pudo determinar el ID de la tarea."); return; }
    const ok = await confirm(`¿Eliminar/cancelar la tarea "${task.titulo}"?`);
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

  // ── Return ────────────────────────────────────────────────────────────────
  return {
    user,
    activeBodegaId,
    isManagerMode,
    canRenderManagerFlow,
    managerScope,
    form,
    setForm,
    tasks,
    completedTasks,
    loading,
    completedLoading,
    saving,
    error,
    deletingTaskId,
    fincas,
    cuartelOptions,
    assigneeOptions,
    activeProtocolo,
    protocolProcesses,
    groupedProtocolProcesses,
    scopedProtocoloTaskOptions,
    groupedProtocoloTaskOptions,
    requiresFincaTarget,
    selectedCatalogTask,
    getEventoTipoForTask,
    refreshTasks,
    refreshCompletedTasks,
    onCreate,
    onDeleteTask,
    confirmDialog: ConfirmDialog,
  };
}
