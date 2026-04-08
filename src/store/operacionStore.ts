import { create } from "zustand";
import { persist } from "zustand/middleware";

type OperacionState = {
  activeProtocoloId: string | null;
  setActiveProtocoloId: (id: string | null) => void;
};

export const useOperacionStore = create<OperacionState>()(
  persist(
    (set) => ({
      activeProtocoloId: null,
      setActiveProtocoloId: (id) => set({ activeProtocoloId: id }),
    }),
    { name: "operacion-store" },
  ),
);
