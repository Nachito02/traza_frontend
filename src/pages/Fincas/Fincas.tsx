import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { useFincasStore } from "../../features/fincas/store";

const Fincas = () => {
  const activeBodegaId = useAuthStore((state) => state.activeBodegaId);
  const fincas = useFincasStore((state) => state.fincas);
  const fincasLoading = useFincasStore((state) => state.loading);
  const fincasError = useFincasStore((state) => state.error);
  const loadFincas = useFincasStore((state) => state.loadFincas);

  useEffect(() => {
    if (!activeBodegaId) return;
    void loadFincas(activeBodegaId);
  }, [activeBodegaId, loadFincas]);

  return (
    <div className="min-h-screen bg-secondary px-6 py-10">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text">Administracion de fincas</h1>
          <p className="mt-2 text-sm text-text-secondary">
            Supervisa y gestiona tus fincas.
          </p>
        </div>

        <section className="mb-8 rounded-2xl  bg-primary/30 p-6 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-text">Fincas</h2>
              <p className="text-xs text-text">
                Primero definí la finca para poder cargar campañas, cuarteles y
                protocolos.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to="/productos/nuevo"
                className="rounded-lg border border-[#C9A961]/40 px-3 py-2 text-xs font-semibold text-text transition hover:bg-primary"
              >
                Nuevo producto
              </Link>
              <Link
                to="/setup/finca"
                className="rounded-lg border border-[#C9A961]/40 px-3 py-2 text-xs font-semibold text-text transition hover:bg-primary"
              >
                Crear finca
              </Link>
            </div>
          </div>

          <div className="mt-4">
            {!activeBodegaId ? (
              <div className="text-xs text-[#7A4A50]">
                Seleccioná una bodega para ver las fincas.
              </div>
            ) : fincasLoading ? (
              <div className="text-xs text-[#7A4A50]">Cargando fincas…</div>
            ) : fincasError ? (
              <div className="text-xs text-red-700">{fincasError}</div>
            ) : fincas.length === 0 ? (
              <div className="text-xs text-text-secondary">
                No hay fincas cargadas.
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {fincas.map((finca) => (
                  <Link
                    key={finca.finca_id ?? finca.id ?? finca.nombre}
                    to={`/fincas/${finca.finca_id ?? finca.id}`}
                    className="rounded-xl border border-[#C9A961]/30 bg-[#FFF9F0] p-4 transition hover:border-[#C9A961] hover:shadow-md"
                  >
                    <div className="text-sm font-semibold text-[#3D1B1F]">
                      {finca.nombre ??
                        finca.nombre_finca ??
                        finca.name ??
                        "Finca sin nombre"}
                    </div>
                    <div className="mt-1 text-xs text-[#7A4A50]">
                      {finca.ubicacion ?? "Ubicación sin definir"}
                    </div>
                    <div className="mt-2 text-[11px] text-[#8B4049]/80">
                      Ver detalles y gestionar producto
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

      </div>
    </div>
  );
};

export default Fincas;
