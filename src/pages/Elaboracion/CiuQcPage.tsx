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

export default function CiuQcPage() {
  const activeBodegaId = useAuthStore((state) => state.activeBodegaId);
  const [activeSection, setActiveSection] = useState<"ciu" | "vinculo" | "qc">("ciu");
  const [ciuOptions, setCiuOptions] = useState<SelectOption[]>([]);
  const [recepcionOptions, setRecepcionOptions] = useState<SelectOption[]>([]);

  useEffect(() => {
    if (!activeBodegaId) return;
    Promise.all([
      listElaboracionResource("cius", { bodegaId: String(activeBodegaId) }),
      listElaboracionResource("recepciones-bodega", { bodegaId: String(activeBodegaId) }),
    ]).then(([cius, recepciones]) => {
      setCiuOptions(toOptions(cius, ["id_ciu", "ciu_id", "id"], ["codigo_ciu", "id_ciu"]));
      setRecepcionOptions(
        toOptions(recepciones, ["id_recepcion", "recepcion_id", "id"], ["fecha_hora", "clasificacion", "id_recepcion"]),
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
      <SectionSelector
        value={activeSection}
        onChange={setActiveSection}
        options={[
          { key: "ciu", label: "CIU" },
          { key: "vinculo", label: "CIU-Recepción" },
          { key: "qc", label: "QC Ingreso Uva" },
        ]}
      />

      {activeSection === "ciu" ? (
        <GenericCrudSection
          title="CIU"
          description="Comprobante de ingreso de uva por bodega."
          resource="cius"
          bodegaId={activeBodegaId}
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
        />
      ) : null}

      {activeSection === "qc" ? (
        <GenericCrudSection
          title="QC Ingreso Uva"
          description="Control de calidad por recepción."
          resource="qc-ingreso-uva"
          bodegaId={activeBodegaId}
          fields={[
            {
              name: "recepcionBodegaId",
              label: "Recepción",
              type: "select",
              required: true,
              options: recepcionOptions,
              sourceKey: "recepcion_bodega_id",
            },
            { name: "fecha_hora", label: "Fecha y hora", type: "datetime-local", required: true },
            { name: "brix", label: "Brix", type: "number" },
            { name: "ph", label: "pH", type: "number" },
            { name: "acidez", label: "Acidez", type: "number" },
            { name: "temperatura_uva", label: "Temp. Uva", type: "number" },
            { name: "estado_pcc", label: "Estado PCC", type: "text" },
            { name: "aprobado", label: "Aprobado", type: "checkbox" },
            { name: "observaciones", label: "Observaciones", type: "textarea" },
          ]}
        />
      ) : null}
    </div>
  );
}
