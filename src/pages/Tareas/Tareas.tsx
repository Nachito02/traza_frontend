import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { fetchCuartelesByFinca, type Cuartel } from "../../features/cuarteles/api";
import { useFincasStore } from "../../features/fincas/store";
import {
  assignEncargoToUser,
  createEncargo,
  deleteEncargo,
  fetchCanManageEncargos,
  fetchPendientesByScope,
  type Encargo,
} from "../../features/encargos/api";
import { fetchAuthUsers, type AuthUser } from "../../features/users/api";
import { getApiErrorMessage } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import { fetchProtocolosExpanded, type ProtocoloExpanded } from "../../features/protocolos/api";
import { resolveModuleAccess } from "../../lib/permissions";

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

function isFincaProductionOption(option: ProtocoloTaskOption) {
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

const Tareas = () => {
  const user = useAuthStore((state) => state.user);
  const bodegas = useAuthStore((state) => state.bodegas);
  const activeBodegaId = useAuthStore((state) => state.activeBodegaId);
  const loadFincas = useFincasStore((state) => state.loadFincas);
  const fincas = useFincasStore((state) => state.fincas);
  const [cuartelesByFinca, setCuartelesByFinca] = useState<Record<string, Cuartel[]>>({});
  const [operarios, setOperarios] = useState<AuthUser[]>([]);
  const [tasks, setTasks] = useState<Encargo[]>([]);
  const [protocoloTaskOptions, setProtocoloTaskOptions] = useState<ProtocoloTaskOption[]>([]);
  const [canManageTasks, setCanManageTasks] = useState(false);
  const [forceMineMode, setForceMineMode] = useState(true);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [form, setForm] = useState({
    tareaProtocolo: "",
    titulo: "",
    descripcion: "",
    fechaObjetivo: "",
    prioridad: "media" as "baja" | "media" | "alta",
    milestoneId: "",
    fincaId: "",
    cuartelId: "",
    operarioUserId: "",
  });
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
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
      setTasks(data ?? []);
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!activeBodegaId) return;
    void loadFincas(activeBodegaId);
  }, [activeBodegaId, loadFincas]);

  useEffect(() => {
    if (!activeBodegaId) return;
    void refreshTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBodegaId]);

  useEffect(() => {
    let mounted = true;
    void fetchCanManageEncargos().then((canManageFromApi) => {
      if (!mounted) return;
      const resolvedCanManage = Boolean(canManageFromApi || canManageByRole);
      setCanManageTasks(resolvedCanManage);
      setForceMineMode(!resolvedCanManage);
    });
    return () => {
      mounted = false;
    };
  }, [canManageByRole]);

  useEffect(() => {
    const milestoneId = searchParams.get("milestoneId");
    const productoId = searchParams.get("productoId");
    if (!milestoneId && !productoId) return;
    setForm((prev) => ({
      ...prev,
      milestoneId: milestoneId ?? prev.milestoneId,
      titulo:
        prev.titulo ||
        (productoId
          ? `Tarea de producto ${productoId.slice(0, 8)}`
          : "Tarea de milestone"),
    }));
  }, [searchParams]);

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
    if (!activeBodegaId) return;
    void refreshTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forceMineMode]);

  const cuartelOptions = useMemo(
    () => cuartelesByFinca[form.fincaId] ?? [],
    [cuartelesByFinca, form.fincaId],
  );

  useEffect(() => {
    let mounted = true;
    fetchProtocolosExpanded()
      .then((data) => {
        if (!mounted) return;
        const options = (data ?? [])
          .flatMap((protocolo: ProtocoloExpanded) =>
            (protocolo.protocolo_etapa ?? []).flatMap((etapa) =>
              (etapa.protocolo_proceso ?? []).map((proceso) => {
                const protocoloId = String(protocolo.protocolo_id ?? protocolo.id ?? "protocolo");
                const etapaId = String(etapa.etapa_id ?? etapa.nombre ?? "etapa");
                const procesoId = String(proceso.proceso_id ?? proceso.nombre ?? "proceso");
                const titulo = String(proceso.nombre ?? "Tarea");
                const etapaLabel = String(etapa.nombre ?? "Etapa");
                const protocoloLabel = String(protocolo.nombre ?? protocolo.codigo ?? "Protocolo");
                const eventoTipo = String(proceso.evento_tipo ?? "").toLowerCase().trim();
                return {
                  value: `${protocoloId}:${etapaId}:${procesoId}`,
                  titulo,
                  label: `${protocoloLabel} · ${etapaLabel} · ${titulo}`,
                  eventoTipo,
                  etapaLabel,
                  protocoloLabel,
                  ordenEtapa: Number(etapa.orden ?? 999),
                  ordenProceso: Number(proceso.orden ?? 999),
                };
              }),
            ),
          )
          .sort((a, b) => a.ordenEtapa - b.ordenEtapa || a.ordenProceso - b.ordenProceso)
          .map(({ value, label, titulo, eventoTipo, etapaLabel, protocoloLabel }) => ({
            value,
            label,
            titulo,
            eventoTipo,
            etapaLabel,
            protocoloLabel,
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

  const scopedProtocoloTaskOptions = useMemo(
    () =>
      protocoloTaskOptions.filter((option) =>
        managerScope === "finca"
          ? isFincaProductionOption(option)
          : !isFincaProductionOption(option),
      ),
    [managerScope, protocoloTaskOptions],
  );

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
    if (!form.tareaProtocolo) {
      setError("Seleccioná una tarea del protocolo.");
      return;
    }
    if (managerScope === "finca" && (!form.fincaId || !form.cuartelId)) {
      setError("Seleccioná finca y cuartel.");
      return;
    }
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const created = await createEncargo({
        bodegaId: String(activeBodegaId),
        fincaId: managerScope === "finca" ? form.fincaId : undefined,
        cuartelId: managerScope === "finca" ? form.cuartelId : undefined,
        milestoneId: form.milestoneId || undefined,
        titulo: form.titulo.trim(),
        descripcion: form.descripcion.trim() || undefined,
        fechaObjetivo: form.fechaObjetivo || undefined,
        prioridad: form.prioridad,
        operarioUserId: form.operarioUserId || undefined,
      });

      const encargoId = String(created.encargo_id ?? created.id ?? "");
      if (encargoId && form.operarioUserId) {
        try {
          await assignEncargoToUser(encargoId, form.operarioUserId);
          setNotice("Tarea creada y asignada correctamente.");
        } catch (assignError) {
          setNotice(
            `Tarea creada, pero no se pudo confirmar la asignación automática: ${getApiErrorMessage(assignError)}`,
          );
        }
      } else {
        setNotice("Tarea creada correctamente.");
      }

      setForm((prev) => ({
        ...prev,
        tareaProtocolo: "",
        titulo: "",
        descripcion: "",
        fechaObjetivo: "",
        milestoneId: "",
        fincaId: managerScope === "finca" ? prev.fincaId : "",
        cuartelId: managerScope === "finca" ? prev.cuartelId : "",
        operarioUserId: "",
      }));
      await refreshTasks();
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const getProductoIdFromTask = (task: Encargo) => {
    const anyTask = task as Encargo & {
      trazabilidadId?: string;
      productoId?: string;
    };
    return (
      task.trazabilidad_id ??
      anyTask.trazabilidadId ??
      anyTask.productoId ??
      task.trazabilidad?.trazabilidad_id ??
      task.milestone?.trazabilidad_id ??
      null
    );
  };

  const onOpenTaskMilestone = (task: Encargo) => {
    const milestoneId = task.milestone_id ?? task.milestone?.milestone_id;
    const productoId = getProductoIdFromTask(task);
    if (!milestoneId) {
      setError("Esta tarea no tiene milestone asociado.");
      return;
    }
    if (!productoId) {
      setError(
        "No se pudo determinar el producto de la tarea. Verificá que el backend incluya trazabilidad_id en el encargo.",
      );
      return;
    }
    navigate(
      `/productos/${encodeURIComponent(productoId)}/plan?milestoneId=${encodeURIComponent(
        milestoneId,
      )}`,
    );
  };

  const onDeleteTask = async (task: Encargo) => {
    const encargoId = String(task.encargo_id ?? task.id ?? "");
    if (!encargoId) {
      setError("No se pudo determinar el ID de la tarea.");
      return;
    }
    const ok = window.confirm(`¿Eliminar/cancelar la tarea "${task.titulo}"?`);
    if (!ok) return;

    setDeletingTaskId(encargoId);
    setError(null);
    setNotice(null);
    try {
      await deleteEncargo(encargoId);
      setNotice("Tarea eliminada/cancelada correctamente.");
      await refreshTasks();
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setDeletingTaskId(null);
    }
  };

  return (
    <div className="min-h-screen bg-secondary px-6 py-10">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-text">Tareas</h1>
          <p className="mt-2 text-sm text-text-secondary">
            Encargados de finca o bodega asignan tareas; operarios ven sus pendientes.
          </p>
        </div>

        {canManageTasks ? (
          <section className="rounded-2xl bg-primary/30 p-5">
            <h2 className="text-lg font-semibold text-text">Nueva tarea</h2>
            <p className="mt-1 text-xs text-text-secondary">
              Usuario actual: {user?.nombre ?? user?.email ?? "Usuario"}
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <select
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
                className="rounded-lg border border-[#C9A961]/40 bg-white/95 px-3 py-2 text-sm text-[#3D1B1F]"
              >
                <option value="">Seleccionar tarea del protocolo</option>
                {scopedProtocoloTaskOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                value={form.prioridad}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    prioridad: e.target.value as "baja" | "media" | "alta",
                  }))
                }
                className="rounded-lg border border-[#C9A961]/40 bg-white/95 px-3 py-2 text-sm text-[#3D1B1F]"
              >
                <option value="baja">baja</option>
                <option value="media">media</option>
                <option value="alta">alta</option>
              </select>
              {managerScope === "finca" ? (
                <>
                  <select
                    value={form.fincaId}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, fincaId: e.target.value, cuartelId: "" }))
                    }
                    className="rounded-lg border border-[#C9A961]/40 bg-white/95 px-3 py-2 text-sm text-[#3D1B1F]"
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
                  </select>
                  <select
                    value={form.cuartelId}
                    onChange={(e) => setForm((prev) => ({ ...prev, cuartelId: e.target.value }))}
                    className="rounded-lg border border-[#C9A961]/40 bg-white/95 px-3 py-2 text-sm text-[#3D1B1F]"
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
                  </select>
                </>
              ) : (
                <div className="rounded-lg border border-[#C9A961]/40 bg-white/95 px-3 py-2 text-xs text-[#7A4A50] md:col-span-2">
                  Encargado de bodega: las tareas se crean a nivel bodega (sin finca/cuartel).
                </div>
              )}
              <select
                value={form.operarioUserId}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, operarioUserId: e.target.value }))
                }
                className="rounded-lg border border-[#C9A961]/40 bg-white/95 px-3 py-2 text-sm text-[#3D1B1F]"
              >
                <option value="">Asignar operario (opcional)</option>
                {operarios.map((op) => (
                  <option key={op.id} value={op.id}>
                    {op.nombre} ({op.email ?? op.id})
                  </option>
                ))}
              </select>
              <input
                type="date"
                value={form.fechaObjetivo}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, fechaObjetivo: e.target.value }))
                }
                className="rounded-lg border border-[#C9A961]/40 bg-white/95 px-3 py-2 text-sm text-[#3D1B1F]"
              />
              <textarea
                value={form.descripcion}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, descripcion: e.target.value }))
                }
                placeholder="Descripción (opcional)"
                className="md:col-span-2 min-h-24 rounded-lg border border-[#C9A961]/40 bg-white/95 px-3 py-2 text-sm text-[#3D1B1F]"
              />
              <input
                type="text"
                value={form.milestoneId}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, milestoneId: e.target.value }))
                }
                placeholder="Milestone ID (opcional)"
                className="md:col-span-2 rounded-lg border border-[#C9A961]/40 bg-white/95 px-3 py-2 text-sm text-[#3D1B1F]"
              />
            </div>
            <button
              type="button"
              onClick={() => void onCreate()}
              disabled={saving}
              className="mt-4 rounded-lg border border-[#C9A961]/40 px-4 py-2 text-sm font-semibold text-text transition hover:bg-primary disabled:opacity-60"
            >
              {saving ? "Guardando..." : "Crear tarea"}
            </button>
          </section>
        ) : (
          <section className="rounded-2xl bg-primary/30 p-5">
            <h2 className="text-lg font-semibold text-text">Mis tareas</h2>
            <p className="mt-1 text-xs text-text-secondary">
              Vista operario: solo tareas pendientes asignadas a tu usuario.
            </p>
          </section>
        )}

        {error && (
          <div className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        {notice && (
          <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {notice}
          </div>
        )}

        <section className="rounded-2xl bg-primary/20 p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-text">Pendientes</h2>
            <button
              type="button"
              onClick={() => void refreshTasks()}
              className="rounded-lg border border-[#C9A961]/40 px-3 py-2 text-xs font-semibold text-text transition hover:bg-primary"
            >
              Refrescar
            </button>
          </div>

          {loading ? (
            <div className="text-sm text-text-secondary">Cargando tareas…</div>
          ) : tasks.length === 0 ? (
            <div className="text-sm text-text-secondary">No hay tareas pendientes.</div>
          ) : (
            <div className="space-y-2">
              {tasks.map((task) => (
                <article
                  key={String(task.encargo_id ?? task.id)}
                  className="rounded-lg border border-[#C9A961]/30 bg-[#FFF9F0] px-3 py-2"
                >
                  {(() => {
                    const milestoneId = task.milestone_id ?? task.milestone?.milestone_id;
                    const productoId = getProductoIdFromTask(task);
                    const taskId = String(task.encargo_id ?? task.id ?? "");
                    return (
                      <>
                  <div className="text-sm font-semibold text-[#3D1B1F]">{task.titulo}</div>
                  <div className="mt-1 text-xs text-[#7A4A50]">
                    Prioridad: {task.prioridad ?? "media"} · Estado: {task.estado ?? "pendiente"}
                  </div>
                  {task.descripcion && (
                    <div className="mt-1 text-xs text-[#6B3A3F]">{task.descripcion}</div>
                  )}
                  {milestoneId && productoId ? (
                    <button
                      type="button"
                      onClick={() => onOpenTaskMilestone(task)}
                      className="mt-2 rounded-lg border border-[#C9A961]/40 px-3 py-2 text-xs font-semibold text-[#722F37] transition hover:bg-[#F8F3EE]"
                    >
                      Cargar milestone
                    </button>
                  ) : milestoneId ? (
                    <div className="mt-2 text-xs text-[#7A4A50]">
                      Milestone vinculado, pero falta trazabilidad asociada.
                    </div>
                  ) : (
                    <div className="mt-2 text-xs text-[#7A4A50]">Sin milestone vinculado.</div>
                  )}
                  {canManageTasks && (
                    <button
                      type="button"
                      onClick={() => void onDeleteTask(task)}
                      disabled={deletingTaskId === taskId}
                      className="ml-2 mt-2 rounded-lg border border-red-300 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
                    >
                      {deletingTaskId === taskId ? "Eliminando..." : "Eliminar tarea"}
                    </button>
                  )}
                      </>
                    );
                  })()}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Tareas;
