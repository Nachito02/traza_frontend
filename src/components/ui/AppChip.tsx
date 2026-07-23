import type { ButtonHTMLAttributes, ReactNode } from "react";

export type AppChipProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
  children: ReactNode;
};

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

/**
 * Chip / pill toggleable estándar (personal, filtros, selección múltiple).
 * Único patrón de "pill" de la plataforma.
 */
export default function AppChip({ active = false, className, children, ...props }: AppChipProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={joinClasses(
        "cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-all duration-[var(--motion-fast)]",
        active
          ? "border-[color:var(--accent-primary)] bg-[color:var(--surface-accent-soft)] text-[color:var(--text-ink)]"
          : "border-[color:var(--border-shell)] text-[color:var(--text-ink-muted)] hover:border-[color:var(--border-default)] hover:text-[color:var(--text-ink)]",
        className,
      )}
      {...props}
    >
      {active ? "✓ " : ""}{children}
    </button>
  );
}
