import { useEffect, useState } from "react";
import { listElaboracionResource, type ElaboracionEntity } from "../../features/elaboracion/api";
import { useAuthStore } from "../../store/authStore";
import GenericCrudSection, { type SelectOption } from "./components/GenericCrudSection";
import SectionSelector from "./components/SectionSelector";

const OPERACIONES = [
  "ingreso",
  "fermentacion",
  "trasiego",
  "descube",
  "correccion",
  "corte_parcial",
];

function toOptions(items: ElaboracionEntity[], idKeys: string[], labelKeys: string[]): SelectOption[] {
  return items
    .map((item) => {
      const id = idKeys
        .map((key) => item[key])
        .find((value) => typeof value === "string" || typeof value === "number");
      const label = labelKeys
        .map((key) => item[key])
        .find((value) => typeof value === "string" || typeof value === "number");
      if (id === undefined || id === null) return null;
      return {
        value: String(id),
        label: String(label ?? id),
      };
    })
    .filter((option): option is SelectOption => option !== null);
}

export default function VasijasProcesoPage() {
  const activeBodegaId = useAuthStore((state) => state.activeBodegaId);
  const [activeSection, setActiveSection] = useState<
    "vasijas" | "operaciones" | "existencias" | "fermentacion"
  >("vasijas");
  const [vasijaOptions, setVasijaOptions] = useState<SelectOption[]>([]);

  useEffect(() => {
    if (!activeBodegaId) return;
    listElaboracionResource("vasijas", { bodegaId: String(activeBodegaId) }).then((vasijas) => {
      setVasijaOptions(toOptions(vasijas, ["id_vasija", "vasija_id", "id"], ["codigo", "tipo", "id_vasija"]));
    });
  }, [activeBodegaId]);

  return (
    <div className="space-y-4">
      <SectionSelector
        value={activeSection}
        onChange={setActiveSection}
        options={[
          { key: "vasijas", label: "Vasijas" },
          { key: "operaciones", label: "Operaciones Vasija" },
          { key: "existencias", label: "Existencias Vasija" },
          { key: "fermentacion", label: "Control Fermentación" },
        ]}
      />

      {activeSection === "vasijas" ? (
        <GenericCrudSection
          title="Vasijas"
          description="Registro de vasijas de la bodega."
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
      ) : null}

      {activeSection === "operaciones" ? (
        <GenericCrudSection
          title="Operaciones Vasija"
          description="Eventos de proceso según enum TipoOperacionVasija."
          resource="operaciones-vasija"
          bodegaId={activeBodegaId}
          fields={[
            { name: "id_vasija_origen", label: "Vasija origen", type: "select", options: vasijaOptions },
            { name: "id_vasija_destino", label: "Vasija destino", type: "select", options: vasijaOptions },
            {
              name: "tipo",
              label: "Tipo operación",
              type: "select",
              required: true,
              options: OPERACIONES.map((item) => ({ label: item, value: item })),
            },
            { name: "fecha_hora", label: "Fecha y hora", type: "datetime-local", required: true },
            { name: "id_orden", label: "Orden enólogo ID", type: "text" },
            { name: "id_usuario", label: "Usuario ID", type: "text" },
            { name: "volumen_movido_l", label: "Volumen movido (l)", type: "number" },
            { name: "observaciones", label: "Observaciones", type: "textarea" },
          ]}
        />
      ) : null}

      {activeSection === "existencias" ? (
        <GenericCrudSection
          title="Existencias Vasija"
          description="Control de stock/estado analítico en vasija."
          resource="existencias-vasija"
          bodegaId={activeBodegaId}
          withBodegaId={false}
          fields={[
            { name: "vasijaId", label: "Vasija", type: "select", required: true, options: vasijaOptions, sourceKey: "vasija_id" },
            { name: "fecha_hora", label: "Fecha y hora", type: "datetime-local", required: true },
            { name: "volumen_l", label: "Volumen (l)", type: "number" },
            { name: "grado_alcohol", label: "Grado alcohol", type: "number" },
            { name: "azucar_residual_g_l", label: "Azúcar residual g/l", type: "number" },
            { name: "observaciones", label: "Observaciones", type: "textarea" },
          ]}
        />
      ) : null}

      {activeSection === "fermentacion" ? (
        <GenericCrudSection
          title="Control Fermentación"
          description="Seguimiento de fermentación por vasija."
          resource="controles-fermentacion"
          bodegaId={activeBodegaId}
          withBodegaId={false}
          fields={[
            { name: "vasijaId", label: "Vasija", type: "select", required: true, options: vasijaOptions, sourceKey: "vasija_id" },
            { name: "fecha_hora", label: "Fecha y hora", type: "datetime-local", required: true },
            { name: "densidad", label: "Densidad", type: "number" },
            { name: "temperatura", label: "Temperatura", type: "number" },
            { name: "brix", label: "Brix", type: "number" },
            { name: "ph", label: "pH", type: "number" },
            { name: "acidez", label: "Acidez", type: "number" },
            { name: "estado_fermentacion", label: "Estado fermentación", type: "text" },
            { name: "observaciones", label: "Observaciones", type: "textarea" },
          ]}
        />
      ) : null}
    </div>
  );
}
