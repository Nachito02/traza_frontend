import type { HTMLAttributes, ReactNode } from "react";

type AppCardTone = "default" | "soft" | "interactive";
type AppCardPadding = "sm" | "md" | "lg";

export type AppCardProps = HTMLAttributes<HTMLElement> & {
  as?: "div" | "section" | "article";
  tone?: AppCardTone;
  padding?: AppCardPadding;
  header?: ReactNode;
  footer?: ReactNode;
};

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const toneClasses: Record<AppCardTone, string> = {
  default:
    "bg-primary text-text shadow-[var(--shadow-soft)]",
  soft:
    "border border-[color:var(--border-default)] bg-[color:var(--surface-muted)] text-[color:var(--text-ink)] shadow-[var(--shadow-soft)]",
  interactive:
    "border border-[color:var(--border-default)] bg-[color:var(--surface-muted)] text-[color:var(--text-ink)] shadow-[var(--shadow-soft)] transition-all duration-[var(--motion-fast)] ease-[var(--motion-standard)] hover:-translate-y-0.5 hover:border-[color:var(--accent-secondary)] hover:shadow-[var(--shadow-raised)]",
};

const paddingClasses: Record<AppCardPadding, string> = {
  sm: "p-4",
  md: "p-5",
  lg: "p-6",
};

function AppCard({
  as = "section",
  className,
  tone = "default",
  padding = "md",
  header,
  footer,
  children,
  ...props
}: AppCardProps) {
  const Component = as;

  return (
    <Component
      className={joinClasses(
        "rounded-[var(--radius-xl)]",
        toneClasses[tone],
        paddingClasses[padding],
        className,
      )}
      {...props}
    >
      {header ? <div className="mb-4">{header}</div> : null}
      <div>{children}</div>
      {footer ? <div className="mt-4">{footer}</div> : null}
    </Component>
  );
}

export default AppCard;
