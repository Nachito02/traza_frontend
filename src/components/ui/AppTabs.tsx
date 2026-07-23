import type { ReactNode } from "react";

export type AppTabItem<T extends string> = {
  value: T;
  label: ReactNode;
  icon?: ReactNode;
};

type Props<T extends string> = {
  items: ReadonlyArray<AppTabItem<T>>;
  value: T;
  onChange: (value: T) => void;
  size?: "sm" | "md";
  className?: string;
};

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const sizeClasses = {
  sm: "px-3 py-1 text-xs",
  md: "px-4 py-1.5 text-sm",
} as const;

/**
 * Control segmentado estándar (tabs con pestaña activa rellena de acento).
 * Único patrón de tabs de la plataforma — usar para ámbito, clase, modo, "Ver", etc.
 */
export default function AppTabs<T extends string>({
  items,
  value,
  onChange,
  size = "md",
  className,
}: Props<T>) {
  return (
    <div
      role="tablist"
      className={joinClasses(
        "inline-flex flex-wrap gap-1 rounded-[var(--radius-md)] border border-[color:var(--border-shell)] bg-[color:var(--surface-soft)] p-1",
        className,
      )}
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={joinClasses(
              "inline-flex cursor-pointer items-center gap-2 rounded-[var(--radius-sm)] font-medium transition-all duration-[var(--motion-fast)]",
              sizeClasses[size],
              active
                ? "bg-[color:var(--accent-primary)] text-white shadow-[var(--shadow-inset-soft)]"
                : "text-[color:var(--text-ink-muted)] hover:text-[color:var(--text-ink)]",
            )}
          >
            {item.icon ? <span className="shrink-0">{item.icon}</span> : null}
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
