import type React from "react";
import { AppCard } from "./ui";

interface StatusCardProps {
  cap: string; // Ej: "CAP 0"
  title: string; // Ej: "Origen"
  statusTone?: "default" | "success" | "warning" | "danger";
}

const toneClassMap: Record<NonNullable<StatusCardProps["statusTone"]>, string> = {
  default: "bg-[color:var(--accent-secondary)]",
  success: "bg-[color:var(--feedback-success)]",
  warning: "bg-[color:var(--feedback-warning)]",
  danger: "bg-[color:var(--feedback-danger)]",
};

const StatusCard: React.FC<StatusCardProps> = ({ cap, title, statusTone = "default" }) => {
  return (
    <AppCard
      as="article"
      tone="default"
      padding="md"
      className="relative flex min-h-20 w-full flex-col justify-between bg-[color:var(--surface-base-soft)] backdrop-blur-md"
    >
      {/* Punto de estado */}
      <div
        className={`absolute top-4 right-4 h-3 w-3 rounded-full ${toneClassMap[statusTone]}`}
      />

      {/* Contenido */}
      <div>
        <p className="text-xs uppercase tracking-widest text-[color:var(--text-on-dark-muted)]">
          {cap}
        </p>
        <h3 className="mt-1 text-xl font-semibold text-[color:var(--text-on-dark)]">{title}</h3>
      </div>
    </AppCard>
  );
};

export default StatusCard;
