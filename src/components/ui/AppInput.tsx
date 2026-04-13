import { Input } from "@mantine/core";
import { forwardRef } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";

type AppInputSize = "sm" | "md" | "lg";

export type AppInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & {
  label?: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  inputClassName?: string;
  uiSize?: AppInputSize;
};

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const sizeClasses: Record<AppInputSize, string> = {
  sm: "min-h-9 text-xs",
  md: "min-h-10 text-sm",
  lg: "min-h-11 text-sm",
};

const fieldToneClasses = {
  default: "border-[color:var(--border-default)] focus:border-[color:var(--accent-primary)]",
  error: "border-[color:var(--feedback-danger-border)] focus:border-[color:var(--feedback-danger)]",
} as const;

const AppInput = forwardRef<HTMLInputElement, AppInputProps>(
  (
    {
      className,
      inputClassName,
      label,
      description,
      error,
      uiSize = "md",
      disabled,
      ...props
    },
    ref,
  ) => {
    return (
      <Input.Wrapper
        label={label}
        description={description}
        error={error}
        className={className}
        classNames={{
          root: "block space-y-2",
          label: "block text-xs font-semibold text-[color:var(--text-accent)]",
          description: "block text-xs text-[color:var(--text-ink-muted)]",
          error: "block text-xs text-[color:var(--feedback-danger-text)]",
        }}
      >
        <Input
          ref={ref}
          component="input"
          disabled={disabled}
          className={joinClasses(
            "placeholder:text-[color:var(--text-ink-muted)]",
            inputClassName,
          )}
          classNames={{
            input: joinClasses(
              "w-full rounded-[var(--radius-md)] border bg-white/95 px-3 text-[color:var(--text-ink)] outline-none transition-all duration-[var(--motion-fast)] ease-[var(--motion-standard)] focus:bg-white disabled:cursor-not-allowed disabled:opacity-60",
              error ? fieldToneClasses.error : fieldToneClasses.default,
              uiSize === "lg" && "px-4 py-3",
              uiSize !== "lg" && "py-2",
              sizeClasses[uiSize],
            ),
          }}
          {...props}
        />
      </Input.Wrapper>
    );
  },
);

AppInput.displayName = "AppInput";

export default AppInput;
