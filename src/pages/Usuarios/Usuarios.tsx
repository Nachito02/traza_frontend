import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AppButton,
  AppCard,
  AppInput,
  AppModal,
  AppSelect,
  NoticeBanner,
  SectionIntro,
  useConfirmDialog,
} from "../../components/ui";
import { fetchFincaById, fetchFincas, type Finca } from "../../features/fincas/api";
import {
  createAuthUser,
  deleteAuthUser,
  fetchAuthUserById,
  fetchAuthUsers,
  patchAuthUser,
  updateUserBodegaRoleByName,
  updateUserFincaRoles,
  updateUserGlobalRole,
  type AuthUser,
} from "../../features/users/api";
import {
  createOperario,
  deleteOperario,
  fetchOperariosByBodega,
  type Operario,
} from "../../features/operarios/api";
import { getApiErrorMessage } from "../../lib/api";
import { BODEGA_ROLES as ROLES_BODEGA, FINCA_ROLES as ROLES_FINCA } from "../../lib/permissions";
import { useAuthStore } from "../../store/authStore";

/** Roles that can be *assigned* through the UI (global access check uses GLOBAL_ADMIN_ROLES). */
const ROLES_GLOBALES = ["admin_sistema"] as const;

type BodegaRoleForm = {
  bodegaId: string;
  bodegaName: string;
  rolesEnBodega: string[];
};

type FincaRoleForm = {
  fincaId: string;
  rolesEnFinca: string[];
};

type CrudForm = {
  nombre: string;
  email: string;
  password: string;
  whatsapp: string;
  is_active: boolean;
  bodegaId: string;
  rolesEnBodega: string[];
};

function extractBodegaRoles(bodega: AuthUser["bodegas"][number]) {
  if (Array.isArray(bodega.roles_en_bodega) && bodega.roles_en_bodega.length > 0) {
    return bodega.roles_en_bodega;
  }
  if (bodega.rol_en_bodega) {
    return [bodega.rol_en_bodega];
  }
  return [];
}

function extractFincaRoles(finca: NonNullable<AuthUser["fincas"]>[number]) {
  if (Array.isArray(finca.roles_en_finca) && finca.roles_en_finca.length > 0) {
    return finca.roles_en_finca;
  }
  if (finca.rol_en_finca) {
    return [finca.rol_en_finca];
  }
  return [];
}

function getFincaLabel(finca: Finca) {
  return String(finca.nombre_finca ?? finca.finca_id ?? finca.id ?? "Finca");
}

function resolveFincaDisplayName(input: unknown, fallbackId = "") {
  if (!input || typeof input !== "object") return fallbackId;
  const source = input as Record<string, unknown>;
  const nombre =
    source.nombre_finca ??
    (source.finca as Record<string, unknown> | undefined)?.nombre_finca;
  return typeof nombre === "string" && nombre.trim() ? nombre : fallbackId;
}

function normalizeRoles(roles: unknown): string[] {
  if (typeof roles === "string") {
    const normalized = roles.toLowerCase().trim();
    return normalized ? [normalized] : [];
  }
  if (!Array.isArray(roles)) return [];
  return roles
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
    .map((role) => role.toLowerCase().trim())
    .filter(Boolean);
}

function hasAdminSistemaRole(input: unknown) {
  return normalizeRoles(input).includes("admin_sistema");
}

function areRoleSetsEqual(expected: Set<string>, actual: Set<string>) {
  if (expected.size !== actual.size) return false;
  for (const role of expected) {
    if (!actual.has(role)) return false;
  }
  return true;
}

// ─── Tab pill ────────────────────────────────────────────────────────────────

function TabPill({
  active,
  onClick,
  children,
  count,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-md)] border px-3 py-2 text-xs font-semibold shadow-[var(--shadow-inset-soft)] transition-all duration-[var(--motion-fast)]",
        active
          ? "border-[color:var(--border-default)] bg-[color:var(--action-primary-bg)] text-[color:var(--text-primary)]"
          : "border-[color:var(--border-shell)] bg-[color:var(--action-secondary-bg)] text-[color:var(--text-on-dark-muted)] hover:border-[color:var(--border-default)] hover:bg-[color:var(--action-secondary-hover)] hover:text-[color:var(--text-on-dark)]",
      ].join(" ")}
    >
      {children}
      {count !== undefined ? (
        <span className="rounded-full bg-[color:var(--surface-muted)] px-2 py-0.5 text-[11px] text-[color:var(--text-on-dark)]">
          {count}
        </span>
      ) : null}
    </button>
  );
}

// ─── Role chip ───────────────────────────────────────────────────────────────

function RoleChip({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-[color:var(--border-shell)] bg-[color:var(--surface-muted)] px-2 py-0.5 text-[10px] font-medium text-[color:var(--text-on-dark-muted)]">
      {label}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const Usuarios = () => {
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const actorUser = useAuthStore((state) => state.user);
  const activeBodegaId = useAuthStore((state) => state.activeBodegaId);
  const bodegas = useAuthStore((state) => state.bodegas);

  // ── Nav ──────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"usuarios" | "operarios">("usuarios");

  // ── Users list ───────────────────────────────────────────────────────────
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterName, setFilterName] = useState("");
  const [queryName, setQueryName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  // ── CRUD modal ───────────────────────────────────────────────────────────
  const [crudMode, setCrudMode] = useState<"none" | "create" | "edit">("none");
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [crudSaving, setCrudSaving] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [crudForm, setCrudForm] = useState<CrudForm>({
    nombre: "",
    email: "",
    password: "",
    whatsapp: "",
    is_active: true,
    bodegaId: "",
    rolesEnBodega: ["productor"],
  });

  // ── Roles modal ──────────────────────────────────────────────────────────
  const [rolesModalUserId, setRolesModalUserId] = useState<string | null>(null);
  const [rolesModalScope, setRolesModalScope] = useState<"bodega" | "finca">("bodega");

  // ── Operarios ────────────────────────────────────────────────────────────
  const [operarios, setOperarios] = useState<Operario[]>([]);
  const [operariosSaving, setOperariosSaving] = useState(false);
  const [operariosOpen, setOperariosOpen] = useState(false);
  const [operariosForm, setOperariosForm] = useState({ nombre: "", whatsapp_e164: "" });
  const [operariosNotice, setOperariosNotice] = useState<string | null>(null);
  const [operariosError, setOperariosError] = useState<string | null>(null);

  // ── Fincas / role forms ──────────────────────────────────────────────────
  const [fincas, setFincas] = useState<Finca[]>([]);
  const [fincaNameById, setFincaNameById] = useState<Record<string, string>>({});
  const [bodegaFormByUser, setBodegaFormByUser] = useState<Record<string, BodegaRoleForm>>({});
  const [fincaFormByUser, setFincaFormByUser] = useState<Record<string, FincaRoleForm>>({});
  const [globalRoleByUser, setGlobalRoleByUser] = useState<Record<string, string>>({});

  // ── Derived permissions ──────────────────────────────────────────────────
  const actorFromUsers = useMemo(
    () => users.find((item) => item.id === String(actorUser?.id ?? "")),
    [actorUser?.id, users],
  );
  const currentUserGlobalRoles = useMemo(
    () => normalizeRoles([actorFromUsers?.roles_globales, actorUser?.roles_globales, (actorUser as { rol?: string } | null)?.rol]),
    [actorFromUsers?.roles_globales, actorUser],
  );
  const isAdminSistema = useMemo(
    () =>
      currentUserGlobalRoles.includes("admin_sistema") ||
      hasAdminSistemaRole((actorFromUsers as { roles_globales?: unknown } | undefined)?.roles_globales) ||
      hasAdminSistemaRole((actorUser as { roles_globales?: unknown; rol?: unknown; role?: unknown } | null)?.roles_globales) ||
      hasAdminSistemaRole((actorUser as { rol?: unknown; role?: unknown } | null)?.rol) ||
      hasAdminSistemaRole((actorUser as { rol?: unknown; role?: unknown } | null)?.role),
    [actorFromUsers, actorUser, currentUserGlobalRoles],
  );
  const currentUserBodegaRoles = useMemo(() => {
    const sourceUser = actorFromUsers ?? actorUser;
    const userAny = (sourceUser ?? {}) as {
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
    if (!match) return [] as string[];
    const roles = match.roles_en_bodega ?? (match.rol_en_bodega ? [match.rol_en_bodega] : []);
    return normalizeRoles(roles);
  }, [activeBodegaId, actorFromUsers, actorUser]);
  const canManageBodegaRoles =
    isAdminSistema ||
    currentUserBodegaRoles.includes("admin_bodega") ||
    currentUserBodegaRoles.includes("encargado_bodega");
  const currentUserManagedFincaIds = useMemo(() => {
    const sourceUser = actorFromUsers ?? actorUser;
    const userAny = (sourceUser ?? {}) as {
      fincas?: Array<{
        finca_id?: string | number;
        roles_en_finca?: string[];
        rol_en_finca?: string;
      }>;
    };
    return (userAny.fincas ?? [])
      .filter((finca) => {
        const roles = finca.roles_en_finca ?? (finca.rol_en_finca ? [finca.rol_en_finca] : []);
        return normalizeRoles(roles).includes("encargado_finca");
      })
      .map((finca) => String(finca.finca_id ?? ""))
      .filter(Boolean);
  }, [actorFromUsers, actorUser]);
  const canManageFincaRoles = isAdminSistema || canManageBodegaRoles || currentUserManagedFincaIds.length > 0;
  const canManageUserCrud = useMemo(() => {
    if (isAdminSistema || canManageBodegaRoles) return true;
    if (!actorFromUsers && Boolean(activeBodegaId)) return true;
    return false;
  }, [activeBodegaId, actorFromUsers, canManageBodegaRoles, isAdminSistema]);

  // ── Data loaders ─────────────────────────────────────────────────────────
  const hydrateUsersWithDetail = useCallback(async (list: AuthUser[]) => {
    const detailed = await Promise.all(
      (list ?? []).map(async (user) => {
        try {
          return await fetchAuthUserById(user.id);
        } catch {
          return user;
        }
      }),
    );
    return detailed;
  }, []);

  const loadUsers = useCallback(async (name?: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAuthUsers(name);
      const detailed = await hydrateUsersWithDetail(data ?? []);
      setUsers(detailed);
    } catch (e) {
      setError(getApiErrorMessage(e));
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [hydrateUsersWithDetail]);

  useEffect(() => { void loadUsers(); }, [loadUsers]);

  useEffect(() => {
    if (!activeBodegaId) { setFincas([]); return; }
    fetchFincas(String(activeBodegaId))
      .then((data) => setFincas(data ?? []))
      .catch(() => setFincas([]));
  }, [activeBodegaId]);

  useEffect(() => {
    setBodegaFormByUser((prev) => {
      const next = { ...prev };
      for (const user of users) {
        if (next[user.id]) continue;
        next[user.id] = {
          bodegaId: String(user.bodegas[0]?.bodega_id ?? ""),
          bodegaName: user.bodegas[0]?.nombre ?? "",
          rolesEnBodega: extractBodegaRoles(user.bodegas[0] ?? ({} as AuthUser["bodegas"][number])),
        };
        if (next[user.id].rolesEnBodega.length === 0) {
          next[user.id].rolesEnBodega = [ROLES_BODEGA[0]];
        }
      }
      return next;
    });
    setFincaFormByUser((prev) => {
      const next = { ...prev };
      for (const user of users) {
        if (next[user.id]) continue;
        const firstFinca = user.fincas?.[0];
        next[user.id] = {
          fincaId: String(firstFinca?.finca_id ?? ""),
          rolesEnFinca: firstFinca ? extractFincaRoles(firstFinca) : [],
        };
      }
      return next;
    });
    setGlobalRoleByUser((prev) => {
      const next = { ...prev };
      for (const user of users) {
        if (next[user.id]) continue;
        next[user.id] = user.roles_globales.includes("admin_sistema") ? "admin_sistema" : ROLES_GLOBALES[0];
      }
      return next;
    });
  }, [users]);

  const uniqueBodegaNames = useMemo(() => {
    const set = new Set<string>();
    for (const user of users) {
      for (const bodega of user.bodegas) { set.add(bodega.nombre); }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [users]);

  const fincaOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const finca of fincas) {
      const id = String(finca.finca_id ?? finca.id ?? "");
      if (!id) continue;
      map.set(id, getFincaLabel(finca));
    }
    for (const user of users) {
      for (const finca of user.fincas ?? []) {
        const id = String(finca.finca_id ?? "");
        if (!id) continue;
        map.set(id, resolveFincaDisplayName(finca, id));
      }
    }
    return Array.from(map.entries())
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [fincas, users]);

  const fincaLabelById = useMemo(
    () => new Map([
      ...fincaOptions.map((item) => [item.id, item.label] as const),
      ...Object.entries(fincaNameById),
    ]),
    [fincaNameById, fincaOptions],
  );

  useEffect(() => {
    const known = new Set<string>([
      ...fincaOptions.map((option) => option.id),
      ...Object.keys(fincaNameById),
    ]);
    const missingIds = new Set<string>();
    for (const user of users) {
      for (const finca of user.fincas ?? []) {
        const fincaId = String(finca.finca_id ?? "");
        if (!fincaId || known.has(fincaId)) continue;
        missingIds.add(fincaId);
      }
    }
    if (missingIds.size === 0) return;
    let mounted = true;
    Promise.all(
      Array.from(missingIds).map(async (fincaId) => {
        try {
          const detail = await fetchFincaById(fincaId);
          return [fincaId, resolveFincaDisplayName(detail, fincaId)] as const;
        } catch {
          return [fincaId, fincaId] as const;
        }
      }),
    ).then((entries) => {
      if (!mounted) return;
      setFincaNameById((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
    });
    return () => { mounted = false; };
  }, [fincaNameById, fincaOptions, users]);

  useEffect(() => {
    setCrudForm((prev) => {
      if (prev.bodegaId) return prev;
      if (activeBodegaId) return { ...prev, bodegaId: String(activeBodegaId) };
      if (bodegas[0]?.bodega_id) return { ...prev, bodegaId: String(bodegas[0].bodega_id) };
      return prev;
    });
  }, [activeBodegaId, bodegas]);

  // ── Search ───────────────────────────────────────────────────────────────
  const onSubmitFilter = async () => {
    const value = filterName.trim();
    setQueryName(value);
    await loadUsers(value || undefined);
  };
  const onClearFilter = async () => {
    setFilterName("");
    setQueryName("");
    await loadUsers();
  };

  // ── Operarios ────────────────────────────────────────────────────────────
  const loadOperarios = useCallback(async () => {
    if (!activeBodegaId) { setOperarios([]); return; }
    try { setOperarios(await fetchOperariosByBodega(activeBodegaId)); }
    catch { setOperarios([]); }
  }, [activeBodegaId]);
  useEffect(() => { void loadOperarios(); }, [loadOperarios]);
  const onCreateOperario = async () => {
    if (!activeBodegaId) return;
    if (!operariosForm.nombre.trim()) { setOperariosError("El nombre es obligatorio."); return; }
    setOperariosSaving(true);
    setOperariosNotice(null);
    setOperariosError(null);
    try {
      await createOperario(activeBodegaId, {
        nombre: operariosForm.nombre.trim(),
        ...(operariosForm.whatsapp_e164.trim() ? { whatsapp_e164: operariosForm.whatsapp_e164.trim() } : {}),
      });
      setOperariosNotice("Operario creado.");
      setOperariosForm({ nombre: "", whatsapp_e164: "" });
      setOperariosOpen(false);
      await loadOperarios();
    } catch (e) {
      setOperariosError(getApiErrorMessage(e));
    } finally {
      setOperariosSaving(false);
    }
  };
  const onDeleteOperario = async (op: Operario) => {
    const ok = await confirm(`¿Desactivar a "${op.nombre}"?`);
    if (!ok) return;
    setOperariosError(null);
    setOperariosNotice(null);
    try {
      await deleteOperario(op.user_id);
      setOperariosNotice("Operario desactivado.");
      await loadOperarios();
    } catch (e) {
      setOperariosError(getApiErrorMessage(e));
    }
  };

  // ── CRUD ─────────────────────────────────────────────────────────────────
  const resetCrud = () => {
    setCrudMode("none");
    setEditingUserId(null);
    setCrudForm({
      nombre: "",
      email: "",
      password: "",
      whatsapp: "",
      is_active: true,
      bodegaId: activeBodegaId ? String(activeBodegaId) : "",
      rolesEnBodega: ["productor"],
    });
  };
  const onStartCreate = () => {
    setError(null);
    setNotice(null);
    setCrudMode("create");
    setEditingUserId(null);
    setCrudForm({
      nombre: "",
      email: "",
      password: "",
      whatsapp: "",
      is_active: true,
      bodegaId: activeBodegaId ? String(activeBodegaId) : "",
      rolesEnBodega: ["productor"],
    });
  };
  const onStartEditUser = (target: AuthUser) => {
    const firstBodega = target.bodegas[0];
    const resolvedBodegaId = firstBodega?.bodega_id ?? activeBodegaId ?? "";
    setError(null);
    setNotice(null);
    setCrudMode("edit");
    setEditingUserId(target.id);
    setCrudForm({
      nombre: target.nombre ?? "",
      email: target.email ?? "",
      password: "",
      whatsapp: target.whatsapp_e164 ?? "",
      is_active: target.is_active,
      bodegaId: String(resolvedBodegaId),
      rolesEnBodega: extractBodegaRoles(firstBodega ?? ({} as AuthUser["bodegas"][number])),
    });
  };
  const onSubmitCrud = async () => {
    if (!canManageUserCrud) { setError("No tenés permisos para crear/editar usuarios."); return; }
    if (!crudForm.nombre.trim()) { setError("Nombre obligatorio."); return; }
    if (!crudForm.email.trim()) { setError("Email obligatorio."); return; }
    setCrudSaving(true);
    setError(null);
    setNotice(null);
    try {
      if (crudMode === "create") {
        if (!crudForm.password.trim()) { setError("Password obligatoria para alta."); return; }
        const bodegaId = isAdminSistema ? crudForm.bodegaId : String(activeBodegaId ?? crudForm.bodegaId ?? "");
        if (!bodegaId) { setError("Seleccioná una bodega."); return; }
        await createAuthUser({
          nombre: crudForm.nombre.trim(),
          email: crudForm.email.trim(),
          password: crudForm.password,
          bodegaId,
          rolesEnBodega: crudForm.rolesEnBodega,
          ...(crudForm.whatsapp.trim() ? { whatsapp: crudForm.whatsapp.trim() } : {}),
        });
        setNotice("Usuario creado.");
      } else if (crudMode === "edit" && editingUserId) {
        const payload: { nombre?: string; email?: string; password?: string; is_active?: boolean; whatsapp?: string | null } = {
          nombre: crudForm.nombre.trim(),
          email: crudForm.email.trim(),
          is_active: crudForm.is_active,
          whatsapp: crudForm.whatsapp.trim() || null,
        };
        if (crudForm.password.trim()) payload.password = crudForm.password;
        await patchAuthUser(editingUserId, payload);
        setNotice("Usuario actualizado.");
      }
      await loadUsers(queryName || undefined);
      resetCrud();
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setCrudSaving(false);
    }
  };
  const onDeleteUser = async (target: AuthUser) => {
    if (!canManageUserCrud) { setError("No tenés permisos para eliminar usuarios."); return; }
    if (!isAdminSistema && target.roles_globales.includes("admin_sistema")) {
      setError("No podés eliminar un usuario con rol global admin_sistema.");
      return;
    }
    const ok = await confirm(`¿Dar de baja al usuario "${target.nombre}"?`);
    if (!ok) return;
    setDeletingUserId(target.id);
    setError(null);
    setNotice(null);
    try {
      await deleteAuthUser(target.id);
      setNotice("Usuario dado de baja.");
      await loadUsers(queryName || undefined);
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setDeletingUserId(null);
    }
  };

  // ── Roles ─────────────────────────────────────────────────────────────────
  const onAssignBodegaRole = async (userId: string) => {
    if (!canManageBodegaRoles) { setError("No tenés permisos para asignar roles de bodega."); return; }
    const form = bodegaFormByUser[userId];
    if (!form?.bodegaId.trim()) { setError("Seleccioná una bodega para asignar el rol."); return; }
    setBusyUserId(userId);
    setError(null);
    setNotice(null);
    try {
      const expectedRoles = new Set(form.rolesEnBodega.map((role) => role.toLowerCase()));
      await updateUserBodegaRoleByName({ userId, bodegaId: form.bodegaId.trim(), bodegaName: form.bodegaName.trim(), rolesEnBodega: form.rolesEnBodega });
      const refreshed = await fetchAuthUserById(userId);
      setUsers((prev) => prev.map((item) => (item.id === userId ? refreshed : item)));
      const targetBodega = refreshed.bodegas.find((b) => String(b.bodega_id) === form.bodegaId.trim());
      const actualRoles = normalizeRoles(targetBodega?.roles_en_bodega ?? (targetBodega?.rol_en_bodega ? [targetBodega.rol_en_bodega] : []));
      const actualSet = new Set(actualRoles);
      setBodegaFormByUser((prev) => ({ ...prev, [userId]: { bodegaId: form.bodegaId, bodegaName: form.bodegaName, rolesEnBodega: actualRoles } }));
      setNotice(!areRoleSetsEqual(expectedRoles, actualSet) ? "Se envió la actualización, pero el backend no devolvió los nuevos roles." : "Roles de bodega actualizados.");
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setBusyUserId(null);
    }
  };
  const onAssignFincaRole = async (userId: string) => {
    if (!canManageFincaRoles) { setError("No tenés permisos para asignar roles de finca."); return; }
    const form = fincaFormByUser[userId];
    if (!form?.fincaId.trim()) { setError("Seleccioná una finca para asignar roles."); return; }
    if (!isAdminSistema && !canManageBodegaRoles && !new Set(currentUserManagedFincaIds).has(form.fincaId)) {
      setError("Solo podés asignar roles en tus fincas.");
      return;
    }
    setBusyUserId(userId);
    setError(null);
    setNotice(null);
    try {
      const expectedRoles = new Set(form.rolesEnFinca.map((role) => role.toLowerCase()));
      await updateUserFincaRoles({ userId, fincaId: form.fincaId, rolesEnFinca: form.rolesEnFinca });
      const refreshed = await fetchAuthUserById(userId);
      setUsers((prev) => prev.map((item) => (item.id === userId ? refreshed : item)));
      const targetFinca = (refreshed.fincas ?? []).find((finca) => String(finca.finca_id ?? "") === form.fincaId);
      const actualRoles = normalizeRoles(targetFinca?.roles_en_finca ?? (targetFinca?.rol_en_finca ? [targetFinca.rol_en_finca] : []));
      setFincaFormByUser((prev) => ({ ...prev, [userId]: { fincaId: form.fincaId, rolesEnFinca: actualRoles } }));
      setNotice((!areRoleSetsEqual(expectedRoles, new Set(actualRoles))) ? "Se envió la actualización, pero el backend no devolvió la finca vinculada." : "Roles de finca actualizados.");
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setBusyUserId(null);
    }
  };
  const onSetGlobalRole = async (userId: string, enabled: boolean) => {
    if (!isAdminSistema) { setError("Solo admin_sistema puede asignar roles globales."); return; }
    const rolGlobal = globalRoleByUser[userId];
    if (!rolGlobal) { setError("Seleccioná un rol global."); return; }
    setBusyUserId(userId);
    setError(null);
    setNotice(null);
    try {
      await updateUserGlobalRole({ userId, rolGlobal, enabled });
      await loadUsers(queryName || undefined);
      setNotice(enabled ? "Rol global asignado." : "Rol global removido.");
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setBusyUserId(null);
    }
  };

  // ── Roles modal data ──────────────────────────────────────────────────────
  const rolesModalUser = rolesModalUserId ? users.find((u) => u.id === rolesModalUserId) ?? null : null;
  const rolesModalBodegaForm = rolesModalUserId ? (bodegaFormByUser[rolesModalUserId] ?? { bodegaId: "", bodegaName: "", rolesEnBodega: [ROLES_BODEGA[0]] }) : null;
  const rolesModalFincaForm = rolesModalUserId ? (fincaFormByUser[rolesModalUserId] ?? { fincaId: "", rolesEnFinca: [ROLES_FINCA[0]] }) : null;
  const rolesModalGlobalRole = rolesModalUserId ? (globalRoleByUser[rolesModalUserId] ?? ROLES_GLOBALES[0]) : ROLES_GLOBALES[0];
  const isBusyRolesModal = rolesModalUserId ? busyUserId === rolesModalUserId : false;
  const canManageBodegaRolesForModal = canManageBodegaRoles || (rolesModalUser && String(rolesModalUser.id) === String(actorUser?.id ?? "") && isAdminSistema);
  const canManageFincaRolesForModal = canManageFincaRoles || (rolesModalUser && String(rolesModalUser.id) === String(actorUser?.id ?? "") && isAdminSistema);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-secondary px-6 py-10">
      <div className="mx-auto w-full max-w-6xl space-y-6">

        {/* Header */}
        <SectionIntro
          eyebrow="Personal"
          title="Usuarios y roles"
          description="Gestioná el equipo que trabaja en la bodega: usuarios con cuenta y operarios de campo."
        />

        {/* Search */}
        <AppCard as="section" padding="sm">
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[220px] flex-1">
              <AppInput
                type="text"
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void onSubmitFilter(); }}
                placeholder="Buscar por nombre de bodega…"
                list="bodega-name-suggestions"
              />
              <datalist id="bodega-name-suggestions">
                {uniqueBodegaNames.map((name) => <option key={name} value={name} />)}
              </datalist>
            </div>
            <AppButton type="button" variant="secondary" size="sm" onClick={() => void onSubmitFilter()}>
              Buscar
            </AppButton>
            {queryName ? (
              <AppButton type="button" variant="ghost" size="sm" onClick={() => void onClearFilter()}>
                Limpiar
              </AppButton>
            ) : null}
          </div>
          {queryName ? (
            <p className="mt-2 text-xs text-[color:var(--text-on-dark-muted)]">
              Mostrando resultados para: <strong className="text-[color:var(--text-on-dark)]">{queryName}</strong>
            </p>
          ) : null}
        </AppCard>

        {/* Feedback */}
        {error ? <NoticeBanner tone="danger">{error}</NoticeBanner> : null}
        {notice ? <NoticeBanner tone="success">{notice}</NoticeBanner> : null}

        {/* Tabs */}
        <div className="flex flex-wrap gap-2">
          <TabPill active={activeTab === "usuarios"} onClick={() => setActiveTab("usuarios")} count={loading ? undefined : users.length}>
            Con cuenta
          </TabPill>
          {canManageBodegaRoles ? (
            <TabPill active={activeTab === "operarios"} onClick={() => setActiveTab("operarios")} count={operarios.length}>
              Operarios de campo
            </TabPill>
          ) : null}
        </div>

        {/* ── Tab: Usuarios con cuenta ─────────────────────────────────── */}
        {activeTab === "usuarios" ? (
          <AppCard
            as="section"
            padding="md"
            header={(
              <SectionIntro
                title="Usuarios con cuenta"
                description="Personas que pueden iniciar sesión en el sistema."
                actions={canManageUserCrud ? (
                  <AppButton type="button" variant="secondary" size="sm" onClick={onStartCreate}>
                    Nuevo usuario
                  </AppButton>
                ) : undefined}
              />
            )}
          >
            {!canManageUserCrud ? (
              <NoticeBanner>
                No tenés permisos para administrar usuarios. Requiere rol de encargado o administrador.
              </NoticeBanner>
            ) : loading ? (
              <NoticeBanner>Cargando usuarios…</NoticeBanner>
            ) : users.length === 0 ? (
              <NoticeBanner>No hay usuarios para el filtro actual.</NoticeBanner>
            ) : (
              <div className="space-y-2">
                {users.map((user) => {
                  const bodegaRoles = user.bodegas.flatMap((b) => extractBodegaRoles(b));
                  const fincaRoles = (user.fincas ?? []).flatMap((f) => extractFincaRoles(f));
                  const allRoleChips: string[] = [
                    ...user.roles_globales.map((r) => `Global: ${r}`),
                    ...user.bodegas.map((b) => {
                      const roles = extractBodegaRoles(b);
                      return roles.length > 0 ? `${b.nombre}: ${roles.join(", ")}` : `${b.nombre}: sin rol`;
                    }),
                    ...(user.fincas ?? []).map((f) => {
                      const fincaId = String(f.finca_id ?? "");
                      const fincaNombre = fincaLabelById.get(fincaId) ?? resolveFincaDisplayName(f, fincaId) ?? fincaId;
                      const roles = extractFincaRoles(f);
                      return roles.length > 0 ? `Finca ${fincaNombre}: ${roles.join(", ")}` : null;
                    }).filter((x): x is string => x !== null),
                  ];
                  void bodegaRoles;
                  void fincaRoles;

                  return (
                    <article
                      key={user.id}
                      className="rounded-[var(--radius-lg)] border border-[color:var(--border-shell)] bg-[color:var(--surface-soft)] px-4 py-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        {/* Identity */}
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-[color:var(--text-ink)]">{user.nombre}</span>
                            {!user.is_active ? (
                              <span className="rounded-full border border-[color:var(--feedback-neutral-border)] bg-[color:var(--feedback-neutral-bg)] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--feedback-neutral-text)]">
                                Inactivo
                              </span>
                            ) : null}
                            {user.must_change_password ? (
                              <span className="rounded-full border border-[color:var(--feedback-warning-border)] bg-[color:var(--feedback-warning-bg)] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--feedback-warning-text)]">
                                Pendiente activación
                              </span>
                            ) : null}
                            {user.roles_globales.includes("bot_agent") ? (
                              <span className="rounded-full border border-[color:var(--border-default)] bg-[color:var(--surface-soft)] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--accent-primary)]">
                                Bot
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-0.5 text-xs text-[color:var(--text-ink-muted)]">
                            {user.email ?? "Sin email"}
                          </div>
                          {allRoleChips.length > 0 ? (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {allRoleChips.map((chip) => <RoleChip key={chip} label={chip} />)}
                            </div>
                          ) : (
                            <div className="mt-2">
                              <RoleChip label="Sin roles asignados" />
                            </div>
                          )}
                        </div>
                        {/* Actions */}
                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                          <AppButton
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => { setRolesModalUserId(user.id); setRolesModalScope("bodega"); }}
                          >
                            Roles
                          </AppButton>
                          {canManageUserCrud ? (
                            <>
                              <AppButton type="button" variant="secondary" size="sm" onClick={() => onStartEditUser(user)}>
                                Editar
                              </AppButton>
                              <AppButton
                                type="button"
                                variant="danger"
                                size="sm"
                                disabled={deletingUserId === user.id}
                                onClick={() => void onDeleteUser(user)}
                              >
                                {deletingUserId === user.id ? "Procesando…" : "Baja"}
                              </AppButton>
                            </>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </AppCard>
        ) : null}

        {/* ── Tab: Operarios de campo ──────────────────────────────────── */}
        {activeTab === "operarios" && canManageBodegaRoles ? (
          <AppCard
            as="section"
            padding="md"
            header={(
              <SectionIntro
                title="Operarios de campo"
                description="Personas sin cuenta en el sistema que pueden ser asignadas a órdenes de trabajo."
                actions={(
                  <AppButton
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => { setOperariosOpen((prev) => !prev); setOperariosError(null); setOperariosNotice(null); }}
                  >
                    {operariosOpen ? "Cancelar" : "Nuevo operario"}
                  </AppButton>
                )}
              />
            )}
          >
            {operariosOpen ? (
              <div className="mb-4 grid gap-3 rounded-[var(--radius-lg)] border border-[color:var(--border-default)] bg-[color:var(--surface-soft)] p-4 md:grid-cols-2">
                <AppInput
                  value={operariosForm.nombre}
                  onChange={(e) => setOperariosForm((prev) => ({ ...prev, nombre: e.target.value }))}
                  placeholder="Nombre y apellido *"
                />
                <AppInput
                  type="tel"
                  value={operariosForm.whatsapp_e164}
                  onChange={(e) => setOperariosForm((prev) => ({ ...prev, whatsapp_e164: e.target.value }))}
                  placeholder="WhatsApp E.164 (ej: +5491112345678)"
                />
                <div className="md:col-span-2 flex gap-2">
                  <AppButton type="button" variant="secondary" size="sm" disabled={operariosSaving} onClick={() => void onCreateOperario()}>
                    {operariosSaving ? "Creando…" : "Crear operario"}
                  </AppButton>
                  <AppButton type="button" variant="ghost" size="sm" onClick={() => { setOperariosOpen(false); setOperariosForm({ nombre: "", whatsapp_e164: "" }); }}>
                    Cancelar
                  </AppButton>
                </div>
              </div>
            ) : null}

            {operariosError ? <NoticeBanner tone="danger" className="mb-3">{operariosError}</NoticeBanner> : null}
            {operariosNotice ? <NoticeBanner tone="success" className="mb-3">{operariosNotice}</NoticeBanner> : null}

            {operarios.length === 0 ? (
              <NoticeBanner>Sin operarios de campo registrados para esta bodega.</NoticeBanner>
            ) : (
              <div className="space-y-2">
                {operarios.map((op) => (
                  <div key={op.user_id} className="flex items-center justify-between rounded-[var(--radius-lg)] border border-[color:var(--border-shell)] bg-[color:var(--surface-soft)] px-4 py-3">
                    <div>
                      <span className="text-sm font-semibold text-[color:var(--text-ink)]">{op.nombre}</span>
                      {op.whatsapp_e164 ? (
                        <span className="ml-2 text-xs text-[color:var(--text-ink-muted)]">{op.whatsapp_e164}</span>
                      ) : null}
                      {!op.is_active ? (
                        <span className="ml-2 rounded-full border border-[color:var(--feedback-neutral-border)] bg-[color:var(--feedback-neutral-bg)] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--feedback-neutral-text)]">
                          Inactivo
                        </span>
                      ) : null}
                    </div>
                    <AppButton type="button" variant="danger" size="sm" onClick={() => void onDeleteOperario(op)}>
                      Desactivar
                    </AppButton>
                  </div>
                ))}
              </div>
            )}
          </AppCard>
        ) : null}

      </div>

      {/* ── Modal: Crear / Editar usuario ────────────────────────────────── */}
      <AppModal
        opened={crudMode !== "none"}
        onClose={resetCrud}
        title={crudMode === "edit" ? "Editar usuario" : "Nuevo usuario"}
        description={crudMode === "edit" ? "Modificá los datos del usuario." : "Completá los datos para dar de alta una cuenta nueva."}
        size="md"
        footer={(
          <div className="flex gap-2">
            <AppButton type="button" variant="secondary" size="sm" disabled={crudSaving} onClick={() => void onSubmitCrud()}>
              {crudSaving ? "Guardando…" : crudMode === "edit" ? "Guardar cambios" : "Crear usuario"}
            </AppButton>
            <AppButton type="button" variant="ghost" size="sm" disabled={crudSaving} onClick={resetCrud}>
              Cancelar
            </AppButton>
          </div>
        )}
      >
        {error ? <NoticeBanner tone="danger" className="mb-3">{error}</NoticeBanner> : null}
        <div className="grid gap-4 md:grid-cols-2">
          <AppInput
            label="Nombre"
            value={crudForm.nombre}
            onChange={(e) => setCrudForm((prev) => ({ ...prev, nombre: e.target.value }))}
            placeholder="Nombre completo"
          />
          <AppInput
            label="Email"
            value={crudForm.email}
            onChange={(e) => setCrudForm((prev) => ({ ...prev, email: e.target.value }))}
            placeholder="correo@ejemplo.com"
          />
          <AppInput
            label={crudMode === "create" ? "Contraseña" : "Contraseña (dejar vacío para no cambiar)"}
            type="password"
            value={crudForm.password}
            onChange={(e) => setCrudForm((prev) => ({ ...prev, password: e.target.value }))}
            placeholder={crudMode === "create" ? "Mínimo 8 caracteres" : "Sin cambios"}
          />
          <AppInput
            label="WhatsApp"
            type="tel"
            value={crudForm.whatsapp}
            onChange={(e) => setCrudForm((prev) => ({ ...prev, whatsapp: e.target.value }))}
            placeholder="+5491112345678"
          />
          {isAdminSistema ? (
            <AppSelect
              label="Bodega"
              value={crudForm.bodegaId}
              onChange={(e) => setCrudForm((prev) => ({ ...prev, bodegaId: e.target.value }))}
            >
              <option value="">Seleccionar bodega</option>
              {bodegas.map((bodega) => (
                <option key={bodega.bodega_id} value={bodega.bodega_id}>{bodega.nombre}</option>
              ))}
            </AppSelect>
          ) : (
            <div className="rounded-[var(--radius-md)] border border-[color:var(--border-shell)] bg-[color:var(--surface-muted)] px-3 py-2 text-xs text-[color:var(--text-on-dark-muted)]">
              <span className="block text-[color:var(--text-on-dark)] font-medium mb-0.5">Bodega</span>
              {bodegas.find((b) => String(b.bodega_id) === String(activeBodegaId))?.nombre ?? "Bodega activa"}
            </div>
          )}
          {crudMode === "edit" ? (
            <label className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[color:var(--border-shell)] bg-[color:var(--surface-muted)] px-3 py-2 text-sm text-[color:var(--text-on-dark)]">
              <input
                type="checkbox"
                checked={crudForm.is_active}
                onChange={(e) => setCrudForm((prev) => ({ ...prev, is_active: e.target.checked }))}
              />
              Usuario activo
            </label>
          ) : null}
          <div className="md:col-span-2">
            <p className="mb-2 text-xs font-semibold text-[color:var(--text-accent)]">Roles en bodega</p>
            <div className="flex flex-wrap gap-3 rounded-[var(--radius-md)] border border-[color:var(--border-shell)] bg-[color:var(--surface-muted)] p-3">
              {ROLES_BODEGA.map((role) => (
                <label key={`crud-${role}`} className="flex items-center gap-2 text-xs text-[color:var(--text-on-dark)]">
                  <input
                    type="checkbox"
                    checked={crudForm.rolesEnBodega.includes(role)}
                    onChange={(e) =>
                      setCrudForm((prev) => {
                        const nextRoles = e.target.checked
                          ? Array.from(new Set([...prev.rolesEnBodega, role]))
                          : prev.rolesEnBodega.filter((item) => item !== role);
                        return { ...prev, rolesEnBodega: nextRoles };
                      })
                    }
                  />
                  {role}
                </label>
              ))}
            </div>
          </div>
        </div>
      </AppModal>

      {/* ── Modal: Editar roles ──────────────────────────────────────────── */}
      <AppModal
        opened={rolesModalUserId !== null}
        onClose={() => { setRolesModalUserId(null); setError(null); }}
        title={rolesModalUser ? `Roles de ${rolesModalUser.nombre}` : "Roles"}
        description="Asigná o modificá los roles en bodega, finca o a nivel global."
        size="md"
      >
        {error ? <NoticeBanner tone="danger" className="mb-4">{error}</NoticeBanner> : null}
        {notice ? <NoticeBanner tone="success" className="mb-4">{notice}</NoticeBanner> : null}

        {rolesModalUserId && rolesModalBodegaForm && rolesModalFincaForm ? (
          <div className="space-y-5">
            {/* Scope tabs */}
            <div className="flex gap-2">
              <TabPill active={rolesModalScope === "bodega"} onClick={() => setRolesModalScope("bodega")}>
                Bodega
              </TabPill>
              <TabPill active={rolesModalScope === "finca"} onClick={() => setRolesModalScope("finca")}>
                Finca
              </TabPill>
              {isAdminSistema ? (
                <TabPill active={rolesModalScope === ("global" as typeof rolesModalScope)} onClick={() => setRolesModalScope("global" as typeof rolesModalScope)}>
                  Global
                </TabPill>
              ) : null}
            </div>

            {/* Bodega scope */}
            {rolesModalScope === "bodega" ? (
              <div className="space-y-3">
                <AppSelect
                  label="Bodega"
                  value={rolesModalBodegaForm.bodegaId}
                  onChange={(e) => {
                    const selectedBodegaId = e.target.value;
                    const selectedBodega = rolesModalUser?.bodegas.find((b) => String(b.bodega_id) === selectedBodegaId);
                    setBodegaFormByUser((prev) => ({
                      ...prev,
                      [rolesModalUserId]: {
                        ...rolesModalBodegaForm,
                        bodegaId: selectedBodegaId,
                        bodegaName: selectedBodega?.nombre ?? "",
                        rolesEnBodega: selectedBodega ? extractBodegaRoles(selectedBodega) : [],
                      },
                    }));
                  }}
                  disabled={!canManageBodegaRolesForModal}
                >
                  <option value="">Seleccionar bodega</option>
                  {(rolesModalUser?.bodegas ?? []).map((bodega) => (
                    <option key={`${rolesModalUserId}-${bodega.bodega_id}`} value={bodega.bodega_id}>
                      {bodega.nombre}
                    </option>
                  ))}
                </AppSelect>
                <div>
                  <p className="mb-2 text-xs font-semibold text-[color:var(--text-accent)]">Roles</p>
                  <div className="space-y-2">
                    {ROLES_BODEGA.map((role) => (
                      <label key={`${rolesModalUserId}-bodega-${role}`} className="flex items-center gap-2 text-sm text-[color:var(--text-ink)]">
                        <input
                          type="checkbox"
                          checked={rolesModalBodegaForm.rolesEnBodega.includes(role)}
                          disabled={!canManageBodegaRolesForModal}
                          onChange={(e) =>
                            setBodegaFormByUser((prev) => {
                              const current = prev[rolesModalUserId] ?? rolesModalBodegaForm;
                              const nextRoles = e.target.checked
                                ? Array.from(new Set([...current.rolesEnBodega, role]))
                                : current.rolesEnBodega.filter((item) => item !== role);
                              return { ...prev, [rolesModalUserId]: { ...current, rolesEnBodega: nextRoles } };
                            })
                          }
                        />
                        {role}
                      </label>
                    ))}
                  </div>
                </div>
                <AppButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={isBusyRolesModal || !canManageBodegaRolesForModal}
                  onClick={() => void onAssignBodegaRole(rolesModalUserId)}
                >
                  {isBusyRolesModal ? "Guardando…" : "Guardar roles bodega"}
                </AppButton>
              </div>
            ) : null}

            {/* Finca scope */}
            {rolesModalScope === "finca" ? (
              <div className="space-y-3">
                <AppSelect
                  label="Finca"
                  value={rolesModalFincaForm.fincaId}
                  onChange={(e) => {
                    const selectedFincaId = e.target.value;
                    const existingRoles =
                      (rolesModalUser?.fincas ?? []).find((finca) => String(finca.finca_id ?? "") === selectedFincaId)?.roles_en_finca ??
                      (rolesModalUser?.fincas ?? []).find((finca) => String(finca.finca_id ?? "") === selectedFincaId)?.rol_en_finca ??
                      [];
                    setFincaFormByUser((prev) => ({
                      ...prev,
                      [rolesModalUserId]: { ...rolesModalFincaForm, fincaId: selectedFincaId, rolesEnFinca: normalizeRoles(existingRoles) },
                    }));
                  }}
                  disabled={!canManageFincaRolesForModal}
                >
                  <option value="">Seleccionar finca</option>
                  {fincaOptions
                    .filter((finca) => isAdminSistema || canManageBodegaRolesForModal || currentUserManagedFincaIds.includes(finca.id))
                    .map((finca) => (
                      <option key={finca.id} value={finca.id}>{finca.label}</option>
                    ))}
                </AppSelect>
                <div>
                  <p className="mb-2 text-xs font-semibold text-[color:var(--text-accent)]">Roles</p>
                  <div className="space-y-2">
                    {ROLES_FINCA.map((role) => (
                      <label key={`${rolesModalUserId}-finca-${role}`} className="flex items-center gap-2 text-sm text-[color:var(--text-ink)]">
                        <input
                          type="checkbox"
                          checked={rolesModalFincaForm.rolesEnFinca.includes(role)}
                          disabled={!canManageFincaRolesForModal || !rolesModalFincaForm.fincaId}
                          onChange={(e) =>
                            setFincaFormByUser((prev) => {
                              const current = prev[rolesModalUserId] ?? rolesModalFincaForm;
                              const nextRoles = e.target.checked
                                ? Array.from(new Set([...current.rolesEnFinca, role]))
                                : current.rolesEnFinca.filter((item) => item !== role);
                              return { ...prev, [rolesModalUserId]: { ...current, rolesEnFinca: nextRoles } };
                            })
                          }
                        />
                        {role}
                      </label>
                    ))}
                  </div>
                </div>
                <AppButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={isBusyRolesModal || !canManageFincaRolesForModal}
                  onClick={() => void onAssignFincaRole(rolesModalUserId)}
                >
                  {isBusyRolesModal ? "Guardando…" : "Guardar roles finca"}
                </AppButton>
              </div>
            ) : null}

            {/* Global scope */}
            {rolesModalScope === ("global" as typeof rolesModalScope) && isAdminSistema ? (
              <div className="space-y-3">
                <p className="text-xs text-[color:var(--text-on-dark-muted)]">
                  Los roles globales otorgan acceso al sistema independientemente de bodega o finca.
                </p>
                <div className="flex flex-wrap gap-2">
                  <AppSelect
                    label="Rol global"
                    value={rolesModalGlobalRole}
                    onChange={(e) => setGlobalRoleByUser((prev) => ({ ...prev, [rolesModalUserId]: e.target.value }))}
                  >
                    {ROLES_GLOBALES.map((role) => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </AppSelect>
                </div>
                <div className="flex gap-2">
                  <AppButton type="button" variant="secondary" size="sm" disabled={isBusyRolesModal} onClick={() => void onSetGlobalRole(rolesModalUserId, true)}>
                    Asignar
                  </AppButton>
                  <AppButton type="button" variant="ghost" size="sm" disabled={isBusyRolesModal} onClick={() => void onSetGlobalRole(rolesModalUserId, false)}>
                    Quitar
                  </AppButton>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </AppModal>

      {ConfirmDialog}
    </div>
  );
};

export default Usuarios;
