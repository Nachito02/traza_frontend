import { Notification } from "@mantine/core";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type AppNotificationTone = "success" | "error" | "info";

type AppNotification = {
  id: string;
  tone: AppNotificationTone;
  title: string;
  message?: string;
};

type NotifyInput = {
  title: string;
  message?: string;
};

type AppNotificationsContextValue = {
  notify: (notification: NotifyInput & { tone?: AppNotificationTone }) => void;
  notifySuccess: (notification: NotifyInput) => void;
  notifyError: (notification: NotifyInput) => void;
  notifyInfo: (notification: NotifyInput) => void;
};

const AppNotificationsContext = createContext<AppNotificationsContextValue | null>(null);

const toneConfig: Record<
  AppNotificationTone,
  {
    icon: ReactNode;
    border: string;
    accent: string;
  }
> = {
  success: {
    icon: <CheckCircle2 className="h-4 w-4" />,
    border: "var(--feedback-success-border)",
    accent: "var(--feedback-success-text)",
  },
  error: {
    icon: <AlertTriangle className="h-4 w-4" />,
    border: "var(--feedback-danger-border)",
    accent: "var(--feedback-danger-text)",
  },
  info: {
    icon: <Info className="h-4 w-4" />,
    border: "var(--feedback-neutral-border)",
    accent: "var(--accent-secondary)",
  },
};

function createNotificationId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function AppNotificationItem({
  notification,
  onClose,
}: {
  notification: AppNotification;
  onClose: () => void;
}) {
  const config = toneConfig[notification.tone];

  useEffect(() => {
    const timeout = window.setTimeout(onClose, 4200);
    return () => window.clearTimeout(timeout);
  }, [onClose]);

  return (
    <Notification
      withCloseButton={false}
      icon={(
        <span
          className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)]"
          style={{
            background: "var(--surface-shell-raised)",
            color: config.accent,
          }}
        >
          {config.icon}
        </span>
      )}
      title={notification.title}
      styles={{
        root: {
          background: "var(--surface-muted)",
          border: `1px solid ${config.border}`,
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-raised)",
          color: "var(--text-ink)",
          padding: "0.85rem 0.9rem",
        },
        title: {
          color: "var(--text-ink)",
          fontFamily: "var(--font-heading)",
          fontSize: "0.95rem",
          fontWeight: 700,
        },
        description: {
          color: "var(--text-ink-muted)",
          fontSize: "0.82rem",
          lineHeight: 1.45,
        },
        icon: {
          background: "transparent",
          marginRight: "0.75rem",
        },
      }}
      className="pointer-events-auto w-[min(24rem,calc(100vw-2rem))]"
    >
      <div className="flex items-start justify-between gap-3">
        {notification.message ? <span>{notification.message}</span> : <span />}
        <button
          type="button"
          onClick={onClose}
          className="mt-0.5 inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-[var(--radius-md)] text-[color:var(--text-ink-muted)] transition hover:bg-[color:var(--action-ghost-hover)] hover:text-[color:var(--text-ink)]"
          aria-label="Cerrar notificación"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </Notification>
  );
}

export function AppNotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const removeNotification = useCallback((id: string) => {
    setNotifications((current) => current.filter((notification) => notification.id !== id));
  }, []);

  const notify = useCallback((notification: NotifyInput & { tone?: AppNotificationTone }) => {
    const next: AppNotification = {
      id: createNotificationId(),
      tone: notification.tone ?? "info",
      title: notification.title,
      message: notification.message,
    };
    setNotifications((current) => [...current.slice(-3), next]);
  }, []);

  const value = useMemo<AppNotificationsContextValue>(
    () => ({
      notify,
      notifySuccess: (notification) => notify({ ...notification, tone: "success" }),
      notifyError: (notification) => notify({ ...notification, tone: "error" }),
      notifyInfo: (notification) => notify({ ...notification, tone: "info" }),
    }),
    [notify],
  );

  return (
    <AppNotificationsContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[1000] flex flex-col gap-3 sm:right-6 sm:top-6">
        {notifications.map((notification) => (
          <AppNotificationItem
            key={notification.id}
            notification={notification}
            onClose={() => removeNotification(notification.id)}
          />
        ))}
      </div>
    </AppNotificationsContext.Provider>
  );
}

export function useAppNotifications() {
  const context = useContext(AppNotificationsContext);
  if (!context) {
    throw new Error("useAppNotifications debe usarse dentro de AppNotificationsProvider.");
  }
  return context;
}
