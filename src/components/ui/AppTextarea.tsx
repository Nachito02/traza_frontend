import { Textarea } from "@mantine/core";
import { forwardRef } from "react";
import type { ReactNode, TextareaHTMLAttributes } from "react";

type AppTextareaSize = "sm" | "md" | "lg";

export type AppTextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  textareaClassName?: string;
  uiSize?: AppTextareaSize;
  size?: AppTextareaSize;
};

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const sizeClasses: Record<AppTextareaSize, string> = {
  sm: "min-h-24 text-sm",
  md: "min-h-28 text-base",
  lg: "min-h-32 text-base",
};

const fieldToneClasses = {
  default:
    "border-[color:var(--field-border)] hover:border-[color:var(--field-border-hover)] focus:border-[color:var(--field-border-focus)]",
  error:
    "border-[color:var(--field-error)] bg-[color:var(--field-error-bg)] focus:border-[color:var(--field-error)]",
} as const;

const AppTextarea = forwardRef<HTMLTextAreaElement, AppTextareaProps>(
  (
    {
      className,
      textareaClassName,
      label,
      description,
      error,
      uiSize,
      size,
      disabled,
      ...props
    },
    ref,
  ) => {
    const resolvedSize = uiSize ?? size ?? "md";

    return (
      <Textarea
          ref={ref}
          label={label}
          description={description}
          error={error}
          disabled={disabled}
          className={className}
          styles={{
            label: {
              color: "var(--field-label)",
              fontSize: "0.95rem",
              fontWeight: 500,
            },
            description: {
              color: "var(--text-on-dark-muted)",
            },
            error: {
              color: "var(--field-error)",
              fontSize: "0.95rem",
              fontWeight: 500,
            },
            input: {
              background: error ? "var(--field-error-bg)" : "var(--field-bg)",
              borderColor: error ? "var(--field-error)" : "var(--field-border)",
              color: "var(--field-text)",
              borderRadius: "var(--radius-sm)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)",
            },
          }}
          classNames={{
            root: "block space-y-2.5",
            label: "block text-sm font-medium text-[color:var(--field-label)]",
            description: "block text-xs text-[color:var(--text-on-dark-muted)]",
            error: "block text-sm font-medium text-[color:var(--field-error)]",
            input: joinClasses(
              "w-full rounded-[var(--radius-sm)] border bg-[color:var(--field-bg)] px-4 font-medium text-[color:var(--field-text)] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] outline-none transition-all duration-[var(--motion-fast)] ease-[var(--motion-standard)] placeholder:text-[color:var(--field-placeholder)] hover:bg-[color:var(--field-bg-hover)] focus:bg-[color:var(--field-bg-focus)] focus:shadow-[0_0_0_3px_rgba(78,147,183,0.12)] disabled:cursor-not-allowed disabled:opacity-60",
              error ? fieldToneClasses.error : fieldToneClasses.default,
              resolvedSize === "lg" && "py-4",
              resolvedSize !== "lg" && "py-3",
              sizeClasses[resolvedSize],
              textareaClassName,
            ),
          }}
          {...props}
        />
    );
  },
);

AppTextarea.displayName = "AppTextarea";

export default AppTextarea;
