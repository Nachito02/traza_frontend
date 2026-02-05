import { LogOut } from "lucide-react";
import { useAuthStore } from "../store/authStore";

const Topbar = () => {
  const user = useAuthStore((state) => state.user);
  const bodegas = useAuthStore((state) => state.bodegas);
  const activeBodegaId = useAuthStore((state) => state.activeBodegaId);
  const logout = useAuthStore((state) => state.logout);
  const isLoading = useAuthStore((state) => state.isLoading);
  const activeBodega = bodegas.find(
    (bodega) => bodega.bodega_id === activeBodegaId
  );

  return (
    <header className="w-full border-b border-[#C9A961]/30 bg-white/90 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <div className="text-lg font-semibold text-[#3D1B1F]">Traza</div>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-4 text-xs text-[#6B3A3F] md:flex">
            <div>
              <span className="text-[#8B6B3F]">Bodega activa:</span>{" "}
              <span className="font-medium text-[#3D1B1F]">
                {activeBodega?.nombre ?? "Sin seleccionar"}
              </span>
            </div>
            <div>
              <span className="text-[#8B6B3F]">Campaña:</span>{" "}
              <span className="font-medium text-[#3D1B1F]">2025-2026</span>
            </div>
            <div>
              <span className="text-[#8B6B3F]">Usuario:</span>{" "}
              <span className="font-medium text-[#3D1B1F]">
                {user?.nombre ?? user?.email ?? "Usuario"}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void logout()}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-lg border border-[#C9A961]/40 px-3 py-2 text-sm text-[#722F37] transition hover:border-[#C9A961] hover:bg-[#F8F3EE]"
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
