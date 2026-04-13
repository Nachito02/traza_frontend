import type { HTMLAttributes, ReactNode } from "react";
import AppCard from "./AppCard";

type MetricCardTone = "default" | "success" | "warning" | "danger";

export type MetricCardProps = HTMLAttributes<HTMLElement> & {
  label: ReactNode;
  value: ReactNode;
  icon?: ReactNode;
  hint?: ReactNode;
  valueClassName?: string;
  tone?: MetricCardTone;
};

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const toneClasses: Record<MetricCardTone, { value: string; icon: string }> = {
  default: {
    value: "text-[color:var(--text-ink)]",
    icon: "text-[color:var(--text-ink-muted)]",
  },
  success: {
    value: "text-[color:var(--feedback-success-text)]",
    icon: "text-[color:var(--feedback-success)]",
  },
  warning: {
    value: "text-[color:var(--feedback-warning-text)]",
    icon: "text-[color:var(--feedback-warning)]",
  },
  danger: {
    value: "text-[color:var(--feedback-danger-text)]",
    icon: "text-[color:var(--feedback-danger)]",
  },
};

function MetricCard({
  label,
  value,
  icon,
  hint,
  valueClassName,
  tone = "default",
  className,
  ...props
}: MetricCardProps) {
  return (
    <AppCard
      tone="soft"
      padding="sm"
      className={joinClasses("h-full", className)}
      {...props}
    >
      <div className="flex items-center gap-2 text-xs text-[color:var(--text-ink-muted)]">
        {icon ? <span className={joinClasses("shrink-0", toneClasses[tone].icon)}>{icon}</span> : null}
        <span>{label}</span>
      </div>
      <div className={joinClasses("mt-2 text-2xl font-bold", toneClasses[tone].value, valueClassName)}>
        {value}
      </div>
      {hint ? (
        <div className="mt-1 text-xs text-[color:var(--text-ink-muted)]">{hint}</div>
      ) : null}
    </AppCard>
  );
}

export default MetricCard;
