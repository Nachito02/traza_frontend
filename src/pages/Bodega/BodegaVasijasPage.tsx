import GenericCrudSection from "../Elaboracion/components/GenericCrudSection";
import { useAuthStore } from "../../store/authStore";

export default function BodegaVasijasPage() {
  const activeBodegaId = useAuthStore((state) => state.activeBodegaId);

  return (
    <div className="min-h-screen bg-secondary px-6 py-10">
      <div className="mx-auto w-full max-w-5xl">
        <GenericCrudSection
          title="Vasijas"
          description="Registro y administración de vasijas de la bodega."
          resource="vasijas"
          bodegaId={activeBodegaId}
          fields={[
            { name: "codigo", label: "Código", type: "text", required: true },
            { name: "tipo", label: "Tipo", type: "text" },
            { name: "capacidad_litros", label: "Capacidad litros", type: "number" },
            { name: "estado", label: "Estado", type: "text" },
            { name: "ubicacion", label: "Ubicación", type: "text" },
          ]}
        />
      </div>
    </div>
  );
}
