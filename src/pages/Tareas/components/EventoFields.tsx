import { AppInput, AppSelect, AppTextarea } from "../../../components/ui";
import type { EventoConfig } from "../../Trazabilidad/eventoConfig";
import AppSelectWithOther from "../../../components/ui/AppSelectWithOther";
import { resolveCustomDraftValue } from "../../../lib/customOptions";
import { camposRenderizados, clampNumerico } from "../../../features/actividades/eventoValidation";

type Props = {
  eventoConfig: EventoConfig | null;
  draft: Record<string, string>;
  onChange: (name: string, value: string) => void;
  /** Nombres de campos obligatorios sin completar, para resaltarlos tras un intento fallido. */
  camposConError?: readonly string[];
};

/**
 * Render de los campos de una actividad según su `eventoConfig`.
 * Reutilizado por el registro operativo (CampoPage) y la carga rápida.
 *
 * Qué campos se muestran lo decide `camposRenderizados`, que es la misma función que usa la
 * validación. Están juntas a propósito: si divergieran se podría exigir un campo invisible.
 */
export default function EventoFields({ eventoConfig, draft, onChange, camposConError }: Props) {
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

  const conError = new Set(camposConError ?? []);
  const etiqueta = (label: string, required?: boolean) => `${label}${required ? " *" : ""}`;
  // El resaltado solo aparece después de un intento fallido: marcar en rojo un formulario
  // recién abierto es ruido, no ayuda.
  const marcaError = (name: string) =>
    conError.has(name) ? "rounded-[var(--radius-md)] ring-1 ring-[color:var(--feedback-danger-text)]" : undefined;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {camposRenderizados(eventoConfig, draft).map((field) => {
        const value = draft[field.name] ?? field.defaultValue ?? "";

        if (field.allowOther && field.options) {
          return (
            <div key={field.name} className={marcaError(field.name)}>
              <AppSelectWithOther
                label={etiqueta(field.label, field.required)}
                otherLabel={`Especificá: ${field.label.toLowerCase()}`}
                value={resolveCustomDraftValue(field, draft)}
                options={field.options}
                required={field.required}
                onChange={(next) => onChange(field.name, next)}
              />
            </div>
          );
        }

        if (field.type === "textarea") {
          return (
            <div key={field.name} className={`sm:col-span-2 ${marcaError(field.name) ?? ""}`}>
              <AppTextarea
                label={etiqueta(field.label, field.required)}
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
            <div key={field.name} className={marcaError(field.name)}>
              <AppSelect
                label={etiqueta(field.label, field.required)}
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
            </div>
          );
        }

        return (
          <div key={field.name} className={marcaError(field.name)}>
            <AppInput
              label={etiqueta(field.label, field.required)}
              type={field.type === "date" ? "date" : field.type === "number" ? "number" : "text"}
              value={value}
              onChange={(e) => onChange(field.name, clampNumerico(field, e.target.value))}
              placeholder={field.placeholder}
              step={field.step}
              min={field.min}
              max={field.max}
              uiSize="lg"
            />
          </div>
        );
      })}
    </div>
  );
}
