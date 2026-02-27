import { LogOut, Menu } from "lucide-react";
import { useAuthStore } from "../store/authStore";

type TopbarProps = {
  onOpenMenu?: () => void;
};

const Topbar = ({ onOpenMenu }: TopbarProps) => {
  const user = useAuthStore((state) => state.user);
  const bodegas = useAuthStore((state) => state.bodegas);
  const activeBodegaId = useAuthStore((state) => state.activeBodegaId);
  const logout = useAuthStore((state) => state.logout);
  const isLoading = useAuthStore((state) => state.isLoading);
  const activeBodega = bodegas.find(
    (bodega) => bodega.bodega_id === activeBodegaId,
  );

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
          <div className="text-lg font-semibold text-text">Traza</div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-4 text-xs text-[#6B3A3F] md:flex">
            <div>
              <span className="text-text">Bodega activa:</span>{" "}
              <span className="font-medium text-text">
                {activeBodega?.nombre ?? "Sin seleccionar"}
              </span>
            </div>
            <div>
              <span className=" text-text">Campaña:</span>{" "}
              <span className="font-medium  text-text">2025-2026</span>
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
