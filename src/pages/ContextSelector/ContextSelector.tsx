import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";

type BodegaContext = {
  id: string | number;
  nombre: string;
  rol: "Admin" | "Encargado" | "Operario";
};

const ContextSelector = () => {
  const navigate = useNavigate();
  const setActiveBodega = useAuthStore((state) => state.setActiveBodega);

  const bodegas = useMemo<BodegaContext[]>(
    () => [
      { id: 1, nombre: "Bodega Andina", rol: "Admin" },
      { id: 2, nombre: "Viñedos del Sur", rol: "Encargado" },
      { id: 3, nombre: "Lomas de Malbec", rol: "Operario" },
    ],
    []
  );

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

        <div className="grid gap-4 md:grid-cols-2">
          {bodegas.map((bodega) => (
            <button
              key={bodega.id}
              type="button"
              onClick={() => {
                setActiveBodega(bodega.id);
                navigate("/dashboard", { replace: true });
              }}
              className="group rounded-2xl border border-[#C9A961]/40 bg-white/90 p-6 text-left shadow-lg transition hover:-translate-y-0.5 hover:border-[#C9A961] hover:shadow-xl"
            >
              <div className="text-lg font-semibold text-[#3D1B1F]">
                {bodega.nombre}
              </div>
              <div className="mt-2 text-sm text-[#7A4A50]">
                Rol:{" "}
                <span className="font-medium text-[#722F37]">
                  {bodega.rol}
                </span>
              </div>
              <div className="mt-4 text-xs text-[#8B4049]/80">
                Click para activar esta bodega
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ContextSelector;
