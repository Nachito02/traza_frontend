import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "";

type ApiError = {
  error?: string;
  message?: string;
  detail?: string;
  details?: unknown;
  errors?: unknown;
};

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    Accept: "application/json",
  },
});

const REFRESH_PATH = "/auth/refresh";
const AUTH_PATHS_WITHOUT_REFRESH = new Set([
  "/auth/login",
  "/auth/register",
  "/auth/logout",
]);

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
  skipAuthRefresh?: boolean;
};

type PendingRequest = {
  resolve: () => void;
  reject: (error: unknown) => void;
};

let isRefreshing = false;
let pendingRequests: PendingRequest[] = [];
let authFailureHandler: (() => void) | null = null;

export function setAuthFailureHandler(handler: (() => void) | null) {
  authFailureHandler = handler;
}

function flushPendingRequests(error: unknown | null) {
  const requests = pendingRequests;
  pendingRequests = [];
  requests.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
      return;
    }
    resolve();
  });
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const originalRequest = error.config as RetryableRequestConfig | undefined;
    const requestUrl = originalRequest?.url ?? "";

    if (!originalRequest || status !== 401 || originalRequest.skipAuthRefresh) {
      return Promise.reject(error);
    }

    if (
      requestUrl.includes(REFRESH_PATH) ||
      Array.from(AUTH_PATHS_WITHOUT_REFRESH).some((path) => requestUrl.includes(path))
    ) {
      return Promise.reject(error);
    }

    if (originalRequest._retry) {
      return Promise.reject(error);
    }
    originalRequest._retry = true;

    if (isRefreshing) {
      try {
        await new Promise<void>((resolve, reject) => {
          pendingRequests.push({ resolve, reject });
        });
        return apiClient(originalRequest);
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }

    isRefreshing = true;
    try {
      await apiClient.post(
        REFRESH_PATH,
        {},
        {
          skipAuthRefresh: true,
        } as RetryableRequestConfig,
      );
      flushPendingRequests(null);
      return apiClient(originalRequest);
    } catch (refreshError) {
      flushPendingRequests(refreshError);
      authFailureHandler?.();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export function getApiErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiError>;
    const status = axiosError.response?.status;
    const rawData = axiosError.response?.data as unknown;
    if (status === 401 || status === 403) {
      return "Usuario o contraseña incorrectos";
    }

    if (typeof rawData === "string" && rawData.trim()) {
      const value = rawData.trim();
      if (value.startsWith("<!DOCTYPE html") || value.startsWith("<html")) {
        return value
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim();
      }
      return value;
    }

    if (typeof rawData === "number" || typeof rawData === "boolean") {
      return String(rawData);
    }

    const data =
      rawData && typeof rawData === "object"
        ? (rawData as ApiError)
        : undefined;
    const firstValidationError = Array.isArray(data?.errors)
      ? data.errors.find((item) => typeof item === "string") ??
        data.errors
          .map((item) => {
            if (typeof item === "string") return item;
            if (
              item &&
              typeof item === "object" &&
              "msg" in item &&
              typeof (item as { msg?: unknown }).msg === "string"
            ) {
              return (item as { msg: string }).msg;
            }
            if (
              item &&
              typeof item === "object" &&
              "message" in item &&
              typeof (item as { message?: unknown }).message === "string"
            ) {
              return (item as { message: string }).message;
            }
            return undefined;
          })
          .find(Boolean)
      : undefined;

    const firstDetail = Array.isArray(data?.details)
      ? data.details.find((item) => typeof item === "string")
      : undefined;

    const serializedData =
      data && typeof data === "object" ? JSON.stringify(data) : undefined;

    return (
      (typeof data?.error === "string" ? data.error : undefined) ||
      (typeof data?.message === "string" ? data.message : undefined) ||
      (typeof data?.detail === "string" ? data.detail : undefined) ||
      (typeof firstValidationError === "string" ? firstValidationError : undefined) ||
      (typeof firstDetail === "string" ? firstDetail : undefined) ||
      serializedData ||
      axiosError.message
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Error inesperado";
}
