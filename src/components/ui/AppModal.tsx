import { Modal } from "@mantine/core";
import type { ReactNode } from "react";

type AppModalSize = "sm" | "md" | "lg" | "xl";

export type AppModalProps = {
  opened: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: AppModalSize;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  bodyClassName?: string;
  contentClassName?: string;
  overlayClassName?: string;
  showHeaderDivider?: boolean;
  showFooterDivider?: boolean;
};

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const sizeClasses: Record<AppModalSize, string> = {
  sm: "32rem",
  md: "40rem",
  lg: "56rem",
  xl: "72rem",
};

function AppModal({
  opened,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  closeOnOverlayClick = true,
  closeOnEscape = true,
  bodyClassName,
  contentClassName,
  overlayClassName,
  showHeaderDivider = false,
  showFooterDivider = true,
}: AppModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      withCloseButton={false}
      closeOnClickOutside={closeOnOverlayClick}
      closeOnEscape={closeOnEscape}
      centered
      size={sizeClasses[size]}
      overlayProps={{
        backgroundOpacity: 1,
        blur: 0,
        className: joinClasses("bg-[color:var(--surface-overlay)]", overlayClassName),
      }}
      classNames={{
        content: joinClasses(
          "overflow-hidden rounded-[var(--radius-xl)] border border-[color:var(--border-shell)] bg-[color:var(--surface-muted)] text-[color:var(--text-ink)] shadow-[var(--shadow-raised)]",
          contentClassName,
        ),
        body: "p-0",
      }}
      styles={{
        content: {
          background: "var(--surface-muted)",
          color: "var(--text-ink)",
          borderColor: "var(--border-shell)",
        },
        body: {
          background: "transparent",
          color: "var(--text-ink)",
        },
      }}
      padding={0}
    >
      <div className="flex max-h-[88vh] w-full flex-col">
        {title || description ? (
          <div
            className={joinClasses(
              "shrink-0 px-6 py-5",
              showHeaderDivider && "border-b border-[color:var(--border-subtle)]",
            )}
          >
            {title ? (
              <h2 className="text-[color:var(--text-ink)] text-xl font-semibold">{title}</h2>
            ) : null}
            {description ? (
              <p className="mt-1 text-xs text-[color:var(--text-ink-muted)]">{description}</p>
            ) : null}
          </div>
        ) : null}

        <div className={joinClasses("min-h-0 flex-1 overflow-y-auto px-6 py-5", bodyClassName)}>
          {children}
        </div>

        {footer ? (
          <div
            className={joinClasses(
              "shrink-0 px-6 py-4",
              showFooterDivider && "border-t border-[color:var(--border-subtle)]",
            )}
          >
            {footer}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}

export default AppModal;
