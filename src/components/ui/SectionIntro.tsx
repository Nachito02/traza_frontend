import type { HTMLAttributes, ReactNode } from "react";

export type SectionIntroProps = Omit<HTMLAttributes<HTMLDivElement>, "title"> & {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  titleClassName?: string;
  descriptionClassName?: string;
  actionsClassName?: string;
};

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function SectionIntro({
  eyebrow,
  title,
  description,
  actions,
  className,
  titleClassName,
  descriptionClassName,
  actionsClassName,
  ...props
}: SectionIntroProps) {
  return (
    <div
      className={joinClasses(
        "flex flex-wrap items-start justify-between gap-4",
        className,
      )}
      {...props}
    >
      <div>
        {eyebrow ? (
          <div className="mb-2 text-xs font-black uppercase tracking-[0.28em] text-[color:var(--accent-primary)]">
            {eyebrow}
          </div>
        ) : null}
        <h2 className={joinClasses("text-xl font-semibold text-[color:inherit]", titleClassName)}>{title}</h2>
        {description ? (
          <p
            className={joinClasses(
              "mt-2 text-sm text-[color:var(--text-ink-muted)]",
              descriptionClassName,
            )}
          >
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className={joinClasses("flex flex-wrap items-center gap-2", actionsClassName)}>{actions}</div>
      ) : null}
    </div>
  );
}

export default SectionIntro;
