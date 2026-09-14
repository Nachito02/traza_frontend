export type ActivityField = {
  name: string;
  label: string;
  type?: string;
  options?: { value: string; label: string }[];
};

export type ActivityDetail = { label: string; value: string };

export function completedTasks<T extends { estado: string }>(tasks: readonly T[]): T[] {
  return tasks.filter((task) => task.estado.trim().toLowerCase() === "completado");
}

export function readableLabel(key: string): string {
  const text = key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const technicalFields = new Set([
  "formato", "validation", "validacion", "schema", "plantilla", "eventotipo",
  "evento_tipo", "source", "adjuntos", "documentos", "metadata", "version",
]);

export function describeActivity(raw: string | null | undefined, fields: readonly ActivityField[] = []): {
  text: string | null;
  details: ActivityDetail[];
} {
  if (!raw?.trim()) return { text: null, details: [] };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { text: raw, details: [] };
  }
  if (typeof parsed === "string") return { text: parsed, details: [] };
  const details: ActivityDetail[] = [];
  const visit = (value: unknown, key: string, prefix: string, depth: number) => {
    if (value == null || value === "" || depth > 8) return;
    if (technicalFields.has(key.toLowerCase()) || /(^id$|_id$|Id$|_ids$|Ids$)/.test(key)) return;
    const field = fields.find((item) => item.name === key);
    const label = [prefix, field?.label ?? readableLabel(key)].filter(Boolean).join(" · ");
    if (Array.isArray(value)) {
      value.forEach((item, index) => visit(item, "", `${label} ${index + 1}`.trim(), depth + 1));
    } else if (typeof value === "object") {
      Object.entries(value).forEach(([childKey, childValue]) =>
        visit(childValue, childKey, key === "draft" || key === "datos" ? prefix : label, depth + 1),
      );
    } else {
      let display = String(value);
      if (typeof value === "boolean") display = value ? "Sí" : "No";
      if (typeof value === "number") display = value.toLocaleString("es-AR", { maximumFractionDigits: 10 });
      if (typeof value === "string") {
        display = field?.options?.find((option) => option.value === value)?.label ?? value;
        if (/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value)) {
          const date = new Date(value);
          if (!Number.isNaN(date.getTime())) display = date.toLocaleDateString("es-AR", { timeZone: "UTC" });
        }
      }
      details.push({ label: label || "Detalle", value: display });
    }
  };
  visit(parsed, "", "", 0);
  return { text: null, details };
}
