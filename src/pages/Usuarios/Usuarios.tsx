import { useEffect, useMemo, useState } from "react";
import { fetchFincaById, fetchFincas, type Finca } from "../../features/fincas/api";
import {
  createAuthUser,
  deleteAuthUser,
  fetchAuthUserById,
  fetchAuthUsers,
  patchAuthUser,
  registerBot,
  updateUserBodegaRoleByName,
  updateUserFincaRoles,
  updateUserGlobalRole,
  type AuthUser,
} from "../../features/users/api";
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

  const [botForm, setBotForm] = useState({ nombre: "", email: "", password: "" });
  const [botSaving, setBotSaving] = useState(false);
  const [botSectionOpen, setBotSectionOpen] = useState(false);

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
      bodegaId: String(firstBodega?.bodega_id ?? activeBodegaId ?? ""),
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

  const onRegisterBot = async () => {
    if (!botForm.nombre.trim()) { setError("Nombre del bot obligatorio."); return; }
    if (!botForm.email.trim()) { setError("Email del bot obligatorio."); return; }
    if (!botForm.password.trim()) { setError("Password del bot obligatoria."); return; }
    setBotSaving(true);
    setError(null);
    setNotice(null);
    try {
      await registerBot({
        nombre: botForm.nombre.trim(),
        email: botForm.email.trim(),
        password: botForm.password,
      });
      setNotice(`Bot "${botForm.nombre.trim()}" creado correctamente.`);
      setBotForm({ nombre: "", email: "", password: "" });
      setBotSectionOpen(false);
      await loadUsers(queryName || undefined);
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setBotSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-secondary px-6 py-10">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-text">Usuarios y roles</h1>
          <p className="mt-2 text-sm text-text-secondary">
            Gestión de roles globales, roles por bodega y roles por finca.
          </p>
        </div>

        {crudMode === "none" ? (
        <section className="rounded-2xl bg-primary/30 p-5">
          <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
            <input
              type="text"
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              placeholder="Filtrar por nombre de bodega (query: ?name=...)"
              className="w-full rounded-lg border border-[#C9A961]/40 bg-white/90 px-3 py-2 text-sm text-[#3D1B1F] outline-none"
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
              className="rounded-lg border border-[#C9A961]/40 px-4 py-2 text-sm font-semibold text-text transition hover:bg-primary"
            >
              Buscar
            </button>
            <button
              type="button"
              onClick={() => void onClearFilter()}
              className="rounded-lg border border-[#C9A961]/40 px-4 py-2 text-sm font-semibold text-text transition hover:bg-primary"
            >
              Limpiar
            </button>
          </div>
        </section>
        ) : null}

        <section className="rounded-2xl bg-primary/20 p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-text">
                {crudMode === "edit" ? "Editar usuario" : "Crear usuario"}
              </h2>
              {crudMode === "none" && canManageUserCrud ? (
                <button
                  type="button"
                  onClick={onStartCreate}
                  className="rounded-lg border border-[#C9A961]/40 px-3 py-2 text-xs font-semibold text-text transition hover:bg-primary"
                >
                  Nuevo usuario
                </button>
              ) : null}
            </div>

            {!canManageUserCrud ? (
              <div className="text-xs text-text-secondary">
                No tenés permisos para CRUD de usuarios. Requiere `admin_bodega`, `encargado_bodega` o `admin_sistema`.
              </div>
            ) : crudMode !== "none" ? (
              <div className="grid gap-2 rounded-lg border border-[#C9A961]/30 bg-[#FFF9F0] p-3 md:grid-cols-2">
                <input
                  value={crudForm.nombre}
                  onChange={(e) => setCrudForm((prev) => ({ ...prev, nombre: e.target.value }))}
                  placeholder="Nombre"
                  className="rounded border border-[#C9A961]/40 px-2 py-2 text-sm text-[#3D1B1F]"
                />
                <input
                  value={crudForm.email}
                  onChange={(e) => setCrudForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="Email"
                  className="rounded border border-[#C9A961]/40 px-2 py-2 text-sm text-[#3D1B1F]"
                />
                <input
                  type="password"
                  value={crudForm.password}
                  onChange={(e) => setCrudForm((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder={crudMode === "create" ? "Password" : "Password (opcional)"}
                  className="rounded border border-[#C9A961]/40 px-2 py-2 text-sm text-[#3D1B1F]"
                />
                <input
                  type="tel"
                  value={crudForm.whatsapp}
                  onChange={(e) => setCrudForm((prev) => ({ ...prev, whatsapp: e.target.value }))}
                  placeholder="WhatsApp E.164 (ej: +5491112345678)"
                  className="rounded border border-[#C9A961]/40 px-2 py-2 text-sm text-[#3D1B1F]"
                />
                {isAdminSistema ? (
                  <select
                    value={crudForm.bodegaId}
                    onChange={(e) => setCrudForm((prev) => ({ ...prev, bodegaId: e.target.value }))}
                    className="rounded border border-[#C9A961]/40 px-2 py-2 text-sm text-[#3D1B1F]"
                  >
                    <option value="">Seleccionar bodega</option>
                    {bodegas.map((bodega) => (
                      <option key={bodega.bodega_id} value={bodega.bodega_id}>
                        {bodega.nombre}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="rounded border border-[#C9A961]/40 bg-white px-2 py-2 text-xs text-[#7A4A50]">
                    Bodega: {bodegas.find((b) => String(b.bodega_id) === String(activeBodegaId))?.nombre ?? "Bodega activa"}
                  </div>
                )}
                <label className="flex items-center gap-2 rounded border border-[#C9A961]/40 bg-white px-2 py-2 text-sm text-[#3D1B1F]">
                  <input
                    type="checkbox"
                    checked={crudForm.is_active}
                    onChange={(e) => setCrudForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                  />
                  Usuario activo
                </label>
                <div className="md:col-span-2">
                  <p className="mb-1 text-xs font-semibold text-[#6B3A3F]">Roles en bodega (alta)</p>
                  <div className="flex flex-wrap gap-3 rounded border border-[#C9A961]/30 bg-white p-2">
                    {ROLES_BODEGA.map((role) => {
                      const checked = crudForm.rolesEnBodega.includes(role);
                      return (
                        <label key={`crud-${role}`} className="flex items-center gap-2 text-xs text-[#3D1B1F]">
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
                  <button
                    type="button"
                    disabled={crudSaving}
                    onClick={() => void onSubmitCrud()}
                    className="rounded border border-[#C9A961]/40 px-3 py-2 text-xs font-semibold text-[#722F37] disabled:opacity-60"
                  >
                    {crudSaving
                      ? "Guardando..."
                      : crudMode === "edit"
                        ? "Guardar cambios"
                        : "Crear usuario"}
                  </button>
                  <button
                    type="button"
                    disabled={crudSaving}
                    onClick={resetCrud}
                    className="rounded border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 disabled:opacity-60"
                  >
                    Volver
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-xs text-text-secondary">
                Podés crear usuarios nuevos o editar/baja desde cada tarjeta.
              </div>
            )}
          </section>

        {isAdminSistema && crudMode === "none" ? (
          <section className="rounded-2xl bg-primary/20 p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-text">Gestión de Bots</h2>
                <p className="text-xs text-text-secondary">Solo visible para admin_sistema. Crea agentes bot con acceso por API key.</p>
              </div>
              <button
                type="button"
                onClick={() => setBotSectionOpen((prev) => !prev)}
                className="rounded-lg border border-[#C9A961]/40 px-3 py-2 text-xs font-semibold text-text transition hover:bg-primary"
              >
                {botSectionOpen ? "Cancelar" : "Registrar bot"}
              </button>
            </div>

            {botSectionOpen ? (
              <div className="grid gap-2 rounded-lg border border-[#C9A961]/30 bg-[#FFF9F0] p-3 md:grid-cols-2">
                <input
                  value={botForm.nombre}
                  onChange={(e) => setBotForm((prev) => ({ ...prev, nombre: e.target.value }))}
                  placeholder="Nombre del bot"
                  className="rounded border border-[#C9A961]/40 px-2 py-2 text-sm text-[#3D1B1F]"
                />
                <input
                  value={botForm.email}
                  onChange={(e) => setBotForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="Email del bot"
                  type="email"
                  className="rounded border border-[#C9A961]/40 px-2 py-2 text-sm text-[#3D1B1F]"
                />
                <input
                  value={botForm.password}
                  onChange={(e) => setBotForm((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder="Password del bot"
                  type="password"
                  className="rounded border border-[#C9A961]/40 px-2 py-2 text-sm text-[#3D1B1F]"
                />
                <div className="md:col-span-2 flex gap-2">
                  <button
                    type="button"
                    disabled={botSaving}
                    onClick={() => void onRegisterBot()}
                    className="rounded border border-[#C9A961]/40 px-3 py-2 text-xs font-semibold text-[#722F37] disabled:opacity-60"
                  >
                    {botSaving ? "Registrando..." : "Registrar bot"}
                  </button>
                  <button
                    type="button"
                    disabled={botSaving}
                    onClick={() => { setBotSectionOpen(false); setBotForm({ nombre: "", email: "", password: "" }); }}
                    className="rounded border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 disabled:opacity-60"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-xs text-text-secondary">
                Los bots registrados aparecen en la lista de usuarios con el badge <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700">Bot</span> y el rol global <code>bot_agent</code>.
              </div>
            )}
          </section>
        ) : null}

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

        {crudMode === "none" ? (
        <section className="rounded-2xl bg-primary/20 p-5">
          {loading ? (
            <div className="text-sm text-text-secondary">Cargando usuarios…</div>
          ) : users.length === 0 ? (
            <div className="text-sm text-text-secondary">No hay usuarios para el filtro actual.</div>
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
                    className="rounded-xl border border-[#C9A961]/30 bg-white/95 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-[#3D1B1F]">{user.nombre}</div>
                        <div className="text-xs text-[#7A4A50]">
                          {user.email ?? "Sin email"} · ID: {user.id}
                        </div>
                        {user.whatsapp_e164 ? (
                          <div className="text-xs text-[#7A4A50]">WhatsApp: {user.whatsapp_e164}</div>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2">
                        {user.roles_globales.includes("bot_agent") ? (
                          <div className="rounded-full bg-violet-100 px-2 py-1 text-xs font-semibold text-violet-700">
                            Bot
                          </div>
                        ) : null}
                        <div
                          className={[
                            "rounded-full px-2 py-1 text-xs font-semibold",
                            user.is_active
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-200 text-slate-700",
                          ].join(" ")}
                        >
                          {user.is_active ? "Activo" : "Inactivo"}
                        </div>
                        {canManageUserCrud ? (
                          <>
                            <button
                              type="button"
                              onClick={() => onStartEditUser(user)}
                              className="rounded border border-[#C9A961]/40 px-2 py-1 text-xs font-semibold text-[#722F37]"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              disabled={deletingUserId === user.id}
                              onClick={() => void onDeleteUser(user)}
                              className="rounded border border-red-300 px-2 py-1 text-xs font-semibold text-red-700 disabled:opacity-60"
                            >
                              {deletingUserId === user.id ? "Procesando..." : "Baja"}
                            </button>
                          </>
                        ) : null}
                      </div>
                    </div>

                    {(() => {
                      const editor = rolesEditorByUser[user.id] ?? { open: false, scope: "bodega" as const };
                      return (
                        <div className="mt-3 rounded-lg border border-[#C9A961]/20 bg-[#FFF9F0] p-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-semibold text-[#6B3A3F]">Roles del usuario</p>
                            <button
                              type="button"
                              onClick={() => toggleRolesEditor(user.id)}
                              className="rounded border border-[#C9A961]/40 px-2 py-1 text-xs font-semibold text-[#722F37]"
                            >
                              {editor.open ? "Cerrar" : "Editar roles"}
                            </button>
                          </div>

                          <div className="mt-2 grid gap-2 text-xs text-[#7A4A50] md:grid-cols-3">
                            <div>
                              <span className="font-semibold text-[#3D1B1F]">Globales:</span>{" "}
                              {user.roles_globales.length > 0 ? user.roles_globales.join(", ") : "Sin roles"}
                            </div>
                            <div>
                              <span className="font-semibold text-[#3D1B1F]">Bodega:</span>{" "}
                              {user.bodegas.length > 0
                                ? user.bodegas
                                    .map((bodega) => `${bodega.nombre} (${extractBodegaRoles(bodega).join(", ") || "sin roles"})`)
                                    .join(" · ")
                                : "Sin bodegas vinculadas"}
                            </div>
                            <div>
                              <span className="font-semibold text-[#3D1B1F]">Finca:</span>{" "}
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
                            <div className="mt-3 space-y-2 rounded border border-[#C9A961]/30 bg-white p-3">
                              <select
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
                                className="rounded border border-[#C9A961]/40 px-2 py-2 text-sm text-[#3D1B1F]"
                              >
                                <option value="bodega">Bodega</option>
                                <option value="finca">Finca</option>
                              </select>

                              {editor.scope === "bodega" ? (
                                <div className="space-y-2">
                                  <select
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
                                    className="w-full rounded border border-[#C9A961]/40 px-2 py-2 text-sm text-[#3D1B1F]"
                                    disabled={!canManageBodegaRolesForTarget}
                                  >
                                    <option value="">Seleccionar bodega</option>
                                    {user.bodegas.map((bodega) => (
                                      <option key={`${user.id}-${bodega.bodega_id}`} value={bodega.bodega_id}>
                                        {bodega.nombre}
                                      </option>
                                    ))}
                                  </select>
                                  <div className="space-y-1">
                                    {ROLES_BODEGA.map((role) => {
                                      const checked = bodegaForm.rolesEnBodega.includes(role);
                                      return (
                                        <label key={`${user.id}-bodega-edit-${role}`} className="flex items-center gap-2 text-xs text-[#3D1B1F]">
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
                                  <button
                                    type="button"
                                    disabled={isBusy || !canManageBodegaRolesForTarget}
                                    onClick={() => void onAssignBodegaRole(user.id)}
                                    className="rounded border border-[#C9A961]/40 px-3 py-2 text-xs font-semibold text-[#722F37] disabled:opacity-60"
                                  >
                                    Guardar roles bodega
                                  </button>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <select
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
                                    className="w-full rounded border border-[#C9A961]/40 px-2 py-2 text-sm text-[#3D1B1F]"
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
                                  </select>
                                  <div className="space-y-1">
                                    {ROLES_FINCA.map((role) => {
                                      const checked = fincaForm.rolesEnFinca.includes(role);
                                      return (
                                        <label key={`${user.id}-finca-edit-${role}`} className="flex items-center gap-2 text-xs text-[#3D1B1F]">
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
                                  <button
                                    type="button"
                                    disabled={isBusy || !canManageFincaRolesForTarget}
                                    onClick={() => void onAssignFincaRole(user.id)}
                                    className="rounded border border-[#C9A961]/40 px-3 py-2 text-xs font-semibold text-[#722F37] disabled:opacity-60"
                                  >
                                    Guardar roles finca
                                  </button>
                                </div>
                              )}

                              {isAdminSistema ? (
                                <div className="border-t border-[#C9A961]/30 pt-2">
                                  <p className="mb-1 text-xs font-semibold text-[#6B3A3F]">Rol global</p>
                                  <div className="flex gap-2">
                                    <select
                                      value={globalRole}
                                      onChange={(e) =>
                                        setGlobalRoleByUser((prev) => ({
                                          ...prev,
                                          [user.id]: e.target.value,
                                        }))
                                      }
                                      className="rounded border border-[#C9A961]/40 px-2 py-2 text-sm text-[#3D1B1F]"
                                    >
                                      {ROLES_GLOBALES.map((role) => (
                                        <option key={role} value={role}>
                                          {role}
                                        </option>
                                      ))}
                                    </select>
                                    <button
                                      type="button"
                                      disabled={isBusy}
                                      onClick={() => void onSetGlobalRole(user.id, true)}
                                      className="rounded border border-[#C9A961]/40 px-3 py-2 text-xs font-semibold text-[#722F37] disabled:opacity-60"
                                    >
                                      Asignar global
                                    </button>
                                    <button
                                      type="button"
                                      disabled={isBusy}
                                      onClick={() => void onSetGlobalRole(user.id, false)}
                                      className="rounded border border-[#C9A961]/40 px-3 py-2 text-xs font-semibold text-[#722F37] disabled:opacity-60"
                                    >
                                      Quitar global
                                    </button>
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
        </section>
        ) : null}
      </div>
    </div>
  );
};

export default Usuarios;
