import { Avatar, Menu as MantineMenu } from "@mantine/core";
import { useEffect, useMemo } from "react";
import { ChevronDown, LogOut, Menu, Settings, Shield, UserCircle2 } from "lucide-react";
import { AppSelect } from "./ui";
import { useAuthStore } from "../store/authStore";
import { useCampaniaStore } from "../store/campaniaStore";
import avatarGeneric from "../assets/avatar-generic.svg";

type TopbarProps = {
  onOpenMenu?: () => void;
};

type ContextFieldProps = {
  label: string;
  children: React.ReactNode;
};

const ContextField = ({ label, children }: ContextFieldProps) => (
  <div className="min-w-[170px] rounded-[var(--radius-lg)] border border-[color:var(--border-shell)] bg-white/5 px-3 py-2.5">
    <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--text-on-dark-muted)]">
      {label}
    </div>
    {children}
  </div>
);

const Topbar = ({ onOpenMenu }: TopbarProps) => {
  const user = useAuthStore((state) => state.user);
  const bodegas = useAuthStore((state) => state.bodegas);
  const activeBodegaId = useAuthStore((state) => state.activeBodegaId);
  const setActiveBodega = useAuthStore((state) => state.setActiveBodega);
  const isLoading = useAuthStore((state) => state.isLoading);
  const logout = useAuthStore((state) => state.logout);

  const campanias = useCampaniaStore((state) => state.campanias);
  const activeCampaniaId = useCampaniaStore((state) => state.activeCampaniaId);
  const setActiveCampania = useCampaniaStore((state) => state.setActiveCampania);
  const clearCampanias = useCampaniaStore((state) => state.clearCampanias);
  const loadCampanias = useCampaniaStore((state) => state.loadCampanias);

  const activeBodega = bodegas.find((bodega) => bodega.bodega_id === String(activeBodegaId));
  const defaultCampania = useMemo(() => {
    if (campanias.length === 0) return null;
    const abiertas = campanias.filter((item) => item.estado === "abierta");
    if (abiertas.length > 0) {
      return [...abiertas].sort(
        (a, b) => b.fecha_inicio.localeCompare(a.fecha_inicio),
      )[0];
    }
    return [...campanias].sort(
      (a, b) => b.fecha_inicio.localeCompare(a.fecha_inicio),
    )[0];
  }, [campanias]);
  const activeCampania = useMemo(() => {
    if (campanias.length === 0) return null;
    const selected = campanias.find(
      (item) => String(item.campania_id ?? item.id ?? "") === String(activeCampaniaId),
    );
    return selected ?? defaultCampania;
  }, [activeCampaniaId, campanias, defaultCampania]);
  const canSwitchBodega = useMemo(() => {
    const roles = Array.isArray(user?.roles_globales) ? user.roles_globales : [];
    const isAdminSistema = roles.includes("admin_sistema");
    return isAdminSistema || bodegas.length > 1;
  }, [bodegas.length, user]);

  useEffect(() => {
    if (!activeBodegaId) {
      clearCampanias();
      return;
    }
    clearCampanias();
    void loadCampanias(activeBodegaId);
  }, [activeBodegaId]);

  return (
    <header className="sticky top-0 z-30 border-b border-[color:var(--border-shell)] bg-[color:var(--surface-shell)]/95 px-4 text-[color:var(--text-on-dark)] backdrop-blur-xl md:px-6">
      <div className="flex w-full items-center justify-between gap-4 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onOpenMenu}
            className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] border border-[color:var(--border-shell)] bg-white/10 text-[color:var(--text-on-dark)] transition hover:border-[color:var(--border-default)] hover:bg-white/15 md:hidden"
            aria-label="Abrir menú"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="hidden min-w-0 md:block">
            <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[color:var(--text-on-dark-muted)]">
              Traza workspace
            </div>
            <div className="mt-1 truncate text-base font-semibold text-[color:var(--text-on-dark)]">
              Centro de control operativo
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-3 md:flex">
            {canSwitchBodega ? (
              <ContextField label="Bodega">
                <AppSelect
                  value={String(activeBodegaId ?? "")}
                  onChange={(event) => setActiveBodega(event.target.value)}
                  uiSize="sm"
                >
                  <option value="">Seleccionar</option>
                  {bodegas.map((bodega) => (
                    <option key={bodega.bodega_id} value={bodega.bodega_id}>
                      {bodega.nombre}
                    </option>
                  ))}
                </AppSelect>
              </ContextField>
            ) : (
              <ContextField label="Bodega">
                <div className="min-h-9 text-sm font-medium text-[color:var(--text-on-dark)]">
                  {activeBodega?.nombre ?? "Sin seleccionar"}
                </div>
              </ContextField>
            )}
            <ContextField label="Campaña">
              {campanias.length > 0 ? (
                <AppSelect
                  value={activeCampaniaId}
                  onChange={(event) => {
                    const selectedId = event.target.value;
                    if (!activeBodegaId) return;
                    const storageKey = `activeCampaniaId:${String(activeBodegaId)}`;
                    if (selectedId) {
                      const selectedCampania = campanias.find(
                        (item) =>
                          String(item.campania_id ?? item.id ?? "") === String(selectedId),
                      );
                      sessionStorage.setItem(storageKey, selectedId);
                      setActiveCampania(selectedId, selectedCampania?.nombre ?? "");
                    } else {
                      sessionStorage.removeItem(storageKey);
                      setActiveCampania("", "");
                    }
                  }}
                  uiSize="sm"
                  className="inline-block min-w-[180px] align-middle"
                >
                  {campanias.map((campania) => {
                    const id = String(campania.campania_id ?? campania.id ?? "");
                    return (
                      <option key={id} value={id}>
                        {campania.nombre}
                      </option>
                    );
                  })}
                </AppSelect>
              ) : (
                <div className="min-h-9 text-sm font-medium text-[color:var(--text-on-dark)]">
                  {activeCampania?.nombre ?? "Sin campaña activa"}
                </div>
              )}
            </ContextField>
          </div>
          <MantineMenu
            position="bottom-end"
            offset={12}
            width={260}
            shadow="md"
            withArrow
            arrowPosition="center"
            styles={{
              dropdown: {
                background: "var(--surface-shell)",
                borderColor: "var(--border-shell)",
                color: "var(--text-on-dark)",
              },
              arrow: {
                background: "var(--surface-shell)",
                borderColor: "var(--border-shell)",
              },
              item: {
                background: "transparent",
                color: "var(--text-on-dark)",
                border: "1px solid transparent",
                "&:hover": {
                  background: "rgba(255, 255, 255, 0.05)",
                  borderColor: "var(--border-shell)",
                  color: "var(--text-on-dark)",
                },
                "&[data-hovered]": {
                  background: "rgba(255, 255, 255, 0.05)",
                  borderColor: "var(--border-shell)",
                  color: "var(--text-on-dark)",
                },
                "&[data-disabled]": {
                  color: "var(--text-on-dark-muted)",
                  opacity: 0.55,
                },
                "&[data-disabled]:hover": {
                  background: "transparent",
                  borderColor: "transparent",
                },
              },
              itemLabel: {
                color: "var(--text-on-dark)",
              },
              itemSection: {
                color: "var(--text-on-dark-muted)",
              },
              label: {
                color: "var(--text-on-dark-muted)",
              },
              divider: {
                borderColor: "var(--border-shell)",
              },
            }}
            classNames={{
              dropdown:
                "overflow-hidden rounded-[var(--radius-xl)] border border-[color:var(--border-shell)] bg-[color:var(--surface-shell)] p-1.5 text-[color:var(--text-on-dark)] shadow-[var(--shadow-raised)]",
              item:
                "rounded-[var(--radius-lg)] px-3 py-2 text-sm transition-all duration-[var(--motion-fast)] data-[disabled=true]:cursor-not-allowed data-[disabled=true]:opacity-55",
              label:
                "px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--text-on-dark-muted)]",
              divider: "my-1 border-[color:var(--border-shell)]",
            }}
          >
            <MantineMenu.Target>
              <button
                type="button"
                disabled={isLoading}
                className="group inline-flex items-center gap-3 rounded-[var(--radius-xl)] border border-[color:var(--border-shell)] bg-[color:var(--surface-shell-raised)] px-2.5 py-2 text-left text-[color:var(--text-on-dark)] shadow-[var(--shadow-soft)] transition hover:border-[color:var(--border-default)] hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Abrir menú de usuario"
              >
                <Avatar
                  src={avatarGeneric}
                  alt="Avatar genérico"
                  radius="xl"
                  size={40}
                  className="shrink-0 border border-[color:var(--border-shell)] bg-[color:var(--surface-base)]"
                />
                <div className="hidden min-w-0 md:block">
                  <div className="truncate text-sm font-semibold text-[color:var(--text-on-dark)]">
                    {user?.nombre ?? "Usuario"}
                  </div>
                  <div className="truncate text-xs text-[color:var(--text-on-dark-muted)]">
                    {user?.email ?? "Sin email"}
                  </div>
                </div>
                <ChevronDown className="h-4 w-4 text-[color:var(--text-on-dark-muted)] transition group-hover:text-[color:var(--text-on-dark)]" />
              </button>
            </MantineMenu.Target>

            <MantineMenu.Dropdown>
              <div className="rounded-[var(--radius-lg)] border border-[color:var(--border-shell)] bg-[color:var(--surface-shell-raised)] px-3 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[color:var(--text-on-dark-muted)]">
                  Cuenta
                </div>
                <div className="mt-2 text-sm font-semibold text-[color:var(--text-on-dark)]">
                  {user?.nombre ?? "Usuario"}
                </div>
                <div className="mt-1 truncate text-xs text-[color:var(--text-on-dark-muted)]">
                  {user?.email ?? "Sin email"}
                </div>
              </div>

              <MantineMenu.Label>Acciones</MantineMenu.Label>
              <MantineMenu.Item leftSection={<UserCircle2 className="h-4 w-4" />} disabled>
                Perfil
              </MantineMenu.Item>
              <MantineMenu.Item leftSection={<Settings className="h-4 w-4" />} disabled>
                User settings
              </MantineMenu.Item>
              <MantineMenu.Item leftSection={<Shield className="h-4 w-4" />} disabled>
                Security settings
              </MantineMenu.Item>
              <MantineMenu.Divider />
              <MantineMenu.Item
                leftSection={<LogOut className="h-4 w-4" />}
                onClick={() => void logout()}
              >
                Salir
              </MantineMenu.Item>
            </MantineMenu.Dropdown>
          </MantineMenu>
        </div>
      </div>
    </header>
  );
};

export default Topbar;
