import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listElaboracionResource, type ElaboracionEntity } from "../../features/elaboracion/api";
import {
  AppButton,
  AppCard,
  AppInput,
  GuidedState,
  NoticeBanner,
  SectionIntro,
} from "../../components/ui";
import { getApiErrorMessage } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";

function getNestedRecord(item: ElaboracionEntity, key: string): Record<string, unknown> | null {
  const value = item[key];
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function resolveCodigoEnvaseId(item: ElaboracionEntity) {
  const value = item.codigo_envase_id ?? item.id_codigo ?? item.id;
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

/** Texto plano por el que se puede buscar un código de envase: producto, varietal, códigos. */
function textoBusqueda(item: ElaboracionEntity): string {
  const loteFrac = getNestedRecord(item, "lote_fraccionamiento");
  const producto = loteFrac ? getNestedRecord(loteFrac, "producto") : null;
  return [
    producto?.nombre_comercial,
    producto?.varietal,
    item.codigo_qr,
    item.codigo_lote_impreso,
    loteFrac?.formato,
  ]
    .filter((v): v is string => typeof v === "string")
    .join(" ")
    .toLowerCase();
}

export default function QrInversaPage() {
  const activeBodegaId = useAuthStore((state) => state.activeBodegaId);
  const [codigos, setCodigos] = useState<ElaboracionEntity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [codigoManual, setCodigoManual] = useState("");

  useEffect(() => {
    if (!activeBodegaId) return;
    let mounted = true;
    setLoading(true);
    setError(null);
    listElaboracionResource("codigos-envase", { bodegaId: String(activeBodegaId) })
      .then((data) => {
        if (mounted) setCodigos(data);
      })
      .catch((requestError) => {
        if (mounted) setError(getApiErrorMessage(requestError));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [activeBodegaId]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return codigos;
    return codigos.filter((item) => textoBusqueda(item).includes(q));
  }, [codigos, busqueda]);

  return (
    <AppCard
      as="section"
      tone="default"
      padding="lg"
      header={(
        <SectionIntro
          title="Producto y Trazabilidad"
          description="Elegí un producto de la lista o buscá por código QR para ver su trazabilidad completa — la misma vista pública que ve el cliente al escanear la etiqueta."
        />
      )}
    >
      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
        <AppInput
          value={codigoManual}
          onChange={(event) => setCodigoManual(event.target.value)}
          placeholder="¿Tenés el código QR a mano? Pegalo acá"
          uiSize="lg"
        />
        {codigoManual.trim() ? (
          <Link to={`/producto/${encodeURIComponent(codigoManual.trim())}`} target="_blank" rel="noopener noreferrer">
            <AppButton type="button" variant="primary" fullWidth>
              Ver trazabilidad
            </AppButton>
          </Link>
        ) : (
          <AppButton type="button" variant="primary" disabled>
            Ver trazabilidad
          </AppButton>
        )}
      </div>

      <div className="mt-6">
        <AppInput
          value={busqueda}
          onChange={(event) => setBusqueda(event.target.value)}
          placeholder="Buscar por producto, varietal o código…"
          uiSize="lg"
        />
      </div>

      {error ? <NoticeBanner tone="danger" className="mt-3">{error}</NoticeBanner> : null}

      <div className="mt-4 space-y-2">
        {!activeBodegaId ? (
          <NoticeBanner tone="danger">Seleccioná una bodega.</NoticeBanner>
        ) : loading ? (
          <NoticeBanner>Cargando…</NoticeBanner>
        ) : filtrados.length === 0 ? (
          <GuidedState
            title={codigos.length === 0 ? "Todavía no hay códigos de envase" : "Sin resultados"}
            description={
              codigos.length === 0
                ? "Los códigos QR se generan desde Fraccionamiento y Despacho al crear un envase."
                : "Probá con otro término de búsqueda."
            }
          />
        ) : (
          filtrados.map((item, index) => {
            const id = resolveCodigoEnvaseId(item) || `i-${index}`;
            const loteFrac = getNestedRecord(item, "lote_fraccionamiento");
            const producto = loteFrac ? getNestedRecord(loteFrac, "producto") : null;
            const corte = loteFrac ? getNestedRecord(loteFrac, "corte") : null;
            const codigoQr = typeof item.codigo_qr === "string" ? item.codigo_qr : "";
            const nombreComercial = typeof producto?.nombre_comercial === "string" ? producto.nombre_comercial : "Producto sin nombre";
            const varietal = typeof producto?.varietal === "string" ? producto.varietal : null;
            const anio = producto?.anio !== undefined && producto?.anio !== null ? String(producto.anio) : null;
            const fecha = typeof corte?.fecha === "string" ? corte.fecha.slice(0, 10) : null;

            return (
              <Link
                key={id}
                to={codigoQr ? `/producto/${encodeURIComponent(codigoQr)}` : "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-[color:var(--border-shell)] bg-[color:var(--surface-soft)] px-4 py-3 transition-colors hover:border-[color:var(--accent-primary)]"
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[color:var(--text-ink)]">
                    {nombreComercial}
                    {varietal ? <span className="font-normal text-[color:var(--text-ink-muted)]"> · {varietal}</span> : null}
                    {anio ? <span className="font-normal text-[color:var(--text-ink-muted)]"> · {anio}</span> : null}
                  </div>
                  <div className="mt-1 text-xs text-[color:var(--text-ink-muted)]">
                    {codigoQr ? `QR ${codigoQr}` : "Sin código"}
                    {fecha ? ` · Fraccionado ${fecha}` : ""}
                  </div>
                </div>
                <span className="shrink-0 text-xs font-semibold text-[color:var(--accent-primary)]">Ver trazabilidad →</span>
              </Link>
            );
          })
        )}
      </div>
    </AppCard>
  );
}
