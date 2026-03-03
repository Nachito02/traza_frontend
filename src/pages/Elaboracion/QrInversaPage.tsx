import { useState } from "react";
import { fetchTrazabilidadInversaPorQr, type TrazabilidadQrResponse } from "../../features/elaboracion/api";
import { getApiErrorMessage } from "../../lib/api";

export default function QrInversaPage() {
  const [codigoQr, setCodigoQr] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TrazabilidadQrResponse | null>(null);

  const onSubmit = async () => {
    if (!codigoQr.trim()) {
      setError("Ingresá un código QR.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await fetchTrazabilidadInversaPorQr(codigoQr.trim());
      setResult(data);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-[#3D1B1F]">Producto y Trazabilidad</h2>
      <p className="mt-1 text-xs text-[#7A4A50]">
        Etapa final del proceso. El detalle funcional completo de producto y trazabilidad se define en
        la próxima iteración.
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
        <input
          value={codigoQr}
          onChange={(event) => setCodigoQr(event.target.value)}
          placeholder="Código de envase / QR (consulta preliminar)"
          className="rounded border border-[#C9A961]/40 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={() => void onSubmit()}
          disabled={loading}
          className="rounded border border-[#C9A961]/50 px-4 py-2 text-sm font-semibold text-[#722F37] disabled:opacity-60"
        >
          {loading ? "Consultando..." : "Consultar"}
        </button>
      </div>

      {error ? (
        <div className="mt-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {result ? (
        <pre className="mt-3 max-h-[32rem] overflow-auto rounded border border-[#C9A961]/30 bg-[#FFF9F0] p-3 text-xs text-[#3D1B1F]">
          {JSON.stringify(result, null, 2)}
        </pre>
      ) : null}
    </section>
  );
}
