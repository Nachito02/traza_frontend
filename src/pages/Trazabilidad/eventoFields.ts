import type { Milestone } from "../../features/milestones/api";
import type { ProtocoloPlantillaIteracion } from "../../features/protocolos/api";

export type EventoFieldType =
  | "date"
  | "text"
  | "number"
  | "textarea"
  | "select"
  | "user_select"
  | "checkbox"
  | "datetime-local";

export type EventoField = {
  name: string;
  label: string;
  type: EventoFieldType;
  required?: boolean;
  step?: string;
  placeholder?: string;
  defaultValue?: string;
  options?: { value: string; label: string }[];
};

function toLabel(value: string) {
  const normalized = value.replaceAll("_", " ").trim();
  if (!normalized) return value;
  return normalized[0].toUpperCase() + normalized.slice(1);
}

function normalizeFieldType(rawType?: string): EventoFieldType {
  const value = String(rawType ?? "")
    .toLowerCase()
    .trim();
  if (["number", "integer", "float", "decimal", "double"].includes(value)) return "number";
  if (value === "date") return "date";
  if (["datetime", "timestamp", "date-time", "datetime-local"].includes(value)) return "datetime-local";
  if (["bool", "boolean"].includes(value)) return "checkbox";
  if (["json", "object", "array"].includes(value)) return "textarea";
  return "text";
}

function isUserFieldName(name: string) {
  const value = name.toLowerCase();
  return value.endsWith("_user_id") || value.includes("responsable");
}

function fromProcesoPlantilla(milestone: Milestone): EventoField[] {
  const fields = milestone.protocolo_proceso.plantilla?.campos ?? [];
  return fields
    .filter((item) => Boolean(item?.campo))
    .map((item) => {
      const name = String(item.campo);
      const label = item.unit ? `${toLabel(name)} (${item.unit})` : toLabel(name);
      const isSelect = Array.isArray(item.enum) && item.enum.length > 0;
      return {
        name,
        label,
        required: Boolean(item.required),
        step: normalizeFieldType(item.type) === "number" ? "0.01" : undefined,
        type: isUserFieldName(name)
          ? "user_select"
          : isSelect
            ? "select"
            : normalizeFieldType(item.type),
        ...(isSelect
          ? {
              options: item.enum?.map((entry) => ({ value: String(entry), label: String(entry) })) ?? [],
            }
          : {}),
      };
    });
}

export function buildEventoFields(
  milestone: Milestone,
  plantillaByProcesoId: Map<string, ProtocoloPlantillaIteracion>,
): EventoField[] {
  const procesoId = String(
    milestone.proceso_id ?? milestone.protocolo_proceso.proceso_id ?? "",
  );
  const iteracion = plantillaByProcesoId.get(procesoId);

  const required = iteracion?.plantilla?.campos_obligatorios ?? [];
  const optional = iteracion?.plantilla?.campos_opcionales ?? [];
  const byPlantillaIteracion = [...required, ...optional]
    .filter((item) => Boolean(item?.campo))
    .map((item) => {
      const name = String(item.campo);
      const label = item.unit ? `${toLabel(name)} (${item.unit})` : toLabel(name);
      return {
        name,
        label,
        required: required.some((entry) => entry.campo === item.campo),
        step: normalizeFieldType(item.type) === "number" ? "0.01" : undefined,
        type: isUserFieldName(name) ? "user_select" : normalizeFieldType(item.type),
      } satisfies EventoField;
    });

  if (byPlantillaIteracion.length > 0) return byPlantillaIteracion;

  const byProcesoPlantilla = fromProcesoPlantilla(milestone);
  if (byProcesoPlantilla.length > 0) return byProcesoPlantilla;

  const fallbackRequired = milestone.protocolo_proceso.campos_obligatorios
    ?? milestone.protocolo_proceso.required_fields
    ?? [];
  return fallbackRequired.map((name) => ({
    name,
    label: toLabel(name),
    required: true,
    type: isUserFieldName(name) ? "user_select" : "text",
  }));
}
