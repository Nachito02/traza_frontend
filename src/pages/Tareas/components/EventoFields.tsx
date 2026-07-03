import { AppInput, AppSelect, AppTextarea } from "../../../components/ui";
import type { EventoConfig } from "../../Trazabilidad/eventoConfig";

type Props = {
  eventoConfig: EventoConfig | null;
  draft: Record<string, string>;
  onChange: (name: string, value: string) => void;
};

/**
 * Render de los campos de una actividad según su `eventoConfig`.
 * Reutilizado por el registro operativo (CampoPage) y la carga rápida.
 * Omite los campos `user_select` (el responsable se resuelve por contexto) y
 * respeta `showWhen` para campos condicionales.
 */
export default function EventoFields({ eventoConfig, draft, onChange }: Props) {
  if (!eventoConfig) {
    return (
      <AppTextarea
        label="Notas del registro"
        value={draft["_notas"] ?? ""}
        onChange={(e) => onChange("_notas", e.target.value)}
        placeholder="Describí qué se hizo, mediciones, observaciones..."
        uiSize="lg"
      />
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {eventoConfig.fields
        .filter((field) => field.type !== "user_select")
        .filter((field) => !field.showWhen || draft[field.showWhen.field] === field.showWhen.value)
        .map((field) => {
          const value = draft[field.name] ?? field.defaultValue ?? "";
          if (field.type === "textarea") {
            return (
              <div key={field.name} className="sm:col-span-2">
                <AppTextarea
                  label={field.label}
                  value={value}
                  onChange={(e) => onChange(field.name, e.target.value)}
                  placeholder={field.placeholder}
                  uiSize="lg"
                />
              </div>
            );
          }
          if (field.type === "select" && field.options) {
            return (
              <AppSelect
                key={field.name}
                label={field.label}
                value={value}
                onChange={(e) => onChange(field.name, e.target.value)}
              >
                <option value="">Seleccionar...</option>
                {field.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </AppSelect>
            );
          }
          return (
            <AppInput
              key={field.name}
              label={`${field.label}${field.required ? " *" : ""}`}
              type={field.type === "date" ? "date" : field.type === "number" ? "number" : "text"}
              value={value}
              onChange={(e) => onChange(field.name, e.target.value)}
              placeholder={field.placeholder}
              step={field.step}
              uiSize="lg"
            />
          );
        })}
    </div>
  );
}
