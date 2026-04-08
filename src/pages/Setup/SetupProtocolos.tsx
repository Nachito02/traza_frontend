import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchProtocolosExpanded,
  getDefaultProtocoloId,
  type ProtocoloExpanded,
} from "../../features/protocolos/api";
import { createTrazabilidad } from "../../features/trazabilidades/api";
import { getApiErrorMessage } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import { useCampaniaStore } from "../../store/campaniaStore";

const SetupProtocolos = () => {
  const navigate = useNavigate();
  const activeBodegaId = useAuthStore((state) => state.activeBodegaId);
  const activeCampaniaId = useCampaniaStore((state) => state.activeCampaniaId);
  const [protocolos, setProtocolos] = useState<ProtocoloExpanded[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    fetchProtocolosExpanded()
      .then((data) => {
        if (!mounted) return;
        const loaded = [...(data ?? [])].sort((a, b) => {
          const aProcessCount = (a.protocolo_etapa ?? []).reduce(
            (acc, etapa) => acc + (etapa.protocolo_proceso?.length ?? 0),
            0,
          );
          const bProcessCount = (b.protocolo_etapa ?? []).reduce(
            (acc, etapa) => acc + (etapa.protocolo_proceso?.length ?? 0),
            0,
          );
          return bProcessCount - aProcessCount;
        });
        setProtocolos(loaded);
        const defaultId = getDefaultProtocoloId(loaded);
        if (defaultId) {
          setSelected(defaultId);
        }
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

  const handleContinue = async () => {
    if (!selected) {
      setError("Seleccioná un protocolo para continuar.");
      return;
    }
    const fincaId = sessionStorage.getItem("setupFincaId") ?? "";
    const cuartelId = sessionStorage.getItem("setupCuartelId") ?? "";
    const campaniaId = activeCampaniaId;
    const cuartelCodigo = sessionStorage.getItem("setupCuartelCodigo") ?? "";

    if (!activeBodegaId || !fincaId || !cuartelId || !campaniaId) {
      setError(
        "Faltan datos previos del setup. Completá finca, campaña y cuartel antes de finalizar.",
      );
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await createTrazabilidad({
        bodegaId: String(activeBodegaId),
        protocoloId: selected,
        campaniaId,
        fincaId,
        cuartelId,
        nombre_producto: `Trazabilidad ${cuartelCodigo || cuartelId.slice(0, 8)}`,
      });

      sessionStorage.removeItem("setupFincaId");
      sessionStorage.removeItem("setupFincaNombre");
      sessionStorage.removeItem("setupCuartelId");
      sessionStorage.removeItem("setupCuartelCodigo");
      navigate("/dashboard");
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setSaving(false);
    }
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
                    <div className="mt-1 text-xs text-[#7A4A50]">
                      {(protocolo.protocolo_etapa ?? []).length} etapas ·{" "}
                      {(protocolo.protocolo_etapa ?? []).reduce(
                        (acc, etapa) => acc + (etapa.protocolo_proceso?.length ?? 0),
                        0,
                      )} procesos
                    </div>
                    {selected === id && (
                      <div className="mt-1 text-xs font-medium text-[#8A6B1F]">
                        Protocolo seleccionado por defecto
                      </div>
                    )}
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
          onClick={() => void handleContinue()}
          disabled={saving}
          className="mt-6 rounded-lg border border-[#C9A961]/40 px-4 py-2 text-sm font-semibold text-[#722F37] transition hover:border-[#C9A961] hover:bg-[#F8F3EE] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Creando trazabilidad..." : "Finalizar setup"}
        </button>
      </div>
    </div>
  );
};

export default SetupProtocolos;
