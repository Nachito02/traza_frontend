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
  sm: "min-h-20 text-xs",
  md: "min-h-24 text-sm",
  lg: "min-h-28 text-sm",
};

const fieldToneClasses = {
  default: "border-[color:var(--border-default)] focus:border-[color:var(--accent-primary)]",
  error: "border-[color:var(--feedback-danger-border)] focus:border-[color:var(--feedback-danger)]",
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
          classNames={{
            root: "block space-y-2",
            label: "block text-xs font-semibold text-[color:var(--text-accent)]",
            description: "block text-xs text-[color:var(--text-ink-muted)]",
            error: "block text-xs text-[color:var(--feedback-danger-text)]",
            input: joinClasses(
              "w-full rounded-[var(--radius-md)] border bg-white/95 px-3 text-[color:var(--text-ink)] outline-none transition-all duration-[var(--motion-fast)] ease-[var(--motion-standard)] placeholder:text-[color:var(--text-ink-muted)] focus:bg-white disabled:cursor-not-allowed disabled:opacity-60",
              error ? fieldToneClasses.error : fieldToneClasses.default,
              resolvedSize === "lg" && "px-4 py-3",
              resolvedSize !== "lg" && "py-2",
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
