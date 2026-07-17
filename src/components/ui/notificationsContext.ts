import { createContext, useContext } from "react";

export type AppNotificationTone = "success" | "error" | "info";

export type NotifyInput = {
  title: string;
  message?: string;
};

export type AppNotificationsContextValue = {
  notify: (notification: NotifyInput & { tone?: AppNotificationTone }) => void;
  notifySuccess: (notification: NotifyInput) => void;
  notifyError: (notification: NotifyInput) => void;
  notifyInfo: (notification: NotifyInput) => void;
};

export const AppNotificationsContext = createContext<AppNotificationsContextValue | null>(null);

export function useAppNotifications() {
  const context = useContext(AppNotificationsContext);
  if (!context) {
    throw new Error("useAppNotifications debe usarse dentro de AppNotificationsProvider.");
  }
  return context;
}
