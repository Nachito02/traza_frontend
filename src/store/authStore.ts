import { create } from "zustand";
import { apiClient, getApiErrorMessage, setAuthFailureHandler } from "../lib/api";

export type User = {
  id: string | number;
  email: string | null;
  nombre: string;
  bodegaId: string | number | null;
  roles_globales?: string[];
  rol?: string;
  role?: string;
  bodegas?: Array<{
    bodega_id?: string | number;
    nombre?: string;
    roles_en_bodega?: string[];
    rol_en_bodega?: string;
    rolesEnBodega?: string[];
    rolEnBodega?: string;
  }>;
  fincas?: Array<{
    finca_id?: string | number;
    nombre?: string;
    roles_en_finca?: string[];
    rol_en_finca?: string;
  }>;
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
  mustChangePasswordUserId: string | null;
  setActiveBodega: (bodegaId: string | number) => void;
  fetchBodegas: () => Promise<Bodega[]>;
  login: (email: string, password: string) => Promise<void>;
  changePassword: (userId: string, currentPassword: string, newPassword: string) => Promise<void>;
  register: (payload: {
    nombre: string;
    email: string;
    password: string;
    bodegaId: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  bootstrap: () => Promise<void>;
};

const LOGIN_PATH = "/auth/login";
const REGISTER_PATH = "/auth/register";
const ME_PATH = "/auth/me";
const ME_BODEGAS_PATH = "/auth/me/bodegas";
const LOGOUT_PATH = "/auth/logout";
const CHANGE_PASSWORD_PATH = "/auth/change-password";

async function fetchMe() {
  const response = await apiClient.get<User>(ME_PATH);
  return response.data;
}

async function enrichUser(user: User) {
  const userId = String(user.id ?? "");
  if (!userId) return user;
  try {
    const response = await apiClient.get<User>(
      `/auth/users/${encodeURIComponent(userId)}`,
    );
    return {
      ...user,
      ...response.data,
    };
  } catch {
    return user;
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  bodegas: [],
  bodegasLoading: false,
  activeBodegaId: null,
  mustChangePasswordUserId: null,
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
  changePassword: async (userId, currentPassword, newPassword) => {
    set({ isLoading: true, error: null });
    try {
      await apiClient.post(CHANGE_PASSWORD_PATH, { userId, currentPassword, newPassword });
      const user = await fetchMe();
      const enrichedUser = await enrichUser(user);
      const bodegas = await apiClient
        .get<Bodega[]>(ME_BODEGAS_PATH)
        .then((r) => r.data)
        .catch(() => []);
      set({ user: enrichedUser, isAuthenticated: true, mustChangePasswordUserId: null, bodegas });
    } catch (error) {
      const message = getApiErrorMessage(error);
      set({ error: message });
      throw new Error(message);
    } finally {
      set({ isLoading: false });
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
        "must_change_password" in data &&
        data.must_change_password === true
      ) {
        const userId = String((data as { userId?: string }).userId ?? "");
        set({ mustChangePasswordUserId: userId });
        return;
      }
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
      const enrichedUser = await enrichUser(resolvedUser);

      set({ user: enrichedUser, isAuthenticated: true, mustChangePasswordUserId: null });
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
  register: async ({ nombre, email, password, bodegaId }) => {
    set({ isLoading: true, error: null });
    try {
      await apiClient.post(REGISTER_PATH, {
        nombre,
        email,
        password,
        bodegaId,
      });

      await get().login(email, password);
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
      const enrichedUser = await enrichUser(user);
      const bodegas = await apiClient
        .get<Bodega[]>(ME_BODEGAS_PATH)
        .then((r) => r.data)
        .catch(() => []);
      set({ user: enrichedUser, isAuthenticated: true });
      set({ bodegas });
    } catch {
      set({ user: null, isAuthenticated: false, bodegas: [] });
    } finally {
      set({ isLoading: false });
    }
  },
}));

setAuthFailureHandler(() => {
  useAuthStore.setState({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    bodegas: [],
    activeBodegaId: null,
  });
});
