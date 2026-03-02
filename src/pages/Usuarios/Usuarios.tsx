import { useEffect, useMemo, useState } from "react";
import { getApiErrorMessage } from "../../lib/api";
import {
  fetchAuthUsers,
  updateUserBodegaRoleByName,
  updateUserGlobalRole,
  type AuthUser,
} from "../../features/users/api";

const ROLES_BODEGA = [
  "admin_bodega",
  "encargado_finca",
  "productor",
  "operador_campo",
  "responsable_calidad_inocuidad",
  "responsable_ssyo",
] as const;

const ROLES_GLOBALES = [
  "super_admin",
  "admin_sistema",
  "auditor",
  "certificador",
] as const;

type BodegaRoleForm = {
  bodegaName: string;
  rolesEnBodega: string[];
};

function extractBodegaRoles(bodega: AuthUser["bodegas"][number]) {
  if (Array.isArray(bodega.roles_en_bodega) && bodega.roles_en_bodega.length > 0) {
    return bodega.roles_en_bodega.map((role) =>
      role === "encargado" ? "encargado_finca" : role,
    );
  }
  if (bodega.rol_en_bodega) {
    return [bodega.rol_en_bodega === "encargado" ? "encargado_finca" : bodega.rol_en_bodega];
  }
  return [];
}

const Usuarios = () => {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterName, setFilterName] = useState("");
  const [queryName, setQueryName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [bodegaFormByUser, setBodegaFormByUser] = useState<
    Record<string, BodegaRoleForm>
  >({});
  const [globalRoleByUser, setGlobalRoleByUser] = useState<Record<string, string>>(
    {},
  );

  const loadUsers = async (name?: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAuthUsers(name);
      setUsers(data ?? []);
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
    setBodegaFormByUser((prev) => {
      const next = { ...prev };
      for (const user of users) {
        const existing = next[user.id];
        if (existing) continue;
        next[user.id] = {
          bodegaName: user.bodegas[0]?.nombre ?? "",
          rolesEnBodega: extractBodegaRoles(user.bodegas[0] ?? ({} as AuthUser["bodegas"][number])),
        };
        if (next[user.id].rolesEnBodega.length === 0) {
          next[user.id].rolesEnBodega = [ROLES_BODEGA[0]];
        }
      }
      return next;
    });

    setGlobalRoleByUser((prev) => {
      const next = { ...prev };
      for (const user of users) {
        if (next[user.id]) continue;
        next[user.id] = user.roles_globales[0] ?? ROLES_GLOBALES[2];
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

  const onAssignBodegaRole = async (userId: string) => {
    const form = bodegaFormByUser[userId];
    if (!form?.bodegaName.trim()) {
      setError("Ingresá el nombre de la bodega para asignar el rol.");
      return;
    }
    setBusyUserId(userId);
    setError(null);
    setNotice(null);
    try {
      await updateUserBodegaRoleByName({
        userId,
        bodegaName: form.bodegaName.trim(),
        rolesEnBodega: form.rolesEnBodega,
      });
      await loadUsers(queryName || undefined);
      setNotice("Roles de bodega actualizados.");
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setBusyUserId(null);
    }
  };

  const onSetGlobalRole = async (userId: string, enabled: boolean) => {
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
        <div>
          <h1 className="text-3xl font-bold text-text">Usuarios y roles</h1>
          <p className="mt-2 text-sm text-text-secondary">
            Gestión de roles globales y roles por bodega.
          </p>
        </div>

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
          {loading ? (
            <div className="text-sm text-text-secondary">Cargando usuarios…</div>
          ) : users.length === 0 ? (
            <div className="text-sm text-text-secondary">
              No hay usuarios para el filtro actual.
            </div>
          ) : (
            <div className="space-y-4">
              {users.map((user) => {
                const bodegaForm = bodegaFormByUser[user.id] ?? {
                  bodegaName: "",
                  rolesEnBodega: [ROLES_BODEGA[0]],
                };
                const globalRole = globalRoleByUser[user.id] ?? ROLES_GLOBALES[2];
                const isBusy = busyUserId === user.id;

                return (
                  <article
                    key={user.id}
                    className="rounded-xl border border-[#C9A961]/30 bg-white/95 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-[#3D1B1F]">
                          {user.nombre}
                        </div>
                        <div className="text-xs text-[#7A4A50]">
                          {user.email ?? "Sin email"} · ID: {user.id}
                        </div>
                      </div>
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
                    </div>

                    <div className="mt-3 grid gap-3 lg:grid-cols-2">
                      <div className="rounded-lg border border-[#C9A961]/20 bg-[#FFF9F0] p-3">
                        <p className="mb-2 text-xs font-semibold text-[#6B3A3F]">
                          Roles globales actuales
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {user.roles_globales.length === 0 ? (
                            <span className="text-xs text-[#7A4A50]">Sin roles globales</span>
                          ) : (
                            user.roles_globales.map((role) => (
                              <span
                                key={`${user.id}-${role}`}
                                className="rounded-full bg-[#EED9BC] px-2 py-1 text-xs text-[#5A2D32]"
                              >
                                {role}
                              </span>
                            ))
                          )}
                        </div>
                        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                          <select
                            value={globalRole}
                            onChange={(e) =>
                              setGlobalRoleByUser((prev) => ({
                                ...prev,
                                [user.id]: e.target.value,
                              }))
                            }
                            className="rounded-lg border border-[#C9A961]/40 px-2 py-2 text-sm text-[#3D1B1F]"
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
                            className="rounded-lg border border-[#C9A961]/40 px-3 py-2 text-xs font-semibold text-[#722F37] disabled:opacity-60"
                          >
                            Asignar
                          </button>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => void onSetGlobalRole(user.id, false)}
                            className="rounded-lg border border-[#C9A961]/40 px-3 py-2 text-xs font-semibold text-[#722F37] disabled:opacity-60"
                          >
                            Quitar
                          </button>
                        </div>
                      </div>

                      <div className="rounded-lg border border-[#C9A961]/20 bg-[#FFF9F0] p-3">
                        <p className="mb-2 text-xs font-semibold text-[#6B3A3F]">
                          Roles por bodega
                        </p>
                        <div className="space-y-1">
                          {user.bodegas.length === 0 ? (
                            <p className="text-xs text-[#7A4A50]">Sin bodegas vinculadas</p>
                          ) : (
                            user.bodegas.map((bodega) => (
                              <div
                                key={`${user.id}-${bodega.bodega_id}`}
                                className="text-xs text-[#7A4A50]"
                              >
                                {bodega.nombre} ·{" "}
                                {extractBodegaRoles(bodega).length > 0
                                  ? extractBodegaRoles(bodega).join(", ")
                                  : "sin roles"}
                              </div>
                            ))
                          )}
                        </div>
                        <div className="mt-3 space-y-2">
                          <input
                            type="text"
                            value={bodegaForm.bodegaName}
                            onChange={(e) =>
                              setBodegaFormByUser((prev) => ({
                                ...prev,
                                [user.id]: {
                                  ...bodegaForm,
                                  bodegaName: e.target.value,
                                },
                              }))
                            }
                            className="w-full rounded-lg border border-[#C9A961]/40 px-2 py-2 text-sm text-[#3D1B1F]"
                            placeholder="Nombre de bodega"
                            list="bodega-name-suggestions"
                          />
                          <div className="space-y-2 rounded-lg border border-[#C9A961]/30 bg-white p-2">
                            {ROLES_BODEGA.map((role) => {
                              const checked = bodegaForm.rolesEnBodega.includes(role);
                              return (
                                <label
                                  key={`${user.id}-${role}`}
                                  className="flex items-center gap-2 text-xs text-[#3D1B1F]"
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(e) =>
                                      setBodegaFormByUser((prev) => {
                                        const current = prev[user.id] ?? bodegaForm;
                                        const currentRoles = current.rolesEnBodega;
                                        const nextRoles = e.target.checked
                                          ? Array.from(new Set([...currentRoles, role]))
                                          : currentRoles.filter((item) => item !== role);
                                        return {
                                          ...prev,
                                          [user.id]: {
                                            ...current,
                                            rolesEnBodega: nextRoles,
                                          },
                                        };
                                      })
                                    }
                                  />
                                  {role}
                                </label>
                              );
                            })}
                          </div>
                          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                            <div className="rounded-lg border border-[#C9A961]/30 bg-[#FFF9F0] px-2 py-2 text-xs text-[#7A4A50]">
                              Seleccionados:{" "}
                              {bodegaForm.rolesEnBodega.length > 0
                                ? bodegaForm.rolesEnBodega.join(", ")
                                : "ninguno"}
                            </div>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => void onAssignBodegaRole(user.id)}
                              className="rounded-lg border border-[#C9A961]/40 px-3 py-2 text-xs font-semibold text-[#722F37] disabled:opacity-60"
                            >
                              Guardar rol
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Usuarios;
