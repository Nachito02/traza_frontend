import { useState } from "react";
import { fetchTrazabilidadInversaPorQr, type TrazabilidadQrResponse } from "../../features/elaboracion/api";
import {
  AppButton,
  AppCard,
  AppInput,
  NoticeBanner,
  SectionIntro,
} from "../../components/ui";
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
    <AppCard
      as="section"
      tone="default"
      padding="lg"
      header={(
        <SectionIntro
          title="Producto y Trazabilidad"
          description="Etapa final del proceso. El detalle funcional completo de producto y trazabilidad se define en la próxima iteración."
        />
      )}
    >

      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
        <AppInput
          value={codigoQr}
          onChange={(event) => setCodigoQr(event.target.value)}
          placeholder="Código de envase / QR (consulta preliminar)"
          uiSize="lg"
        />
        <AppButton
          type="button"
          variant="primary"
          onClick={() => void onSubmit()}
          disabled={loading}
        >
          {loading ? "Consultando..." : "Consultar"}
        </AppButton>
      </div>

      {error ? <NoticeBanner tone="danger" className="mt-3">{error}</NoticeBanner> : null}

      {result ? (
        <pre className="mt-3 max-h-[32rem] overflow-auto rounded border border-[color:var(--border-default)] bg-[color:var(--surface-soft)] p-3 text-xs text-[color:var(--text-ink)]">
          {JSON.stringify(result, null, 2)}
        </pre>
      ) : null}
    </AppCard>
  );
}
