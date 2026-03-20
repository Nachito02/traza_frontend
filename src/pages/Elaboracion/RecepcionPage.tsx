import { useEffect, useState } from "react";
import { listElaboracionResource, type ElaboracionEntity } from "../../features/elaboracion/api";
import { useAuthStore } from "../../store/authStore";
import GenericCrudSection, { type SelectOption } from "./components/GenericCrudSection";
import SectionSelector from "./components/SectionSelector";
import { useSearchParams } from "react-router-dom";

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

type RecepcionPageProps = {
  initialSection?: "remito" | "recepcion" | "analisis";
  hideSectionSelector?: boolean;
  hidePrimaryAction?: boolean;
};

export default function RecepcionPage({
  initialSection = "remito",
  hideSectionSelector = false,
  hidePrimaryAction = false,
}: RecepcionPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeBodegaId = useAuthStore((state) => state.activeBodegaId);
  const [remitoOptions, setRemitoOptions] = useState<SelectOption[]>([]);
  const [recepcionOptions, setRecepcionOptions] = useState<SelectOption[]>([]);
  const [activeSection, setActiveSection] = useState<"remito" | "recepcion" | "analisis">(
    initialSection,
  );

  useEffect(() => {
    if (hideSectionSelector) {
      setActiveSection(initialSection);
      return;
    }
    const section = searchParams.get("section");
    if (section === "remito" || section === "recepcion" || section === "analisis") {
      setActiveSection(section);
      return;
    }
    setActiveSection(initialSection);
  }, [hideSectionSelector, initialSection, searchParams]);

  useEffect(() => {
    if (!activeBodegaId) return;
    Promise.all([
      listElaboracionResource("remitos-uva", { bodegaId: String(activeBodegaId) }),
      listElaboracionResource("recepciones-bodega", { bodegaId: String(activeBodegaId) }),
    ])
      .then(([remitos, recepciones]) => {
        setRemitoOptions(toOptions(remitos, ["id_remito", "remito_id", "id"], ["patente", "transportista", "id_remito"]));
        setRecepcionOptions(
          toOptions(recepciones, ["id_recepcion", "recepcion_id", "id"], ["fecha_hora", "clasificacion", "id_recepcion"]),
        );
      })
      .catch(() => {
        // opciones quedan vacías, el usuario puede continuar sin filtrar por select
      });
  }, [activeBodegaId]);

  return (
    <div className="space-y-4">
      {!hideSectionSelector ? (
        <SectionSelector
          value={activeSection}
          onChange={(value) => {
            setActiveSection(value);
            setSearchParams((prev) => {
              const next = new URLSearchParams(prev);
              next.set("section", value);
              return next;
            });
          }}
          options={[
            { key: "remito", label: "Remito Uva" },
            { key: "recepcion", label: "Recepción Bodega" },
            { key: "analisis", label: "Análisis Recepción" },
          ]}
        />
      ) : null}

      {activeSection === "remito" ? (
        <GenericCrudSection
          title="Remito Uva"
          description="Salida de finca y traslado hacia bodega."
          resource="remitos-uva"
          bodegaId={activeBodegaId}
          hidePrimaryAction={hidePrimaryAction}
          separatedLayout={!hidePrimaryAction}
          fields={[
            { name: "loteCosechaId", label: "Lote cosecha ID", type: "text", required: true },
            { name: "salida_finca", label: "Salida finca", type: "datetime-local", required: true },
            { name: "llegada_bodega", label: "Llegada bodega", type: "datetime-local", required: true },
            { name: "transportista", label: "Transportista", type: "text" },
            { name: "patente", label: "Patente", type: "text" },
            { name: "kg_declarados", label: "Kg declarados", type: "number" },
          ]}
        />
      ) : null}

      {activeSection === "recepcion" ? (
        <GenericCrudSection
          title="Recepción Bodega"
          description="Ingreso efectivo y pesaje de remitos."
          resource="recepciones-bodega"
          bodegaId={activeBodegaId}
          hidePrimaryAction={hidePrimaryAction}
          separatedLayout={!hidePrimaryAction}
          fields={[
            { name: "remitoId", label: "Remito", type: "select", required: true, options: remitoOptions },
            { name: "fecha_hora", label: "Fecha y hora", type: "datetime-local", required: true },
            { name: "kg_pesados", label: "Kg pesados", type: "number" },
            { name: "clasificacion", label: "Clasificación", type: "text" },
            { name: "observaciones", label: "Observaciones", type: "textarea" },
          ]}
        />
      ) : null}

      {activeSection === "analisis" ? (
        <GenericCrudSection
          title="Análisis Recepción"
          description="Análisis general de recepción."
          resource="analisis-recepcion"
          bodegaId={activeBodegaId}
          hidePrimaryAction={hidePrimaryAction}
          separatedLayout={!hidePrimaryAction}
          fields={[
            {
              name: "recepcionId",
              label: "Recepción",
              type: "select",
              required: true,
              options: recepcionOptions,
              sourceKey: "id_recepcion",
            },
            { name: "brix", label: "Brix", type: "number" },
            { name: "ph", label: "pH", type: "number" },
            { name: "acidez", label: "Acidez", type: "number" },
            { name: "temp_uva", label: "Temp. uva", type: "number" },
            { name: "sanidad", label: "Sanidad", type: "text" },
          ]}
        />
      ) : null}
    </div>
  );
}
