import { useCallback, useEffect, useState } from "react";
import {
  listElaboracionResource,
  type ElaboracionEntity,
} from "../../features/elaboracion/api";
import { useAuthStore } from "../../store/authStore";
import GenericCrudSection, { type SelectOption } from "./components/GenericCrudSection";

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
  hideSectionSelector?: boolean;
  hidePrimaryAction?: boolean;
  /** Recepción (ingreso) preseleccionada cuando se llega desde el flujo asistido. */
  ciuDefaultValues?: Record<string, string | boolean>;
  autoOpenForm?: boolean;
  referenceOptionsVersion?: number;
  onCiuCreated?: (item: ElaboracionEntity) => void | Promise<void>;
};

export default function CiuQcPage({
  hidePrimaryAction = false,
  ciuDefaultValues,
  autoOpenForm = false,
  referenceOptionsVersion = 0,
  onCiuCreated,
}: CiuQcPageProps) {
  const activeBodegaId = useAuthStore((state) => state.activeBodegaId);
  const [recepcionOptions, setRecepcionOptions] = useState<SelectOption[]>([]);

  const loadReferenceOptions = useCallback(async () => {
    if (!activeBodegaId) {
      setRecepcionOptions([]);
      return;
    }
    const recepciones = await listElaboracionResource("recepciones-bodega", {
      bodegaId: String(activeBodegaId),
    });
    setRecepcionOptions(
      recepciones
        .map(formatRecepcionOption)
        .filter((option): option is SelectOption => option !== null),
    );
  }, [activeBodegaId]);

  useEffect(() => {
    void loadReferenceOptions();
  }, [loadReferenceOptions, referenceOptionsVersion]);

  return (
    <div className="space-y-4">
      <GenericCrudSection
        title="CIU"
        description="Comprobante de ingreso de uva. Cada CIU corresponde a un ingreso (recepción) específico."
        resource="cius"
        bodegaId={activeBodegaId}
        hidePrimaryAction={hidePrimaryAction}
        formInModal={!hidePrimaryAction}
        autoOpenForm={autoOpenForm}
        fields={[
          {
            name: "recepcionBodegaId",
            label: "Ingreso (recepción)",
            type: "select",
            required: true,
            options: recepcionOptions,
            sourceKey: "recepcion_bodega_id",
          },
          { name: "codigo_ciu", label: "Código CIU", type: "text", required: true },
          { name: "emitido_at", label: "Emitido", type: "datetime-local", required: true },
          { name: "estado", label: "Estado", type: "text" },
          { name: "observaciones", label: "Observaciones", type: "textarea" },
        ]}
        defaultValues={ciuDefaultValues}
        onCreated={async (item) => {
          await loadReferenceOptions();
          await onCiuCreated?.(item);
        }}
      />
    </div>
  );
}
