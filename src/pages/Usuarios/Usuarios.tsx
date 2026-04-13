import { useEffect, useMemo, useState } from "react";
import { AppButton, AppCard, AppInput, AppSelect, NoticeBanner, SectionIntro } from "../../components/ui";
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
import { useAuthStore } from "../../store/authStore";

const ROLES_BODEGA = [
  "admin_bodega",
  "encargado_bodega",
  "productor",
  "responsable_calidad_inocuidad",
  "responsable_ssyo",
  "enologo",
] as const;

const ROLES_FINCA = ["encargado_finca", "operador_campo"] as const;

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
  return String(finca.nombre ?? finca.nombre_finca ?? finca.name ?? finca.finca_id ?? finca.id ?? "Finca");
}

function resolveFincaDisplayName(input: unknown, fallbackId = "") {
  if (!input || typeof input !== "object") return fallbackId;
  const source = input as Record<string, unknown>;
  const candidates = [
    source.nombre,
    source.nombre_finca,
    source.name,
    source.finca_nombre,
    (source.finca as Record<string, unknown> | undefined)?.nombre,
    (source.finca as Record<string, unknown> | undefined)?.nombre_finca,
    (source.finca as Record<string, unknown> | undefined)?.name,
  ];
  const value = candidates.find((item) => typeof item === "string" && item.trim());
  return typeof value === "string" && value.trim() ? value : fallbackId;
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

const Usuarios = () => {
  const actorUser = useAuthStore((state) => state.user);
  const activeBodegaId = useAuthStore((state) => state.activeBodegaId);
  const bodegas = useAuthStore((state) => state.bodegas);

  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterName, setFilterName] = useState("");
  const [queryName, setQueryName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [rolesEditorByUser, setRolesEditorByUser] = useState<
    Record<string, { open: boolean; scope: "bodega" | "finca" }>
  >({});
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

  const [operarios, setOperarios] = useState<Operario[]>([]);
  const [operariosSaving, setOperariosSaving] = useState(false);
  const [operariosOpen, setOperariosOpen] = useState(false);
  const [operariosForm, setOperariosForm] = useState({ nombre: "", whatsapp_e164: "" });
  const [operariosNotice, setOperariosNotice] = useState<string | null>(null);
  const [operariosError, setOperariosError] = useState<string | null>(null);

  const [fincas, setFincas] = useState<Finca[]>([]);
  const [fincaNameById, setFincaNameById] = useState<Record<string, string>>({});
  const [bodegaFormByUser, setBodegaFormByUser] = useState<Record<string, BodegaRoleForm>>({});
  const [fincaFormByUser, setFincaFormByUser] = useState<Record<string, FincaRoleForm>>({});
  const [globalRoleByUser, setGlobalRoleByUser] = useState<Record<string, string>>({});
  const actorFromUsers = useMemo(
    () => users.find((item) => item.id === String(actorUser?.id ?? "")),
    [actorUser?.id, users],
  );

  const currentUserGlobalRoles = useMemo(
    () => normalizeRoles([actorFromUsers?.roles_globales, actorUser?.roles_globales, (actorUser as { rol?: string } | null)?.rol]),
    [actorFromUsers?.roles_globales, actorUser?.roles_globales, actorUser],
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
    // Fallback: si no tenemos metadata completa de roles en /auth/me,
    // no ocultamos CRUD por frontend y delegamos validación al backend.
    if (!actorFromUsers && Boolean(activeBodegaId)) return true;
    return false;
  }, [activeBodegaId, actorFromUsers, canManageBodegaRoles, isAdminSistema]);

  const hydrateUsersWithDetail = async (list: AuthUser[]) => {
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
  };

  const loadUsers = async (name?: string) => {
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
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  useEffect(() => {
    if (!activeBodegaId) {
      setFincas([]);
      return;
    }
    fetchFincas(String(activeBodegaId))
      .then((data) => setFincas(data ?? []))
      .catch(() => setFincas([]));
  }, [activeBodegaId]);

  useEffect(() => {
    void loadOperarios();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        next[user.id] = user.roles_globales.includes("admin_sistema")
          ? "admin_sistema"
          : ROLES_GLOBALES[0];
      }
      return next;
    });
  }, [users]);

  const uniqueBodegaNames = useMemo(() => {
    const set = new Set<string>();
    for (const user of users) {
      for (const bodega of user.bodegas) {
        set.add(bodega.nombre);
      }
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
        if (!fincaId) continue;
        if (known.has(fincaId)) continue;
        missingIds.add(fincaId);
      }
    }
    if (missingIds.size === 0) return;
    let mounted = true;
    Promise.all(
      Array.from(missingIds).map(async (fincaId) => {
        try {
          const detail = await fetchFincaById(fincaId);
          const label = resolveFincaDisplayName(detail, fincaId);
          return [fincaId, label] as const;
        } catch {
          return [fincaId, fincaId] as const;
        }
      }),
    ).then((entries) => {
      if (!mounted) return;
      setFincaNameById((prev) => ({
        ...prev,
        ...Object.fromEntries(entries),
      }));
    });
    return () => {
      mounted = false;
    };
  }, [fincaNameById, fincaOptions, users]);

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

  useEffect(() => {
    setCrudForm((prev) => {
      if (prev.bodegaId) return prev;
      if (activeBodegaId) return { ...prev, bodegaId: String(activeBodegaId) };
      if (bodegas[0]?.bodega_id) return { ...prev, bodegaId: String(bodegas[0].bodega_id) };
      return prev;
    });
  }, [activeBodegaId, bodegas]);

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

  const loadOperarios = async () => {
    if (!activeBodegaId) { setOperarios([]); return; }
    try {
      setOperarios(await fetchOperariosByBodega(activeBodegaId));
    } catch {
      setOperarios([]);
    }
  };

  const onCreateOperario = async () => {
    if (!activeBodegaId) return;
    if (!operariosForm.nombre.trim()) {
      setOperariosError("El nombre es obligatorio.");
      return;
    }
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
    const ok = window.confirm(`¿Desactivar a "${op.nombre}"?`);
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
    if (!canManageUserCrud) {
      setError("No tenés permisos para crear/editar usuarios.");
      return;
    }
    if (!crudForm.nombre.trim()) {
      setError("Nombre obligatorio.");
      return;
    }
    if (!crudForm.email.trim()) {
      setError("Email obligatorio.");
      return;
    }

    setCrudSaving(true);
    setError(null);
    setNotice(null);
    try {
      if (crudMode === "create") {
        if (!crudForm.password.trim()) {
          setError("Password obligatoria para alta.");
          return;
        }
        const bodegaId = isAdminSistema
          ? crudForm.bodegaId
          : String(activeBodegaId ?? crudForm.bodegaId ?? "");
        if (!bodegaId) {
          setError("Seleccioná una bodega.");
          return;
        }
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
        const payload: {
          nombre?: string;
          email?: string;
          password?: string;
          is_active?: boolean;
          whatsapp?: string | null;
        } = {
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
    if (!canManageUserCrud) {
      setError("No tenés permisos para eliminar usuarios.");
      return;
    }
    if (!isAdminSistema && target.roles_globales.includes("admin_sistema")) {
      setError("No podés eliminar un usuario con rol global admin_sistema.");
      return;
    }
    const ok = window.confirm(`¿Dar de baja al usuario "${target.nombre}"?`);
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

  const toggleRolesEditor = (userId: string) => {
    setRolesEditorByUser((prev) => {
      const current = prev[userId] ?? { open: false, scope: "bodega" as const };
      return {
        ...prev,
        [userId]: { ...current, open: !current.open },
      };
    });
  };

  const onAssignBodegaRole = async (userId: string) => {
    if (!canManageBodegaRoles) {
      setError("No tenés permisos para asignar roles de bodega.");
      return;
    }
    const form = bodegaFormByUser[userId];
    if (!form?.bodegaId.trim()) {
      setError("Seleccioná una bodega para asignar el rol.");
      return;
    }
    setBusyUserId(userId);
    setError(null);
    setNotice(null);
    try {
      const expectedRoles = new Set(form.rolesEnBodega.map((role) => role.toLowerCase()));
      await updateUserBodegaRoleByName({
        userId,
        bodegaId: form.bodegaId.trim(),
        bodegaName: form.bodegaName.trim(),
        rolesEnBodega: form.rolesEnBodega,
      });
      const refreshed = await fetchAuthUserById(userId);
      setUsers((prev) => prev.map((item) => (item.id === userId ? refreshed : item)));
      const targetBodega = refreshed.bodegas.find(
        (b) => String(b.bodega_id) === form.bodegaId.trim(),
      );
      const actualRoles = normalizeRoles(
        targetBodega?.roles_en_bodega ??
          (targetBodega?.rol_en_bodega ? [targetBodega.rol_en_bodega] : []),
      );
      const actualSet = new Set(actualRoles);
      const matchesExpected = areRoleSetsEqual(expectedRoles, actualSet);
      setBodegaFormByUser((prev) => ({
        ...prev,
        [userId]: {
          bodegaId: form.bodegaId,
          bodegaName: form.bodegaName,
          rolesEnBodega: actualRoles,
        },
      }));
      if (!matchesExpected) {
        setNotice(
          "Se envió la actualización, pero el backend no devolvió los nuevos roles de bodega en el detalle del usuario.",
        );
      } else {
        setNotice("Roles de bodega actualizados.");
      }
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setBusyUserId(null);
    }
  };

  const onAssignFincaRole = async (userId: string) => {
    if (!canManageFincaRoles) {
      setError("No tenés permisos para asignar roles de finca.");
      return;
    }
    const form = fincaFormByUser[userId];
    if (!form?.fincaId.trim()) {
      setError("Seleccioná una finca para asignar roles.");
      return;
    }
    if (!isAdminSistema && !canManageBodegaRoles) {
      const allowed = new Set(currentUserManagedFincaIds);
      if (!allowed.has(form.fincaId)) {
        setError("Solo podés asignar roles en tus fincas.");
        return;
      }
    }
    setBusyUserId(userId);
    setError(null);
    setNotice(null);
    try {
      const expectedRoles = new Set(form.rolesEnFinca.map((role) => role.toLowerCase()));
      await updateUserFincaRoles({
        userId,
        fincaId: form.fincaId,
        rolesEnFinca: form.rolesEnFinca,
      });
      const refreshed = await fetchAuthUserById(userId);
      setUsers((prev) => prev.map((item) => (item.id === userId ? refreshed : item)));
      const targetFinca = (refreshed.fincas ?? []).find(
        (finca) => String(finca.finca_id ?? "") === form.fincaId,
      );
      const actualRoles = normalizeRoles(
        targetFinca?.roles_en_finca ??
          (targetFinca?.rol_en_finca ? [targetFinca.rol_en_finca] : []),
      );
      const actualSet = new Set(actualRoles);
      const matchesExpected = targetFinca
        ? areRoleSetsEqual(expectedRoles, actualSet)
        : expectedRoles.size === 0;
      setFincaFormByUser((prev) => ({
        ...prev,
        [userId]: {
          fincaId: form.fincaId,
          rolesEnFinca: actualRoles,
        },
      }));
      if (!matchesExpected) {
        setNotice(
          "Se envió la actualización, pero el backend no devolvió la finca vinculada/roles en el detalle del usuario.",
        );
      } else {
        setNotice("Roles de finca actualizados.");
      }
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setBusyUserId(null);
    }
  };

  const onSetGlobalRole = async (userId: string, enabled: boolean) => {
    if (!isAdminSistema) {
      setError("Solo admin_sistema puede asignar roles globales.");
      return;
    }
    const rolGlobal = globalRoleByUser[userId];
    if (!rolGlobal) {
      setError("Seleccioná un rol global.");
      return;
    }
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

  return (
    <div className="min-h-screen bg-secondary px-6 py-10">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <SectionIntro
          title="Usuarios y roles"
          description="Gestión de roles globales, roles por bodega y roles por finca."
        />

        {crudMode === "none" ? (
        <AppCard as="section" padding="md">
          <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
            <AppInput
              type="text"
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              placeholder="Filtrar por nombre de bodega (query: ?name=...)"
              className="w-full"
              list="bodega-name-suggestions"
            />
            <datalist id="bodega-name-suggestions">
              {uniqueBodegaNames.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
            <button
              type="button"
              onClick={() => void onSubmitFilter()}
              className="hidden"
            >
                Buscar
              </button>
            <AppButton type="button" variant="secondary" onClick={() => void onSubmitFilter()}>
              Buscar
            </AppButton>
            <button
              type="button"
              onClick={() => void onClearFilter()}
              className="hidden"
            >
                Limpiar
              </button>
            <AppButton type="button" variant="secondary" onClick={() => void onClearFilter()}>
              Limpiar
            </AppButton>
          </div>
        </AppCard>
        ) : null}

        <AppCard
          as="section"
          padding="md"
          header={(
            <SectionIntro
              title={crudMode === "edit" ? "Editar usuario" : "Administración de usuarios"}
              description={
                crudMode === "none"
                  ? "Primero revisás el listado y después seguís con alta, edición o baja."
                  : "Completá el formulario y luego volvés al listado."
              }
              actions={
                crudMode === "none" && canManageUserCrud ? (
                  <AppButton type="button" variant="secondary" size="sm" onClick={onStartCreate}>
                    Nuevo usuario
                  </AppButton>
                ) : null
              }
            />
          )}
        >

            {!canManageUserCrud ? (
              <NoticeBanner>
                No tenés permisos para CRUD de usuarios. Requiere `admin_bodega`, `encargado_bodega` o `admin_sistema`.
              </NoticeBanner>
            ) : crudMode !== "none" ? (
              <div className="grid gap-2 rounded-[var(--radius-lg)] border border-[color:var(--border-default)] bg-[color:var(--surface-soft)] p-3 md:grid-cols-2">
                <AppInput
                  value={crudForm.nombre}
                  onChange={(e) => setCrudForm((prev) => ({ ...prev, nombre: e.target.value }))}
                  placeholder="Nombre"
                />
                <AppInput
                  value={crudForm.email}
                  onChange={(e) => setCrudForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="Email"
                />
                <AppInput
                  type="password"
                  value={crudForm.password}
                  onChange={(e) => setCrudForm((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder={crudMode === "create" ? "Password" : "Password (opcional)"}
                />
                <AppInput
                  type="tel"
                  value={crudForm.whatsapp}
                  onChange={(e) => setCrudForm((prev) => ({ ...prev, whatsapp: e.target.value }))}
                  placeholder="WhatsApp E.164 (ej: +5491112345678)"
                />
                {isAdminSistema ? (
                  <AppSelect
                    value={crudForm.bodegaId}
                    onChange={(e) => setCrudForm((prev) => ({ ...prev, bodegaId: e.target.value }))}
                  >
                    <option value="">Seleccionar bodega</option>
                    {bodegas.map((bodega) => (
                      <option key={bodega.bodega_id} value={bodega.bodega_id}>
                        {bodega.nombre}
                      </option>
                    ))}
                  </AppSelect>
                ) : (
                  <div className="rounded-[var(--radius-md)] border border-[color:var(--border-default)] bg-white px-3 py-2 text-xs text-[color:var(--text-ink-muted)]">
                    Bodega: {bodegas.find((b) => String(b.bodega_id) === String(activeBodegaId))?.nombre ?? "Bodega activa"}
                  </div>
                )}
                <label className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm text-[color:var(--text-ink)]">
                  <input
                    type="checkbox"
                    checked={crudForm.is_active}
                    onChange={(e) => setCrudForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                  />
                  Usuario activo
                </label>
                <div className="md:col-span-2">
                  <p className="mb-1 text-xs font-semibold text-[color:var(--text-accent)]">Roles en bodega (alta)</p>
                  <div className="flex flex-wrap gap-3 rounded-[var(--radius-md)] border border-[color:var(--border-default)] bg-white p-3">
                    {ROLES_BODEGA.map((role) => {
                      const checked = crudForm.rolesEnBodega.includes(role);
                      return (
                        <label key={`crud-${role}`} className="flex items-center gap-2 text-xs text-[color:var(--text-ink)]">
                          <input
                            type="checkbox"
                            checked={checked}
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
                      );
                    })}
                  </div>
                </div>
                <div className="md:col-span-2 flex gap-2">
                  <AppButton type="button" variant="secondary" size="sm" disabled={crudSaving} onClick={() => void onSubmitCrud()}>
                    {crudSaving
                      ? "Guardando..."
                      : crudMode === "edit"
                        ? "Guardar cambios"
                        : "Crear usuario"}
                  </AppButton>
                  <AppButton type="button" variant="ghost" size="sm" disabled={crudSaving} onClick={resetCrud}>
                    Volver
                  </AppButton>
                </div>

              </div>
            ) : (
              <NoticeBanner>
                Podés crear usuarios nuevos o editar/baja desde cada tarjeta.
              </NoticeBanner>
            )}
          </AppCard>

        {canManageBodegaRoles && crudMode === "none" ? (
          <AppCard
            as="section"
            padding="md"
            header={(
              <SectionIntro
                title="Operarios de campo"
                description="Personas sin cuenta en el sistema que pueden ser asignadas a tareas."
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
              <div className="grid gap-2 rounded-[var(--radius-lg)] border border-[color:var(--border-default)] bg-[color:var(--surface-soft)] p-3 md:grid-cols-2">
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
                    {operariosSaving ? "Creando..." : "Crear operario"}
                  </AppButton>
                  <AppButton type="button" variant="ghost" size="sm" onClick={() => { setOperariosOpen(false); setOperariosForm({ nombre: "", whatsapp_e164: "" }); }}>
                    Cancelar
                  </AppButton>
                </div>
              </div>
            ) : null}

            {operariosError ? <NoticeBanner tone="danger" className="mt-2">{operariosError}</NoticeBanner> : null}
            {operariosNotice ? <NoticeBanner tone="success" className="mt-2">{operariosNotice}</NoticeBanner> : null}

            <div className="mt-3 space-y-2">
              {operarios.length === 0 ? (
                <NoticeBanner>Sin operarios de campo registrados para esta bodega.</NoticeBanner>
              ) : (
                operarios.map((op) => (
                  <div key={op.user_id} className="flex items-center justify-between rounded-[var(--radius-lg)] border border-[color:var(--border-default)] bg-white px-3 py-2">
                    <div>
                      <span className="text-sm font-semibold text-[color:var(--text-ink)]">{op.nombre}</span>
                      {op.whatsapp_e164 ? (
                        <span className="ml-2 text-xs text-[color:var(--text-ink-muted)]">{op.whatsapp_e164}</span>
                      ) : null}
                      {!op.is_active ? (
                        <span className="ml-2 rounded-full border border-[color:var(--feedback-neutral-border)] bg-[color:var(--feedback-neutral-bg)] px-2 py-0.5 text-xs text-[color:var(--feedback-neutral-text)]">Inactivo</span>
                      ) : null}
                    </div>
                    <AppButton type="button" variant="danger" size="sm" onClick={() => void onDeleteOperario(op)}>
                      Desactivar
                    </AppButton>
                  </div>
                ))
              )}
            </div>
          </AppCard>
        ) : null}

        {error && (
          <NoticeBanner tone="danger">
            {error}
          </NoticeBanner>
        )}
        {notice && (
          <NoticeBanner tone="success">
            {notice}
          </NoticeBanner>
        )}

        {crudMode === "none" ? (
        <AppCard
          as="section"
          padding="md"
          header={(
            <SectionIntro
              title="Listado de usuarios"
              description={
                queryName
                  ? `Resultado filtrado por: ${queryName}`
                  : "Usuarios disponibles para la bodega y filtros actuales."
              }
            />
          )}
        >
          {loading ? (
            <NoticeBanner>Cargando usuarios…</NoticeBanner>
          ) : users.length === 0 ? (
            <NoticeBanner>No hay usuarios para el filtro actual.</NoticeBanner>
          ) : (
            <div className="space-y-4">
              {users.map((user) => {
                const isSelf = String(user.id) === String(actorUser?.id ?? "");
                const canManageBodegaRolesForTarget = canManageBodegaRoles || (isSelf && isAdminSistema);
                const canManageFincaRolesForTarget = canManageFincaRoles || (isSelf && isAdminSistema);
                const bodegaForm = bodegaFormByUser[user.id] ?? {
                  bodegaId: "",
                  bodegaName: "",
                  rolesEnBodega: [ROLES_BODEGA[0]],
                };
                const fincaForm = fincaFormByUser[user.id] ?? {
                  fincaId: "",
                  rolesEnFinca: [ROLES_FINCA[0]],
                };
                const globalRole = globalRoleByUser[user.id] ?? ROLES_GLOBALES[0];
                const isBusy = busyUserId === user.id;

                return (
                  <article
                    key={user.id}
                    className="rounded-[var(--radius-xl)] border border-[color:var(--border-default)] bg-white/95 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-[color:var(--text-ink)]">{user.nombre}</div>
                        <div className="text-xs text-[color:var(--text-ink-muted)]">
                          {user.email ?? "Sin email"} · ID: {user.id}
                        </div>
                        {user.whatsapp_e164 ? (
                          <div className="text-xs text-[color:var(--text-ink-muted)]">WhatsApp: {user.whatsapp_e164}</div>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2">
                        {user.must_change_password ? (
                          <div className="rounded-full border border-[color:var(--feedback-warning-border)] bg-[color:var(--feedback-warning-bg)] px-2 py-1 text-xs font-semibold text-[color:var(--feedback-warning-text)]">
                            Pendiente de activación
                          </div>
                        ) : null}
                        {user.roles_globales.includes("bot_agent") ? (
                          <div className="rounded-full border border-[color:var(--border-default)] bg-[color:var(--surface-soft)] px-2 py-1 text-xs font-semibold text-[color:var(--accent-primary)]">
                            Bot
                          </div>
                        ) : null}
                        <div
                          className={[
                            "rounded-full px-2 py-1 text-xs font-semibold",
                            user.is_active
                              ? "border border-[color:var(--feedback-success-border)] bg-[color:var(--feedback-success-bg)] text-[color:var(--feedback-success-text)]"
                              : "border border-[color:var(--feedback-neutral-border)] bg-[color:var(--feedback-neutral-bg)] text-[color:var(--feedback-neutral-text)]",
                          ].join(" ")}
                        >
                          {user.is_active ? "Activo" : "Inactivo"}
                        </div>
                        {canManageUserCrud ? (
                          <>
                            <button
                              type="button"
                              onClick={() => onStartEditUser(user)}
                              className="hidden"
                            >
                              Editar
                            </button>
                            <AppButton type="button" variant="secondary" size="sm" onClick={() => onStartEditUser(user)}>
                              Editar
                            </AppButton>
                            <button
                              type="button"
                              disabled={deletingUserId === user.id}
                              onClick={() => void onDeleteUser(user)}
                              className="hidden"
                            >
                              {deletingUserId === user.id ? "Procesando..." : "Baja"}
                            </button>
                            <AppButton
                              type="button"
                              variant="danger"
                              size="sm"
                              disabled={deletingUserId === user.id}
                              onClick={() => void onDeleteUser(user)}
                            >
                              {deletingUserId === user.id ? "Procesando..." : "Baja"}
                            </AppButton>
                          </>
                        ) : null}
                      </div>
                    </div>

                    {(() => {
                      const editor = rolesEditorByUser[user.id] ?? { open: false, scope: "bodega" as const };
                      return (
                        <div className="mt-3 rounded-[var(--radius-lg)] border border-[color:var(--border-default)] bg-[color:var(--surface-soft)] p-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-semibold text-[color:var(--text-accent)]">Roles del usuario</p>
                            <AppButton type="button" variant="secondary" size="sm" onClick={() => toggleRolesEditor(user.id)}>
                              {editor.open ? "Cerrar" : "Editar roles"}
                            </AppButton>
                          </div>

                          <div className="mt-2 grid gap-2 text-xs text-[color:var(--text-ink-muted)] md:grid-cols-3">
                            <div>
                              <span className="font-semibold text-[color:var(--text-ink)]">Globales:</span>{" "}
                              {user.roles_globales.length > 0 ? user.roles_globales.join(", ") : "Sin roles"}
                            </div>
                            <div>
                              <span className="font-semibold text-[color:var(--text-ink)]">Bodega:</span>{" "}
                              {user.bodegas.length > 0
                                ? user.bodegas
                                    .map((bodega) => `${bodega.nombre} (${extractBodegaRoles(bodega).join(", ") || "sin roles"})`)
                                    .join(" · ")
                                : "Sin bodegas vinculadas"}
                            </div>
                            <div>
                              <span className="font-semibold text-[color:var(--text-ink)]">Finca:</span>{" "}
                              {(user.fincas ?? []).length > 0
                                ? (user.fincas ?? [])
                                    .map((finca) => {
                                      const fincaId = String(finca.finca_id ?? "");
                                      const fincaNombre =
                                        fincaLabelById.get(fincaId) ??
                                        resolveFincaDisplayName(finca, fincaId) ??
                                        fincaId;
                                      return `${fincaNombre} (${extractFincaRoles(finca).join(", ") || "sin roles"})`;
                                    })
                                    .join(" · ")
                                : "Sin fincas vinculadas"}
                            </div>
                          </div>

                          {editor.open ? (
                            <div className="mt-3 space-y-2 rounded-[var(--radius-md)] border border-[color:var(--border-default)] bg-white p-3">
                              <AppSelect
                                value={editor.scope}
                                onChange={(e) =>
                                  setRolesEditorByUser((prev) => ({
                                    ...prev,
                                    [user.id]: {
                                      ...editor,
                                      open: true,
                                      scope: e.target.value as "bodega" | "finca",
                                    },
                                  }))
                                }
                              >
                                <option value="bodega">Bodega</option>
                                <option value="finca">Finca</option>
                              </AppSelect>

                              {editor.scope === "bodega" ? (
                                <div className="space-y-2">
                                  <AppSelect
                                    value={bodegaForm.bodegaId}
                                    onChange={(e) => {
                                      const selectedBodegaId = e.target.value;
                                      const selectedBodega = user.bodegas.find(
                                        (b) => String(b.bodega_id) === selectedBodegaId,
                                      );
                                      setBodegaFormByUser((prev) => ({
                                        ...prev,
                                        [user.id]: {
                                          ...bodegaForm,
                                          bodegaId: selectedBodegaId,
                                          bodegaName: selectedBodega?.nombre ?? "",
                                          rolesEnBodega: selectedBodega
                                            ? extractBodegaRoles(selectedBodega)
                                            : [],
                                        },
                                      }));
                                    }}
                                    className="w-full"
                                    disabled={!canManageBodegaRolesForTarget}
                                  >
                                    <option value="">Seleccionar bodega</option>
                                    {user.bodegas.map((bodega) => (
                                      <option key={`${user.id}-${bodega.bodega_id}`} value={bodega.bodega_id}>
                                        {bodega.nombre}
                                      </option>
                                    ))}
                                  </AppSelect>
                                  <div className="space-y-1">
                                    {ROLES_BODEGA.map((role) => {
                                      const checked = bodegaForm.rolesEnBodega.includes(role);
                                      return (
                                        <label key={`${user.id}-bodega-edit-${role}`} className="flex items-center gap-2 text-xs text-[color:var(--text-ink)]">
                                          <input
                                            type="checkbox"
                                            checked={checked}
                                            disabled={!canManageBodegaRolesForTarget}
                                            onChange={(e) =>
                                              setBodegaFormByUser((prev) => {
                                                const current = prev[user.id] ?? bodegaForm;
                                                const currentRoles = current.rolesEnBodega;
                                                const nextRoles = e.target.checked
                                                  ? Array.from(new Set([...currentRoles, role]))
                                                  : currentRoles.filter((item) => item !== role);
                                                return {
                                                  ...prev,
                                                  [user.id]: { ...current, rolesEnBodega: nextRoles },
                                                };
                                              })
                                            }
                                          />
                                          {role}
                                        </label>
                                      );
                                    })}
                                  </div>
                                  <AppButton type="button" variant="secondary" size="sm" disabled={isBusy || !canManageBodegaRolesForTarget} onClick={() => void onAssignBodegaRole(user.id)}>
                                    Guardar roles bodega
                                  </AppButton>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <AppSelect
                                    value={fincaForm.fincaId}
                                    onChange={(e) => {
                                      const selectedFincaId = e.target.value;
                                      const existingRoles =
                                        (user.fincas ?? []).find(
                                          (finca) => String(finca.finca_id ?? "") === selectedFincaId,
                                        )?.roles_en_finca ??
                                        (user.fincas ?? []).find(
                                          (finca) => String(finca.finca_id ?? "") === selectedFincaId,
                                        )?.rol_en_finca ??
                                        [];
                                      setFincaFormByUser((prev) => ({
                                        ...prev,
                                        [user.id]: {
                                          ...fincaForm,
                                          fincaId: selectedFincaId,
                                          rolesEnFinca: normalizeRoles(existingRoles),
                                        },
                                      }));
                                    }}
                                    className="w-full"
                                    disabled={!canManageFincaRolesForTarget}
                                  >
                                    <option value="">Seleccionar finca</option>
                                    {fincaOptions
                                      .filter((finca) => {
                                        if (isAdminSistema || canManageBodegaRolesForTarget) return true;
                                        return currentUserManagedFincaIds.includes(finca.id);
                                      })
                                      .map((finca) => (
                                        <option key={finca.id} value={finca.id}>
                                          {finca.label}
                                        </option>
                                      ))}
                                  </AppSelect>
                                  <div className="space-y-1">
                                    {ROLES_FINCA.map((role) => {
                                      const checked = fincaForm.rolesEnFinca.includes(role);
                                      return (
                                        <label key={`${user.id}-finca-edit-${role}`} className="flex items-center gap-2 text-xs text-[color:var(--text-ink)]">
                                          <input
                                            type="checkbox"
                                            checked={checked}
                                            disabled={!canManageFincaRolesForTarget || !fincaForm.fincaId}
                                            onChange={(e) =>
                                              setFincaFormByUser((prev) => {
                                                const current = prev[user.id] ?? fincaForm;
                                                const currentRoles = current.rolesEnFinca;
                                                const nextRoles = e.target.checked
                                                  ? Array.from(new Set([...currentRoles, role]))
                                                  : currentRoles.filter((item) => item !== role);
                                                return {
                                                  ...prev,
                                                  [user.id]: { ...current, rolesEnFinca: nextRoles },
                                                };
                                              })
                                            }
                                          />
                                          {role}
                                        </label>
                                      );
                                    })}
                                  </div>
                                  <AppButton type="button" variant="secondary" size="sm" disabled={isBusy || !canManageFincaRolesForTarget} onClick={() => void onAssignFincaRole(user.id)}>
                                    Guardar roles finca
                                  </AppButton>
                                </div>
                              )}

                              {isAdminSistema ? (
                                <div className="border-t border-[color:var(--border-default)] pt-2">
                                  <p className="mb-1 text-xs font-semibold text-[color:var(--text-accent)]">Rol global</p>
                                  <div className="flex gap-2">
                                    <AppSelect
                                      value={globalRole}
                                      onChange={(e) =>
                                        setGlobalRoleByUser((prev) => ({
                                          ...prev,
                                          [user.id]: e.target.value,
                                        }))
                                      }
                                    >
                                      {ROLES_GLOBALES.map((role) => (
                                        <option key={role} value={role}>
                                          {role}
                                        </option>
                                      ))}
                                    </AppSelect>
                                    <AppButton type="button" variant="secondary" size="sm" disabled={isBusy} onClick={() => void onSetGlobalRole(user.id, true)}>
                                      Asignar global
                                    </AppButton>
                                    <AppButton type="button" variant="ghost" size="sm" disabled={isBusy} onClick={() => void onSetGlobalRole(user.id, false)}>
                                      Quitar global
                                    </AppButton>
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      );
                    })()}
                  </article>
                );
              })}
            </div>
          )}
        </AppCard>
        ) : null}
      </div>
    </div>
  );
};

export default Usuarios;
