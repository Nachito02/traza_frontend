import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type AppButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type AppButtonSize = "sm" | "md" | "lg";

export type AppButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: AppButtonVariant;
  size?: AppButtonSize;
  loading?: boolean;
  leftSection?: ReactNode;
  rightSection?: ReactNode;
  fullWidth?: boolean;
};

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const variantClasses: Record<AppButtonVariant, string> = {
  primary:
    "border-[color:var(--border-default)] bg-[color:var(--action-primary-bg)] text-[color:var(--text-primary)] hover:border-[color:var(--accent-secondary)] hover:bg-[color:var(--action-primary-hover)] hover:shadow-[0_0_0_1px_rgba(200,169,107,0.14),0_10px_22px_rgba(78,147,183,0.16)]",
  secondary:
    "border-[color:var(--border-shell)] bg-[color:var(--action-secondary-bg)] text-[color:var(--text-on-dark)] hover:border-[color:var(--border-default)] hover:bg-[color:var(--action-secondary-hover)]",
  ghost:
    "border-transparent bg-[color:var(--action-ghost-bg)] text-[color:var(--text-on-dark-muted)] hover:border-[color:var(--border-shell)] hover:bg-[color:var(--action-ghost-hover)] hover:text-[color:var(--text-on-dark)]",
  danger:
    "border-[color:var(--feedback-danger)] bg-[color:var(--action-danger-bg)] text-[color:var(--field-error)] hover:border-[color:var(--field-error)] hover:bg-[color:var(--action-danger-hover)]",
};

const sizeClasses: Record<AppButtonSize, string> = {
  sm: "min-h-9 px-3 py-2 text-xs",
  md: "min-h-10 px-4 py-2 text-sm",
  lg: "min-h-11 px-5 py-3 text-sm",
};

const AppButton = forwardRef<HTMLButtonElement, AppButtonProps>(
  (
    {
      className,
      variant = "secondary",
      size = "md",
      type = "button",
      loading = false,
      disabled,
      leftSection,
      rightSection,
      fullWidth = false,
      children,
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        className={joinClasses(
          "inline-flex cursor-pointer items-center justify-center gap-2 rounded-[var(--radius-md)] border font-semibold shadow-[var(--shadow-inset-soft)] transition-all duration-[var(--motion-fast)] ease-[var(--motion-standard)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60",
          variantClasses[variant],
          sizeClasses[size],
          fullWidth && "w-full",
          className,
        )}
        {...props}
      >
        {leftSection ? <span className="shrink-0">{leftSection}</span> : null}
        <span>{loading ? "Cargando..." : children}</span>
        {rightSection ? <span className="shrink-0">{rightSection}</span> : null}
      </button>
    );
  },
);

AppButton.displayName = "AppButton";

export default AppButton;
