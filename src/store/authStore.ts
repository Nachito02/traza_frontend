import { create } from "zustand";
import { apiClient, getApiErrorMessage } from "../lib/api";

export type User = {
  id: string | number;
  email: string;
  nombre: string;
  bodegaId: string | number | null;
};

type AuthState = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  activeBodegaId: string | number | null;
  setActiveBodega: (bodegaId: string | number) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  bootstrap: () => Promise<void>;
};

const LOGIN_PATH = "/auth/login";
const ME_PATH = "/auth/me";
const LOGOUT_PATH = "/auth/logout";

async function fetchMe() {
  const response = await apiClient.get<User>(ME_PATH);
  return response.data;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  activeBodegaId: null,
  setActiveBodega: (bodegaId) => set({ activeBodegaId: bodegaId }),
  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.post<User | { user: User }>(LOGIN_PATH, {
        email,
        password,
      });

      const data = response.data;
      if (
        data &&
        typeof data === "object" &&
        ("error" in data || "message" in data)
      ) {
        const errorMessage =
          "error" in data && typeof data.error === "string"
            ? data.error
            : "message" in data && typeof data.message === "string"
              ? data.message
              : "Usuario o contraseña incorrectos";
        throw new Error(errorMessage);
      }
      const user = "user" in data ? data.user : data;
      const resolvedUser = user?.id ? user : await fetchMe();

      set({ user: resolvedUser, isAuthenticated: true });
    } catch (error) {
      const message = getApiErrorMessage(error);
      set({ user: null, isAuthenticated: false });
      set({ error: message });
      throw new Error(message);
    } finally {
      set({ isLoading: false });
    }
  },
  logout: async () => {
    set({ isLoading: true, error: null });
    try {
      await apiClient.post(LOGOUT_PATH);
    } catch {
      // Si no existe el endpoint, igual limpiamos estado local.
    } finally {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
  bootstrap: async () => {
    set({ isLoading: true, error: null });
    try {
      const user = await fetchMe();
      set({ user, isAuthenticated: true });
    } catch {
      set({ user: null, isAuthenticated: false });
    } finally {
      set({ isLoading: false });
    }
  },
}));
