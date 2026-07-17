import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { AppButton, AppCard, GuidedState, NoticeBanner, SectionIntro } from "../../components/ui";
import QrCuartelModal from "../../components/QrCuartelModal";
import type { Finca } from "../../features/fincas/api";
import { fetchFincas } from "../../features/fincas/api";
import type { Cuartel } from "../../features/cuarteles/api";
import { fetchCuartelesByFinca } from "../../features/cuarteles/api";
import { getVariedadLabel } from "../../domain/viticultura/catalogos";
import { useAuthStore } from "../../store/authStore";

type CuartelWithFinca = Cuartel & { finca: Finca };

function getPublicUrl(cuartelId: string) {
  return `${window.location.origin}/trazabilidad/${encodeURIComponent(cuartelId)}`;
}

const QrCuartelesAdmin = () => {
  const activeBodegaId = useAuthStore((state) => state.activeBodegaId);

  const [allCuarteles, setAllCuarteles] = useState<CuartelWithFinca[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedQr, setSelectedQr] = useState<CuartelWithFinca | null>(null);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      if (!activeBodegaId) {
        if (mounted) {
          setAllCuarteles([]);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const fincas = await fetchFincas(String(activeBodegaId));
        if (!mounted) return;
        const results = await Promise.all(
          fincas.map(async (finca) => {
            const fincaId = String(finca.finca_id ?? finca.id ?? "");
            if (!fincaId) return [];
            const cuarteles = await fetchCuartelesByFinca(fincaId).catch(() => []);
            return (cuarteles ?? []).map((c) => ({ ...c, finca }));
          }),
        );
        if (!mounted) return;
        setAllCuarteles(results.flat());
      } catch {
        if (mounted) setError("No se pudieron cargar los cuarteles.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void run();

    return () => {
      mounted = false;
    };
  }, [activeBodegaId]);

  const filtered = allCuarteles.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.codigo_cuartel.toLowerCase().includes(q) ||
      (c.finca.nombre_finca ?? "").toLowerCase().includes(q) ||
      (c.variedad ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-secondary px-6 py-10">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <AppCard as="section" padding="lg">
          <SectionIntro
            eyebrow="Trazabilidad pública"
            title="QR por cuartel"
            description="Generá y descargá el QR de cada cuartel para que el consumidor final pueda escanear y ver el historial completo de trazabilidad."
          />

          {/* Search */}
          <div className="mt-6">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por cuartel, finca o variedad…"
              className="w-full max-w-sm rounded-[var(--radius-lg)] border border-[color:var(--field-border)] bg-[color:var(--field-bg)] px-3 py-2 text-sm text-[color:var(--field-text)] placeholder-[color:var(--field-placeholder)] outline-none transition focus:border-[color:var(--field-border-focus)]"
            />
          </div>
        </AppCard>

        {loading && (
          <NoticeBanner tone="info">Cargando cuarteles…</NoticeBanner>
        )}
        {!loading && error && (
          <NoticeBanner tone="danger">{error}</NoticeBanner>
        )}
        {!loading && !error && allCuarteles.length === 0 && (
          <GuidedState
            title="Sin cuarteles registrados"
            description="Creá al menos una finca con cuarteles para generar los QR de trazabilidad."
          />
        )}

        {!loading && filtered.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((cuartel) => {
              const cuartelId = String(cuartel.cuartel_id ?? cuartel.id ?? "");
              const url = getPublicUrl(cuartelId);
              return (
                <AppCard
                  key={cuartelId}
                  as="article"
                  tone="soft"
                  padding="md"
                  className="bg-[color:var(--surface-soft)]"
                >
                  <div className="flex items-start gap-4">
                    {/* Mini QR preview */}
                    <div className="shrink-0 rounded-[var(--radius-lg)] border border-[color:var(--border-shell)] bg-white p-2.5">
                      <QRCodeSVG value={url} size={72} bgColor="#ffffff" fgColor="#07135f" level="M" />
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--text-accent)]">
                        {cuartel.finca.nombre_finca ?? "Finca"}
                      </div>
                      <div className="mt-1 truncate text-sm font-bold text-[color:var(--text-ink)]">
                        {cuartel.codigo_cuartel}
                      </div>
                      {cuartel.variedad && (
                        <div className="mt-0.5 text-xs text-[color:var(--text-ink-muted)]">
                          {getVariedadLabel(cuartel.variedad) ?? cuartel.variedad}
                          {cuartel.superficie_ha ? ` · ${String(cuartel.superficie_ha)} ha` : ""}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <AppButton
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={() => setSelectedQr(cuartel)}
                    >
                      Ver QR
                    </AppButton>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex"
                    >
                      <AppButton type="button" variant="secondary" size="sm">
                        Ver página
                      </AppButton>
                    </a>
                  </div>
                </AppCard>
              );
            })}
          </div>
        )}

        {!loading && filtered.length === 0 && allCuarteles.length > 0 && (
          <NoticeBanner tone="info">
            No hay cuarteles que coincidan con "{search}".
          </NoticeBanner>
        )}
      </div>

      {selectedQr && (
        <QrCuartelModal
          opened={Boolean(selectedQr)}
          onClose={() => setSelectedQr(null)}
          cuartelId={String(selectedQr.cuartel_id ?? selectedQr.id ?? "")}
          cuartelCodigo={selectedQr.codigo_cuartel}
          fincaNombre={selectedQr.finca.nombre_finca ?? undefined}
        />
      )}
    </div>
  );
};

export default QrCuartelesAdmin;
