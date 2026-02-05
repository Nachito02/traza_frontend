import { create } from "zustand";
import { fetchFincas, type Finca } from "./api";

type FincasState = {
  fincas: Finca[];
  loading: boolean;
  error: string | null;
  loadFincas: (bodegaId: string | number) => Promise<void>;
  clear: () => void;
};

export const useFincasStore = create<FincasState>((set) => ({
  fincas: [],
  loading: false,
  error: null,
  loadFincas: async (bodegaId) => {
    set({ loading: true, error: null });
    try {
      const data = await fetchFincas(bodegaId);
      set({ fincas: data ?? [] });
    } catch {
      set({ error: "No se pudieron cargar las fincas." });
    } finally {
      set({ loading: false });
    }
  },
  clear: () => set({ fincas: [], loading: false, error: null }),
}));
