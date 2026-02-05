import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";

const ContextSelector = () => {
  const navigate = useNavigate();
  const setActiveBodega = useAuthStore((state) => state.setActiveBodega);
  const bodegas = useAuthStore((state) => state.bodegas);
  const bodegasLoading = useAuthStore((state) => state.bodegasLoading);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F8F3EE] via-[#F3E6D7] to-[#E7D4C4] p-6">
      <div className="mx-auto w-full max-w-4xl">
        <div className="text-center mb-10">
          <h1 className="text-3xl text-[#3D1B1F] mb-2">
            ¿En qué bodega vas a trabajar?
          </h1>
          <p className="text-sm text-[#6B3A3F]">
            Esto define permisos, datos visibles y acciones habilitadas.
          </p>
        </div>

        {bodegasLoading ? (
          <div className="text-center text-sm text-[#6B3A3F]">
            Cargando bodegas…
          </div>
        ) : bodegas.length === 0 ? (
          <div className="rounded-2xl border border-[#C9A961]/40 bg-white/90 p-6 text-center text-sm text-[#6B3A3F]">
            No se encontraron bodegas para este usuario.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {bodegas.map((bodega) => (
              <button
                key={bodega.bodega_id}
                type="button"
                onClick={() => {
                  setActiveBodega(bodega.bodega_id);
                  navigate("/dashboard", { replace: true });
                }}
                className="group rounded-2xl border border-[#C9A961]/40 bg-white/90 p-6 text-left shadow-lg transition hover:-translate-y-0.5 hover:border-[#C9A961] hover:shadow-xl"
              >
                <div className="text-lg font-semibold text-[#3D1B1F]">
                  {bodega.nombre}
                </div>
                <div className="mt-2 text-sm text-[#7A4A50]">
                  CUIT:{" "}
                  <span className="font-medium text-[#722F37]">
                    {bodega.cuit}
                  </span>
                </div>
                <div className="mt-4 text-xs text-[#8B4049]/80">
                  Click para activar esta bodega
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ContextSelector;
