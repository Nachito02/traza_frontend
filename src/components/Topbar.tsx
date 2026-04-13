import { useEffect, useMemo } from "react";
import { LogOut, Menu } from "lucide-react";
import { AppButton, AppSelect } from "./ui";
import { useAuthStore } from "../store/authStore";
import { useCampaniaStore } from "../store/campaniaStore";

type TopbarProps = {
  onOpenMenu?: () => void;
};

const Topbar = ({ onOpenMenu }: TopbarProps) => {
  const user = useAuthStore((state) => state.user);
  const bodegas = useAuthStore((state) => state.bodegas);
  const activeBodegaId = useAuthStore((state) => state.activeBodegaId);
  const setActiveBodega = useAuthStore((state) => state.setActiveBodega);
  const logout = useAuthStore((state) => state.logout);
  const isLoading = useAuthStore((state) => state.isLoading);

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
    <header className="w-full bg-[color:var(--surface-base)] px-6 text-[color:var(--text-on-dark)]">
      <div className="mx-auto flex w-full items-center justify-between py-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenMenu}
            className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] border border-[color:var(--border-default)] bg-white/10 text-[color:var(--text-on-dark)] transition hover:bg-white/15 md:hidden"
            aria-label="Abrir menú"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-4 text-xs text-[color:var(--text-on-dark-muted)] md:flex">
            <div className="text-[color:var(--text-on-dark)]">Bodega:</div>
            {canSwitchBodega ? (
              <div className="min-w-[180px]">
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
              </div>
            ) : (
              <div className="font-medium text-[color:var(--text-on-dark)]">
                {activeBodega?.nombre ?? "Sin seleccionar"}
              </div>
            )}
            <div>
              <span className="text-[color:var(--text-on-dark)]">Campaña:</span>{" "}
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
                <span className="font-medium text-[color:var(--text-on-dark)]">
                  {activeCampania?.nombre ?? "Sin campaña activa"}
                </span>
              )}
            </div>
            <div>
              <span className="text-[color:var(--text-on-dark)]">Usuario:</span>{" "}
              <span className="font-medium text-[color:var(--text-on-dark)]">
                {user?.nombre ?? user?.email ?? "Usuario"}
              </span>
            </div>
          </div>
          <AppButton
            type="button"
            onClick={() => void logout()}
            disabled={isLoading}
            variant="secondary"
            size="sm"
            leftSection={<LogOut className="h-4 w-4" />}
          >
            Salir
          </AppButton>
        </div>
      </div>
    </header>
  );
};

export default Topbar;
