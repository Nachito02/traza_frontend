import { Link } from "react-router-dom";
import AppButton from "./AppButton";
import AppCard from "./AppCard";

export type OperationalReadinessStep = {
  key: string;
  title: string;
  description: string;
  actionLabel: string;
  to: string;
  done: boolean;
  disabled?: boolean;
};

type OperationalReadinessCardProps = {
  title?: string;
  description?: string;
  steps: OperationalReadinessStep[];
  compact?: boolean;
  className?: string;
};

function OperationalReadinessCard({
  title = "Prepará tu operación",
  description = "Completá la estructura mínima para que la bodega pueda operar sin pantallas vacías ni decisiones confusas.",
  steps,
  compact = false,
  className = "",
}: OperationalReadinessCardProps) {
  const completedCount = steps.filter((step) => step.done).length;
  const totalCount = steps.length;
  const nextStep = steps.find((step) => !step.done && !step.disabled);
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <AppCard
      as="section"
      tone="default"
      padding={compact ? "md" : "lg"}
      className={className}
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div className="space-y-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--accent-secondary)]">
              Setup operativo
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-[color:var(--text-on-dark)]">
              {title}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[color:var(--text-on-dark-muted)]">
              {description}
            </p>
          </div>

          <div className="rounded-[var(--radius-lg)] border border-[color:var(--border-shell)] bg-[color:var(--surface-muted)] p-4 shadow-[var(--shadow-inset-soft)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-[color:var(--text-on-dark)]">
                  Preparación general
                </p>
                <p className="mt-1 text-xs text-[color:var(--text-on-dark-muted)]">
                  {completedCount} de {totalCount} pasos listos
                </p>
              </div>
              <span className="rounded-full border border-[color:var(--border-shell)] bg-[color:var(--surface-soft)] px-3 py-1 text-xs font-semibold text-[color:var(--text-on-dark)]">
                {progress}%
              </span>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-[color:var(--surface-soft)]">
              <div
                className="h-full rounded-full bg-[color:var(--accent-primary)] transition-all duration-[var(--motion-normal)] ease-[var(--motion-standard)]"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {nextStep ? (
            <div className="flex flex-wrap items-center gap-3">
              <Link to={nextStep.to}>
                <AppButton variant="primary" size="sm">
                  {nextStep.actionLabel}
                </AppButton>
              </Link>
              <p className="text-xs text-[color:var(--text-on-dark-muted)]">
                Siguiente paso recomendado: {nextStep.title}
              </p>
            </div>
          ) : (
            <div className="rounded-[var(--radius-lg)] border border-[color:var(--feedback-success-border)] bg-[color:var(--feedback-success-bg)] p-4 text-sm font-semibold text-[color:var(--feedback-success-text)]">
              La operación base está lista. Ya podés trabajar con órdenes, recepción y registros.
            </div>
          )}
        </div>

        <div className="grid gap-3">
          {steps.map((step, index) => {
            const blocked = !step.done && step.disabled;
            return (
              <AppCard
                key={step.key}
                as="article"
                tone={step.done ? "soft" : "interactive"}
                padding="md"
                className={[
                  "border-[color:var(--border-shell)]",
                  step.done ? "opacity-80" : "",
                  blocked ? "opacity-60" : "",
                ].join(" ")}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 gap-3">
                    <span
                      className={[
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] border text-xs font-bold",
                        step.done
                          ? "border-[color:var(--feedback-success-border)] bg-[color:var(--feedback-success-bg)] text-[color:var(--feedback-success-text)]"
                          : "border-[color:var(--border-shell)] bg-[color:var(--surface-soft)] text-[color:var(--text-on-dark)]",
                      ].join(" ")}
                    >
                      {step.done ? "OK" : index + 1}
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-[color:var(--text-on-dark)]">
                        {step.title}
                      </h3>
                      <p className="mt-1 text-xs leading-5 text-[color:var(--text-on-dark-muted)]">
                        {step.description}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {step.done ? (
                      <span className="inline-flex rounded-full border border-[color:var(--feedback-success-border)] bg-[color:var(--feedback-success-bg)] px-3 py-1 text-[11px] font-semibold text-[color:var(--feedback-success-text)]">
                        Listo
                      </span>
                    ) : blocked ? (
                      <span className="inline-flex rounded-full border border-[color:var(--border-shell)] bg-[color:var(--surface-soft)] px-3 py-1 text-[11px] font-semibold text-[color:var(--text-on-dark-muted)]">
                        Bloqueado
                      </span>
                    ) : (
                      <Link to={step.to}>
                        <AppButton variant="secondary" size="sm">
                          {step.actionLabel}
                        </AppButton>
                      </Link>
                    )}
                  </div>
                </div>
              </AppCard>
            );
          })}
        </div>
      </div>
    </AppCard>
  );
}

export default OperationalReadinessCard;
