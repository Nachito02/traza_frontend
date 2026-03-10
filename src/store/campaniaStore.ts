import { create } from "zustand";
import { fetchCampanias, type Campania } from "../features/campanias/api";

type CampaniaState = {
  campanias: Campania[];
  activeCampaniaId: string;
  activeCampaniaNombre: string;
  loading: boolean;
  setCampanias: (campanias: Campania[]) => void;
  setActiveCampania: (id: string, nombre: string) => void;
  loadCampanias: (bodegaId: string | number) => Promise<void>;
  clearCampanias: () => void;
};

export const useCampaniaStore = create<CampaniaState>((set, get) => ({
  campanias: [],
  activeCampaniaId: "",
  activeCampaniaNombre: "",
  loading: false,

  setCampanias: (campanias) => set({ campanias }),

  setActiveCampania: (id, nombre) => {
    set({ activeCampaniaId: id, activeCampaniaNombre: nombre });
    if (id) {
      sessionStorage.setItem("activeCampaniaId", id);
      sessionStorage.setItem("activeCampaniaNombre", nombre);
    } else {
      sessionStorage.removeItem("activeCampaniaId");
      sessionStorage.removeItem("activeCampaniaNombre");
    }
  },

  loadCampanias: async (bodegaId) => {
    set({ loading: true });
    try {
      const data = await fetchCampanias(bodegaId);
      const next = data ?? [];
      const storageKey = `activeCampaniaId:${String(bodegaId)}`;
      const savedCampaniaId = sessionStorage.getItem(storageKey) ?? "";
      const exists = next.some(
        (item) => String(item.campania_id ?? item.id ?? "") === String(savedCampaniaId),
      );
      const fallback = (() => {
        if (next.length === 0) return "";
        const abiertas = next.filter((item) => item.estado === "abierta");
        const candidate = (abiertas.length > 0 ? abiertas : next).sort((a, b) =>
          b.fecha_inicio.localeCompare(a.fecha_inicio),
        )[0];
        return String(candidate.campania_id ?? candidate.id ?? "");
      })();
      const selectedId = exists ? savedCampaniaId : fallback;
      const selectedCampania = next.find(
        (item) => String(item.campania_id ?? item.id ?? "") === String(selectedId),
      );
      const selectedNombre = selectedCampania?.nombre ?? "";

      set({
        campanias: next,
        activeCampaniaId: selectedId,
        activeCampaniaNombre: selectedNombre,
      });

      if (selectedId) {
        sessionStorage.setItem(storageKey, selectedId);
        sessionStorage.setItem("activeCampaniaId", selectedId);
        if (selectedNombre) {
          sessionStorage.setItem("activeCampaniaNombre", selectedNombre);
        }
      }
    } catch {
      set({ campanias: [], activeCampaniaId: "", activeCampaniaNombre: "" });
    } finally {
      set({ loading: false });
    }
  },

  clearCampanias: () => {
    const { activeCampaniaId } = get();
    // Limpiar también la key con bodegaId si es posible, pero como no tenemos
    // bodegaId aquí, solo limpiamos las keys globales.
    if (activeCampaniaId) {
      sessionStorage.removeItem("activeCampaniaId");
      sessionStorage.removeItem("activeCampaniaNombre");
    }
    set({ campanias: [], activeCampaniaId: "", activeCampaniaNombre: "" });
  },
}));
