import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchProtocolos, type Protocolo } from "../../features/protocolos/api";

const SetupProtocolos = () => {
  const navigate = useNavigate();
  const [protocolos, setProtocolos] = useState<Protocolo[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    fetchProtocolos()
      .then((data) => {
        if (!mounted) return;
        setProtocolos(data ?? []);
      })
      .catch(() => {
        if (!mounted) return;
        setError("No se pudieron cargar los protocolos.");
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const handleContinue = () => {
    if (!selected) {
      setError("Seleccioná un protocolo para continuar.");
      return;
    }
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F9F6F2] via-[#F3E7DA] to-[#EAD8C6] px-6 py-10">
      <div className="mx-auto w-full max-w-3xl rounded-2xl bg-white/90 p-8 shadow-lg">
        <h1 className="text-2xl text-[#3D1B1F]">Seleccionar protocolo</h1>
        <p className="mt-2 text-sm text-[#6B3A3F]">
          Paso 4 de 4 del setup guiado.
        </p>

        {loading ? (
          <div className="mt-6 text-sm text-[#7A4A50]">
            Cargando protocolos…
          </div>
        ) : error ? (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : protocolos.length === 0 ? (
          <div className="mt-6 rounded-xl border border-[#C9A961]/30 bg-[#FFF9F0] px-3 py-2 text-sm text-[#6B3A3F]">
            No hay protocolos disponibles.
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {protocolos.map((protocolo) => {
              const id =
                protocolo.protocolo_id ?? protocolo.id ?? protocolo.nombre ?? "";
              return (
                <label
                  key={id}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 text-sm ${
                    selected === id
                      ? "border-[#C9A961] bg-[#FFF9F0]"
                      : "border-[#C9A961]/30 bg-white"
                  }`}
                >
                  <input
                    type="radio"
                    className="mt-1"
                    checked={selected === id}
                    onChange={() => setSelected(id)}
                  />
                  <div>
                    <div className="font-semibold text-[#3D1B1F]">
                      {protocolo.nombre ?? protocolo.codigo ?? "Protocolo"}
                    </div>
                    {protocolo.descripcion && (
                      <div className="mt-1 text-xs text-[#7A4A50]">
                        {protocolo.descripcion}
                      </div>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        )}

        <button
          type="button"
          onClick={handleContinue}
          className="mt-6 rounded-lg border border-[#C9A961]/40 px-4 py-2 text-sm font-semibold text-[#722F37] transition hover:border-[#C9A961] hover:bg-[#F8F3EE]"
        >
          Finalizar setup
        </button>
      </div>
    </div>
  );
};

export default SetupProtocolos;
