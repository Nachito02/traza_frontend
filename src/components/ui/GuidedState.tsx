import type { ReactNode } from "react";
import AppCard from "./AppCard";

type GuidedStateStep = {
  label: string;
  done?: boolean;
};

export type GuidedStateProps = {
  title: ReactNode;
  description: ReactNode;
  action?: ReactNode;
  secondaryAction?: ReactNode;
  steps?: GuidedStateStep[];
  className?: string;
};

function GuidedState({
  title,
  description,
  action,
  secondaryAction,
  steps = [],
  className = "",
}: GuidedStateProps) {
  return (
    <AppCard
      as="section"
      tone="soft"
      padding="lg"
      className={`border-dashed border-[color:var(--border-default)] ${className}`}
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--accent-secondary)]">
            Acción requerida
          </p>
          <h2 className="mt-2 text-xl font-semibold text-[color:var(--text-on-dark)]">
            {title}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[color:var(--text-on-dark-muted)]">
            {description}
          </p>

          {steps.length > 0 ? (
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {steps.map((step) => (
                <div
                  key={step.label}
                  className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[color:var(--border-shell)] bg-[color:var(--surface-soft)] px-3 py-2 text-xs text-[color:var(--text-on-dark-muted)]"
                >
                  <span
                    className={[
                      "h-2.5 w-2.5 rounded-full",
                      step.done
                        ? "bg-[color:var(--feedback-success)]"
                        : "bg-[color:var(--accent-secondary)]",
                    ].join(" ")}
                  />
                  <span>{step.label}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {(action || secondaryAction) ? (
          <div className="flex flex-wrap gap-2 lg:justify-end">
            {action}
            {secondaryAction}
          </div>
        ) : null}
      </div>
    </AppCard>
  );
}

export default GuidedState;
