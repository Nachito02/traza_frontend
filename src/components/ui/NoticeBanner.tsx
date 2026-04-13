import type { HTMLAttributes, ReactNode } from "react";

type NoticeTone = "info" | "success" | "warning" | "danger";

export type NoticeBannerProps = HTMLAttributes<HTMLDivElement> & {
  tone?: NoticeTone;
  title?: ReactNode;
  children: ReactNode;
};

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const toneClasses: Record<NoticeTone, string> = {
  info: "border-[color:var(--feedback-neutral-border)] bg-[color:var(--feedback-neutral-bg)] text-[color:var(--feedback-neutral-text)]",
  success: "border-[color:var(--feedback-success-border)] bg-[color:var(--feedback-success-bg)] text-[color:var(--feedback-success-text)]",
  warning: "border-[color:var(--feedback-warning-border)] bg-[color:var(--feedback-warning-bg)] text-[color:var(--feedback-warning-text)]",
  danger: "border-[color:var(--feedback-danger-border)] bg-[color:var(--feedback-danger-bg)] text-[color:var(--feedback-danger-text)]",
};

function NoticeBanner({
  tone = "info",
  title,
  className,
  children,
  ...props
}: NoticeBannerProps) {
  return (
    <div
      className={joinClasses(
        "rounded-[var(--radius-xl)] border px-4 py-3 text-sm",
        toneClasses[tone],
        className,
      )}
      {...props}
    >
      {title ? <div className="mb-1 font-semibold">{title}</div> : null}
      <div>{children}</div>
    </div>
  );
}

export default NoticeBanner;
