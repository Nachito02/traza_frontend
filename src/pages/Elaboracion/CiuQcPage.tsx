import { useEffect, useMemo, useState } from "react";
import {
  deleteCiuRecepcion,
  listElaboracionResource,
  patchCiuRecepcion,
  type ElaboracionEntity,
} from "../../features/elaboracion/api";
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

function getCiuRecepcionKey(item: ElaboracionEntity) {
  const ciuId = String(item.ciu_id ?? item.ciuId ?? "");
  const recepcionBodegaId = String(
    item.recepcion_bodega_id ?? item.recepcionBodegaId ?? item.id_recepcion_bodega ?? "",
  );
  if (!ciuId || !recepcionBodegaId) return "";
  return `${ciuId}::${recepcionBodegaId}`;
}

function formatRecepcionOption(item: ElaboracionEntity): SelectOption | null {
  const id = item.recepcion_bodega_id ?? item.id_recepcion ?? item.recepcion_id ?? item.id;
  if (typeof id !== "string" && typeof id !== "number") return null;

  const fecha = typeof item.fecha_hora === "string" ? new Date(item.fecha_hora) : null;
  const fechaLabel = fecha && !Number.isNaN(fecha.getTime())
    ? fecha.toLocaleString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Sin fecha";

  const remito = item.remito_uva && typeof item.remito_uva === "object"
    ? item.remito_uva as Record<string, unknown>
    : {};
  const finca = remito.finca && typeof remito.finca === "object"
    ? remito.finca as Record<string, unknown>
    : {};
  const cuartel = remito.cuartel && typeof remito.cuartel === "object"
    ? remito.cuartel as Record<string, unknown>
    : {};

  const fincaLabel = typeof finca.nombre_finca === "string" ? finca.nombre_finca : null;
  const cuartelLabel = typeof cuartel.codigo_cuartel === "string" ? cuartel.codigo_cuartel : null;
  const kgPesados = typeof item.kg_pesados === "string" || typeof item.kg_pesados === "number"
    ? `${item.kg_pesados} kg`
    : null;
  const patente = typeof remito.patente === "string" && remito.patente.trim()
    ? `Patente ${remito.patente}`
    : null;

  return {
    value: String(id),
    label: [
      fechaLabel,
      [fincaLabel, cuartelLabel].filter(Boolean).join(" / "),
      kgPesados,
      patente,
    ].filter(Boolean).join(" · "),
  };
}

type CiuQcPageProps = {
  initialSection?: "ciu" | "vinculo";
  hideSectionSelector?: boolean;
  hidePrimaryAction?: boolean;
};

export default function CiuQcPage({
  initialSection = "ciu",
  hideSectionSelector = false,
  hidePrimaryAction = false,
}: CiuQcPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeBodegaId = useAuthStore((state) => state.activeBodegaId);
  const [activeSection, setActiveSection] = useState<"ciu" | "vinculo">(initialSection);
  const [ciuOptions, setCiuOptions] = useState<SelectOption[]>([]);
  const [recepcionOptions, setRecepcionOptions] = useState<SelectOption[]>([]);

  useEffect(() => {
    if (hideSectionSelector) {
      setActiveSection(initialSection);
      return;
    }
    const section = searchParams.get("section");
    if (section === "ciu" || section === "vinculo") {
      setActiveSection(section);
      return;
    }
    setActiveSection(initialSection);
  }, [hideSectionSelector, initialSection, searchParams]);

  useEffect(() => {
    if (!activeBodegaId) return;
    Promise.all([
      listElaboracionResource("cius", { bodegaId: String(activeBodegaId) }),
      listElaboracionResource("recepciones-bodega", { bodegaId: String(activeBodegaId) }),
    ]).then(([cius, recepciones]) => {
      setCiuOptions(toOptions(cius, ["id_ciu", "ciu_id", "id"], ["codigo_ciu", "id_ciu"]));
      setRecepcionOptions(
        recepciones
          .map(formatRecepcionOption)
          .filter((option): option is SelectOption => option !== null),
      );
    });
  }, [activeBodegaId]);

  const listParamsVinculo = useMemo(
    () =>
      activeBodegaId
        ? ({ bodegaId: String(activeBodegaId) } as Record<string, string>)
        : ({} as Record<string, string>),
    [activeBodegaId],
  );

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
            { key: "ciu", label: "CIU" },
            { key: "vinculo", label: "CIU-Recepción" },
          ]}
        />
      ) : null}

      {activeSection === "ciu" ? (
        <GenericCrudSection
          title="CIU"
          description="Comprobante de ingreso de uva por bodega."
          resource="cius"
          bodegaId={activeBodegaId}
          hidePrimaryAction={hidePrimaryAction}
          separatedLayout={!hidePrimaryAction}
          fields={[
            { name: "codigo_ciu", label: "Código CIU", type: "text", required: true },
            { name: "emitido_at", label: "Emitido", type: "datetime-local", required: true },
            { name: "estado", label: "Estado", type: "text" },
            { name: "observaciones", label: "Observaciones", type: "textarea" },
          ]}
        />
      ) : null}

      {activeSection === "vinculo" ? (
        <GenericCrudSection
          title="CIU-Recepción"
          description="Vínculo con PK compuesta (ciuId + recepcionBodegaId)."
          resource="ciu-recepciones"
          bodegaId={activeBodegaId}
          withBodegaId={false}
          listParams={listParamsVinculo}
          idResolver={getCiuRecepcionKey}
          controller={{
            update: async ({ item }, payload) => {
              const ciuId = String(item.ciu_id ?? item.ciuId ?? "");
              const recepcionBodegaId = String(
                item.recepcion_bodega_id ?? item.recepcionBodegaId ?? item.id_recepcion_bodega ?? "",
              );
              if (!ciuId || !recepcionBodegaId) {
                throw new Error("No se pudo resolver la PK compuesta para actualizar.");
              }
              await patchCiuRecepcion({ ciuId, recepcionBodegaId }, payload);
            },
            remove: async ({ item }) => {
              const ciuId = String(item.ciu_id ?? item.ciuId ?? "");
              const recepcionBodegaId = String(
                item.recepcion_bodega_id ?? item.recepcionBodegaId ?? item.id_recepcion_bodega ?? "",
              );
              if (!ciuId || !recepcionBodegaId) {
                throw new Error("No se pudo resolver la PK compuesta para eliminar.");
              }
              await deleteCiuRecepcion({ ciuId, recepcionBodegaId });
            },
          }}
          fields={[
            {
              name: "ciuId",
              label: "CIU",
              type: "select",
              required: true,
              options: ciuOptions,
              sourceKey: "ciu_id",
            },
            {
              name: "recepcionBodegaId",
              label: "Recepción",
              type: "select",
              required: true,
              options: recepcionOptions,
              sourceKey: "recepcion_bodega_id",
            },
          ]}
          hidePrimaryAction={hidePrimaryAction}
          separatedLayout={!hidePrimaryAction}
        />
      ) : null}
    </div>
  );
}
