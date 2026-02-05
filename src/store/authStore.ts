import { create } from "zustand";
import { apiClient, getApiErrorMessage } from "../lib/api";

export type User = {
  id: string | number;
  email: string;
  nombre: string;
  bodegaId: string | number | null;
};

export type Bodega = {
  bodega_id: string;
  productor_id: string | null;
  nombre: string;
  razon_social: string;
  cuit: string;
  activo: boolean;
  created_at: string;
  updated_at: string;
};

type AuthState = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  bodegas: Bodega[];
  bodegasLoading: boolean;
  activeBodegaId: string | number | null;
  setActiveBodega: (bodegaId: string | number) => void;
  fetchBodegas: () => Promise<Bodega[]>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  bootstrap: () => Promise<void>;
};

const LOGIN_PATH = "/auth/login";
const ME_PATH = "/auth/me";
const ME_BODEGAS_PATH = "/auth/me/bodegas";
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
  bodegas: [],
  bodegasLoading: false,
  activeBodegaId: null,
  setActiveBodega: (bodegaId) => set({ activeBodegaId: bodegaId }),
  fetchBodegas: async () => {
    set({ bodegasLoading: true });
    try {
      const response = await apiClient.get<Bodega[]>(ME_BODEGAS_PATH);
      set({ bodegas: response.data });
      return response.data;
    } finally {
      set({ bodegasLoading: false });
    }
  },
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
      const bodegas = await apiClient
        .get<Bodega[]>(ME_BODEGAS_PATH)
        .then((r) => r.data)
        .catch(() => []);
      set({ bodegas });
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
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        bodegas: [],
        activeBodegaId: null,
      });
    }
  },
  bootstrap: async () => {
    set({ isLoading: true, error: null });
    try {
      const user = await fetchMe();
      const bodegas = await apiClient
        .get<Bodega[]>(ME_BODEGAS_PATH)
        .then((r) => r.data)
        .catch(() => []);
      set({ user, isAuthenticated: true });
      set({ bodegas });
    } catch {
      set({ user: null, isAuthenticated: false, bodegas: [] });
    } finally {
      set({ isLoading: false });
    }
  },
}));
