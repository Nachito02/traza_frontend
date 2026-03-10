import { useEffect, useMemo } from "react";
import { LogOut, Menu } from "lucide-react";
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
    <header className="w-full  bg-secondary  px-6">
      <div className="mx-auto flex w-full  items-center justify-between  py-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenMenu}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/20 text-text md:hidden"
            aria-label="Abrir menú"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-4 text-xs text-[#6B3A3F] md:flex">
            <div className="text-text">Bodega:</div>
            {canSwitchBodega ? (
              <div className="flex items-center gap-2">
                <select
                  value={String(activeBodegaId ?? "")}
                  onChange={(event) => setActiveBodega(event.target.value)}
                  className="rounded border border-[#C9A961]/40 bg-white px-2 py-1 text-xs text-[#3D1B1F]"
                >
                  <option value="">Seleccionar</option>
                  {bodegas.map((bodega) => (
                    <option key={bodega.bodega_id} value={bodega.bodega_id}>
                      {bodega.nombre}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="font-medium text-text">
                {activeBodega?.nombre ?? "Sin seleccionar"}
              </div>
            )}
            <div>
              <span className=" text-text">Campaña:</span>{" "}
              {campanias.length > 0 ? (
                <select
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
                  className="rounded border border-[#C9A961]/40 bg-white px-2 py-1 text-xs text-[#3D1B1F]"
                >
                  {campanias.map((campania) => {
                    const id = String(campania.campania_id ?? campania.id ?? "");
                    return (
                      <option key={id} value={id}>
                        {campania.nombre}
                      </option>
                    );
                  })}
                </select>
              ) : (
                <span className="font-medium text-text">
                  {activeCampania?.nombre ?? "Sin campaña activa"}
                </span>
              )}
            </div>
            <div>
              <span className=" text-text">Usuario:</span>{" "}
              <span className="font-medium  text-text">
                {user?.nombre ?? user?.email ?? "Usuario"}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void logout()}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-lg border border-[#C9A961]/40 px-3 py-2 text-sm text-text transition hover:border-[#C9A961] hover:bg-[#F8F3EE]"
          >
            <LogOut className="h-4 w-4" />
            Salir
          </button>
        </div>
      </div>
    </header>
  );
};

export default Topbar;
