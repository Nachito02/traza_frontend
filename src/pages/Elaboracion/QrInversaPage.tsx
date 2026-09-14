import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
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

function getNestedRecord(item: unknown, key: string): Record<string, unknown> | null {
  if (!item || typeof item !== "object") return null;
  const value = (item as Record<string, unknown>)[key];
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function getArray(item: unknown, key: string): unknown[] {
  if (!item || typeof item !== "object") return [];
  const value = (item as Record<string, unknown>)[key];
  return Array.isArray(value) ? value : [];
}

function resolveProductoId(item: ElaboracionEntity) {
  const value = item.producto_id ?? item.id_producto ?? item.id;
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

/** El primer código QR ya generado para este producto (si algún lote de fraccionamiento suyo tiene uno). */
function resolveCodigoQr(item: ElaboracionEntity): string | null {
  for (const lf of getArray(item, "lote_fraccionamiento")) {
    for (const ce of getArray(lf, "codigo_envase")) {
      const codigoQr = ce && typeof ce === "object" ? (ce as Record<string, unknown>).codigo_qr : undefined;
      if (typeof codigoQr === "string" && codigoQr) return codigoQr;
    }
  }
  return null;
}

function resolveLoteOrigenId(item: ElaboracionEntity): string | null {
  const loteOrigen = getNestedRecord(item, "lote_origen");
  const id = loteOrigen?.lote_id;
  return typeof id === "string" ? id : null;
}

/** Texto plano por el que se puede buscar un producto: nombre, varietal, código de lote/QR. */
function textoBusqueda(item: ElaboracionEntity): string {
  const loteOrigen = getNestedRecord(item, "lote_origen");
  return [item.nombre_comercial, item.varietal, item.tipo, loteOrigen?.codigo, resolveCodigoQr(item)]
    .filter((v): v is string => typeof v === "string")
    .join(" ")
    .toLowerCase();
}

export default function QrInversaPage() {
  const activeBodegaId = useAuthStore((state) => state.activeBodegaId);
  const [productos, setProductos] = useState<ElaboracionEntity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [codigoManual, setCodigoManual] = useState("");

  useEffect(() => {
    if (!activeBodegaId) return;
    let mounted = true;
    setLoading(true);
    setError(null);
    listElaboracionResource("productos", { bodegaId: String(activeBodegaId) })
      .then((data) => {
        if (mounted) setProductos(data);
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
    if (!q) return productos;
    return productos.filter((item) => textoBusqueda(item).includes(q));
  }, [productos, busqueda]);

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
          leftSection={<Search className="h-4 w-4" />}
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
            title={productos.length === 0 ? "Todavía no hay productos" : "Sin resultados"}
            description={
              productos.length === 0
                ? "Creá un producto desde Cortes y Producto para que aparezca acá."
                : "Probá con otro término de búsqueda."
            }
          />
        ) : (
          filtrados.map((item, index) => {
            const id = resolveProductoId(item) || `i-${index}`;
            const nombreComercial = typeof item.nombre_comercial === "string" ? item.nombre_comercial : "Producto sin nombre";
            const varietal = typeof item.varietal === "string" ? item.varietal : null;
            const anio = item.anio !== undefined && item.anio !== null ? String(item.anio) : null;
            const codigoQr = resolveCodigoQr(item);
            const loteOrigenId = resolveLoteOrigenId(item);
            const destino = codigoQr ? `/producto/${encodeURIComponent(codigoQr)}` : loteOrigenId ? `/lote/${loteOrigenId}` : null;

            const contenido = (
              <>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[color:var(--text-ink)]">
                    {nombreComercial}
                    {varietal ? <span className="font-normal text-[color:var(--text-ink-muted)]"> · {varietal}</span> : null}
                    {anio ? <span className="font-normal text-[color:var(--text-ink-muted)]"> · {anio}</span> : null}
                  </div>
                  <div className="mt-1 text-xs text-[color:var(--text-ink-muted)]">
                    {codigoQr ? (
                      <span className="text-[color:var(--feedback-success-text)]">Fraccionado · QR {codigoQr}</span>
                    ) : loteOrigenId ? (
                      <span>Sin fraccionar todavía — trazabilidad desde su lote de origen</span>
                    ) : (
                      <span>Sin lote de origen — todavía no tiene trazabilidad</span>
                    )}
                  </div>
                </div>
                {destino ? (
                  <span className="shrink-0 text-xs font-semibold text-[color:var(--accent-primary)]">Ver trazabilidad →</span>
                ) : null}
              </>
            );

            const className =
              "flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-lg)] border px-4 py-3 transition-colors " +
              (destino
                ? "border-[color:var(--border-shell)] bg-[color:var(--surface-soft)] hover:border-[color:var(--accent-primary)]"
                : "border-dashed border-[color:var(--border-shell)] bg-[color:var(--surface-muted)] opacity-70");

            if (!destino) {
              return (
                <div key={id} className={className}>
                  {contenido}
                </div>
              );
            }
            return (
              <Link key={id} to={destino} target="_blank" rel="noopener noreferrer" className={className}>
                {contenido}
              </Link>
            );
          })
        )}
      </div>
    </AppCard>
  );
}
