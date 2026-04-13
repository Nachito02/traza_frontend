import type React from "react";
import { AppCard } from "./ui";

interface CardResumeProps {
  title: string;
  value: number;
  status: string;
  variant?: "default" | "danger";
}

const CardResume: React.FC<CardResumeProps> = ({ title, value, status, variant = "default" }) => {
  const isDanger = variant === "danger";

  return (
    <AppCard
      as="article"
      tone="soft"
      padding="sm"
      className="flex min-h-24 w-full justify-center"
    >
      <div className="flex flex-col items-center justify-between w-full py-2 px-3">
        <p className="text-xl text-[color:var(--text-ink-muted)]">{title}</p>

        <div className="flex items-center gap-2">
          <p
            className={`text-xl font-bold ${
              isDanger
                ? "text-[color:var(--feedback-danger-text)]"
                : "text-[color:var(--text-ink)]"
            }`}
          >
            {value}
          </p>
          <span
            className={`text-xl font-bold ${
              isDanger
                ? "text-[color:var(--feedback-danger-text)]"
                : "text-[color:var(--feedback-success)]"
            }`}
          >
            {status}
          </span>
        </div>
      </div>
    </AppCard>
  );
};

export default CardResume;
