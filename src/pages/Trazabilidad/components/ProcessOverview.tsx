import { AlertTriangle, ArrowRightCircle, FlaskConical, MapPin, ScrollText } from "lucide-react";
import { AppCard, MetricCard } from "../../../components/ui";
import type { CumplimientoIndicadores, HallazgoCumplimiento } from "../../../features/cumplimiento/api";
import type { GlobalSummary, StageGroup } from "../useMilestonesPlan";

type ProcessContext = {
  nombre: string;
  estado: string;
  bodegaNombre: string;
  fincaNombre: string;
  cuartelNombre: string;
  campaniaNombre: string;
  protocoloNombre: string;
};

type NextStep = {
  stageName: string;
  processName: string;
  isRequired: boolean;
};

type Props = {
  context: ProcessContext;
  summary: GlobalSummary;
  selectedStage: StageGroup | null;
  nextStep: NextStep | null;
  hallazgos: HallazgoCumplimiento[];
  indicadores: CumplimientoIndicadores | null;
};

function badgeClasses(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "completado" || normalized === "finalizada" || normalized === "certificada") {
    return "border-[color:var(--feedback-success-border)] bg-[color:var(--feedback-success-bg)] text-[color:var(--feedback-success-text)]";
  }
  if (normalized === "en_curso") {
    return "border-[color:var(--feedback-warning-border)] bg-[color:var(--feedback-warning-bg)] text-[color:var(--feedback-warning-text)]";
  }
  return "border-[color:var(--feedback-neutral-border)] bg-[color:var(--feedback-neutral-bg)] text-[color:var(--accent-primary)]";
}

export default function ProcessOverview({
  context,
  summary,
  selectedStage,
  nextStep,
  hallazgos,
  indicadores,
}: Props) {
  const hallazgosAbiertos = hallazgos.filter((item) =>
    ["abierto", "en_proceso"].includes(String(item.estado ?? "").toLowerCase()),
  );
  const bloqueos = hallazgosAbiertos.filter((item) => item.severidad === "bloqueo").length;
  const alertas = hallazgosAbiertos.filter((item) => item.severidad === "alerta").length;
  const agua = indicadores?.agua;
  const fitos = indicadores?.fitosanitarios;

  return (
    <section className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
      <AppCard as="article" tone="default" padding="lg" className="shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--accent-secondary)]">
              Proceso activo
            </p>
            <h2 className="mt-2 text-2xl font-bold text-[color:var(--text-ink)]">{context.nombre}</h2>
            <p className="mt-2 max-w-2xl text-sm text-[color:var(--text-ink-muted)]">
              Esta vista concentra qué contexto estás operando, qué falta completar y qué riesgos
              abiertos tiene la trazabilidad.
            </p>
          </div>
          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${badgeClasses(context.estado)}`}>
            {context.estado}
          </span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <AppCard as="div" tone="soft" padding="sm" className="border-[color:var(--border-subtle)] bg-[color:var(--surface-soft)]">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--accent-secondary)]">
              <MapPin className="h-4 w-4" />
              Contexto
            </div>
            <div className="mt-2 space-y-1 text-sm text-[color:var(--text-ink)]">
              <div>Bodega: {context.bodegaNombre}</div>
              <div>Finca: {context.fincaNombre}</div>
              <div>Cuartel: {context.cuartelNombre}</div>
            </div>
          </AppCard>

          <AppCard as="div" tone="soft" padding="sm" className="border-[color:var(--border-subtle)] bg-[color:var(--surface-soft)]">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--accent-secondary)]">
              <ScrollText className="h-4 w-4" />
              Marco
            </div>
            <div className="mt-2 space-y-1 text-sm text-[color:var(--text-ink)]">
              <div>Campaña: {context.campaniaNombre}</div>
              <div>Protocolo: {context.protocoloNombre}</div>
              <div>Avance: {summary.progress}%</div>
            </div>
          </AppCard>

          <AppCard as="div" tone="soft" padding="sm" className="border-[color:var(--border-subtle)] bg-[color:var(--surface-soft)]">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--accent-secondary)]">
              <ArrowRightCircle className="h-4 w-4" />
              Próximo paso
            </div>
            <div className="mt-2 text-sm text-[color:var(--text-ink)]">
              {nextStep ? (
                <>
                  <div className="font-semibold">{nextStep.processName}</div>
                  <div className="mt-1 text-[color:var(--text-ink-muted)]">Etapa: {nextStep.stageName}</div>
                  <div className="mt-1 text-xs text-[color:var(--accent-primary)]">
                    {nextStep.isRequired ? "Proceso obligatorio pendiente" : "Proceso opcional pendiente"}
                  </div>
                </>
              ) : (
                <div className="font-semibold text-[color:var(--feedback-success-text)]">No hay pasos pendientes</div>
              )}
            </div>
          </AppCard>
        </div>
      </AppCard>

      <AppCard as="article" tone="soft" padding="lg" className="bg-[color:var(--surface-soft)] shadow-sm">
        <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-secondary)]">
          Riesgos y señales
        </h3>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <MetricCard
            label="Cumplimiento"
            value={hallazgosAbiertos.length}
            hint={`${bloqueos} bloqueos · ${alertas} alertas`}
            tone={bloqueos > 0 ? "danger" : alertas > 0 ? "warning" : "default"}
            icon={<AlertTriangle className="h-4 w-4" />}
            className="border-[color:var(--border-subtle)] bg-white"
          />

          <AppCard as="div" tone="soft" padding="sm" className="border-[color:var(--border-subtle)] bg-white">
            <div className="flex items-center gap-2 text-xs text-[color:var(--text-ink-muted)]">
              <FlaskConical className="h-4 w-4 text-[color:var(--accent-primary)]" />
              Indicadores rápidos
            </div>
            <div className="mt-2 space-y-1 text-sm text-[color:var(--text-ink)]">
              <div>Riegos: {agua?.total_riegos ?? 0}</div>
              <div>m3/ha: {agua?.m3_por_ha ?? "-"}</div>
              <div>Aplicaciones: {fitos?.aplicaciones_total ?? 0}</div>
            </div>
          </AppCard>

          <AppCard as="div" tone="soft" padding="sm" className="border-[color:var(--border-subtle)] bg-white">
            <div className="text-xs text-[color:var(--text-ink-muted)]">Etapa enfocada</div>
            <div className="mt-2 text-lg font-semibold text-[color:var(--text-ink)]">
              {selectedStage?.name ?? "Sin etapa seleccionada"}
            </div>
            <div className="mt-1 text-xs text-[color:var(--text-ink-muted)]">
              {selectedStage
                ? `${selectedStage.completed}/${selectedStage.total} procesos completos`
                : "Elegí una etapa para trabajar"}
            </div>
          </AppCard>
        </div>
      </AppCard>
    </section>
  );
}
