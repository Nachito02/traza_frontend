import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AppCard,
  AppSelect,
  MetricCard,
  NoticeBanner,
  SectionIntro,
} from "../../components/ui";
import { getApiErrorMessage } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import { useFincasStore } from "../../features/fincas/store";
import { fetchCuartelesByFinca, type Cuartel } from "../../features/cuarteles/api";
import { fetchCampanias, type Campania } from "../../features/campanias/api";
import {
  fetchActividadesPorCuartel,
  fetchResumenPorCampania,
  fetchResumenPorCuartel,
  formatMoney,
  CATEGORIA_LABEL,
  type ActividadConCosto,
  type CategoriaCosto,
  type ResumenCostos,
} from "../../features/costos/api";

type Modo = "cuartel" | "campania";

const CATEGORIAS: CategoriaCosto[] = [
  "mano_obra",
  "maquinaria",
  "combustible",
  "insumos",
  "contratista",
];

function CategoriaBreakdown({ resumen }: { resumen: ResumenCostos }) {
  const total = resumen.total || 0;
  return (
    <div className="space-y-2">
      {CATEGORIAS.map((cat) => {
        const monto = resumen.porCategoria[cat] ?? 0;
        const pct = total > 0 ? Math.round((monto / total) * 100) : 0;
        return (
          <div key={cat}>
            <div className="flex items-center justify-between text-sm">
              <span>{CATEGORIA_LABEL[cat]}</span>
              <span className="font-medium">
                {formatMoney(monto)} <span className="text-[color:var(--text-ink-muted)]">· {pct}%</span>
              </span>
            </div>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-[color:var(--surface-soft)]">
              <div
                className="h-full rounded-full bg-[color:var(--accent-primary)]"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function CostosResumenPage() {
  const bodegaId = useAuthStore((state) => state.activeBodegaId);
  const fincas = useFincasStore((state) => state.fincas);
  const loadFincas = useFincasStore((state) => state.loadFincas);

  const [modo, setModo] = useState<Modo>("cuartel");
  const [fincaId, setFincaId] = useState("");
  const [cuarteles, setCuarteles] = useState<Cuartel[]>([]);
  const [cuartelId, setCuartelId] = useState("");
  const [campanias, setCampanias] = useState<Campania[]>([]);
  const [campaniaId, setCampaniaId] = useState("");

  const [resumen, setResumen] = useState<ResumenCostos | null>(null);
  const [actividades, setActividades] = useState<ActividadConCosto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (bodegaId) {
      void loadFincas(bodegaId);
      void fetchCampanias(bodegaId).then(setCampanias).catch(() => setCampanias([]));
    }
  }, [bodegaId, loadFincas]);

  // Cargar cuarteles al elegir finca
  useEffect(() => {
    if (!fincaId) {
      setCuarteles([]);
      setCuartelId("");
      return;
    }
    void fetchCuartelesByFinca(fincaId)
      .then((data) => setCuarteles(data ?? []))
      .catch(() => setCuarteles([]));
  }, [fincaId]);

  const loadResumenCuartel = useCallback(async (cid: string) => {
    setLoading(true);
    setError(null);
    try {
      const [r, acts] = await Promise.all([
        fetchResumenPorCuartel(cid),
        fetchActividadesPorCuartel(cid),
      ]);
      setResumen(r);
      setActividades(acts);
    } catch (e) {
      setError(getApiErrorMessage(e));
      setResumen(null);
      setActividades([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadResumenCampania = useCallback(async (cid: string) => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetchResumenPorCampania(cid);
      setResumen(r);
      setActividades([]);
    } catch (e) {
      setError(getApiErrorMessage(e));
      setResumen(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (modo === "cuartel" && cuartelId) void loadResumenCuartel(cuartelId);
  }, [modo, cuartelId, loadResumenCuartel]);

  useEffect(() => {
    if (modo === "campania" && campaniaId) void loadResumenCampania(campaniaId);
  }, [modo, campaniaId, loadResumenCampania]);

  const fincaOptions = useMemo(
    () => fincas.filter((f) => f.finca_id).map((f) => ({ id: f.finca_id!, label: f.nombre_finca ?? f.finca_id! })),
    [fincas],
  );

  if (!bodegaId) {
    return (
      <div className="space-y-4">
        <SectionIntro title="Costos" />
        <NoticeBanner tone="warning">Seleccioná una bodega para ver los costos.</NoticeBanner>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionIntro
        eyebrow="Costos"
        title="Resumen de costos"
        description="Costos acumulados por cuartel o por campaña, con desglose por categoría y costo por hectárea."
      />

      {/* Selector de modo + entidad */}
      <AppCard padding="md">
        <div className="grid gap-3 md:grid-cols-3">
          <AppSelect label="Agrupar por" value={modo} onChange={(e) => setModo(e.target.value as Modo)}>
            <option value="cuartel">Cuartel</option>
            <option value="campania">Campaña</option>
          </AppSelect>

          {modo === "cuartel" ? (
            <>
              <AppSelect label="Finca" value={fincaId} onChange={(e) => setFincaId(e.target.value)}>
                <option value="">Seleccionar…</option>
                {fincaOptions.map((f) => (
                  <option key={f.id} value={f.id}>{f.label}</option>
                ))}
              </AppSelect>
              <AppSelect label="Cuartel" value={cuartelId} onChange={(e) => setCuartelId(e.target.value)}>
                <option value="">Seleccionar…</option>
                {cuarteles.filter((c) => c.cuartel_id ?? c.id).map((c) => (
                  <option key={c.cuartel_id ?? c.id} value={String(c.cuartel_id ?? c.id)}>
                    {c.codigo_cuartel}
                  </option>
                ))}
              </AppSelect>
            </>
          ) : (
            <AppSelect label="Campaña" value={campaniaId} onChange={(e) => setCampaniaId(e.target.value)}>
              <option value="">Seleccionar…</option>
              {campanias.filter((c) => c.campania_id ?? c.id).map((c) => (
                <option key={c.campania_id ?? c.id} value={String(c.campania_id ?? c.id)}>
                  {c.nombre}
                </option>
              ))}
            </AppSelect>
          )}
        </div>
      </AppCard>

      {error ? <NoticeBanner tone="danger">{error}</NoticeBanner> : null}
      {loading ? <p className="text-sm text-[color:var(--text-ink-muted)]">Cargando costos…</p> : null}

      {resumen && !loading ? (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <MetricCard label="Costo total" value={formatMoney(resumen.total)} />
            <MetricCard
              label="Costo por hectárea"
              value={resumen.costoPorHa != null ? formatMoney(resumen.costoPorHa) : "—"}
            />
            <MetricCard label="Actividades" value={resumen.actividades} />
          </div>

          <AppCard header={<h3 className="text-base font-semibold">Desglose por categoría</h3>}>
            <CategoriaBreakdown resumen={resumen} />
          </AppCard>

          {modo === "cuartel" && actividades.length > 0 ? (
            <AppCard header={<h3 className="text-base font-semibold">Actividades del cuartel</h3>}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-[color:var(--text-ink-muted)]">
                      <th className="py-2 pr-3">Actividad</th>
                      <th className="py-2 pr-3">Estado</th>
                      <th className="py-2 pr-3">Fecha</th>
                      <th className="py-2 pr-3 text-right">Sup. (ha)</th>
                      <th className="py-2 pr-3 text-right">$/ha</th>
                      <th className="py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {actividades.map((a) => (
                      <tr key={a.tareaId} className="border-t border-[color:var(--border-shell)]">
                        <td className="py-2 pr-3">{a.actividad ?? a.titulo}</td>
                        <td className="py-2 pr-3 capitalize">{a.estado}</td>
                        <td className="py-2 pr-3">{new Date(a.fecha).toLocaleDateString("es-AR")}</td>
                        <td className="py-2 pr-3 text-right">{a.superficie ?? "—"}</td>
                        <td className="py-2 pr-3 text-right">
                          {a.costoPorHa != null ? formatMoney(a.costoPorHa) : "—"}
                        </td>
                        <td className="py-2 text-right font-medium">{formatMoney(a.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </AppCard>
          ) : null}

          {resumen.actividades === 0 ? (
            <NoticeBanner tone="info">
              No hay costos cargados todavía para esta selección.
            </NoticeBanner>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
