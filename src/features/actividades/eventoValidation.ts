import { customValueError, LEGACY_OTHER_FIELDS, resolveCustomDraftValue } from "../../lib/customOptions";
import type { EventoConfig, FieldDef } from "../../pages/Trazabilidad/eventoConfig";

export type CampoFaltante = {
  name: string;
  label: string;
  /** Por qué no pasa: vacío, o el detalle del "Otro" mal completado. */
  motivo: string;
};

/**
 * Campos que `EventoFields` realmente pinta en pantalla.
 *
 * Es la única fuente de verdad: la valida y la renderiza el mismo listado. Si se separaran,
 * se podría exigir un campo que el usuario no ve y el formulario quedaría trabado sin salida.
 * Concretamente hay 10 campos marcados `required` en el catálogo que no se renderizan:
 * los `user_select` (el responsable se resuelve por contexto en el paso de ejecución) y los
 * campos "otro" legacy, que se completan desde el select padre.
 */
export function camposRenderizados(
  config: EventoConfig | null | undefined,
  draft: Record<string, string>,
): FieldDef[] {
  if (!config) return [];
  const nombresLegacyOtro = new Set(
    config.fields
      .filter((f) => f.allowOther)
      .map((f) => LEGACY_OTHER_FIELDS[f.name])
      .filter((name): name is string => Boolean(name)),
  );

  return config.fields.filter((field) => {
    if (field.type === "user_select") return false;
    if (nombresLegacyOtro.has(field.name)) return false;
    // Un campo condicional oculto no puede ser obligatorio: no hay nada visible que completar.
    if (field.showWhen && draft[field.showWhen.field] !== field.showWhen.value) return false;
    return true;
  });
}

/** Valor efectivo del campo, contemplando el defaultValue que aplica EventoFields al renderizar. */
function valorDe(field: FieldDef, draft: Record<string, string>): string {
  return draft[field.name] ?? field.defaultValue ?? "";
}

/**
 * Campos obligatorios del evento que todavía no están completos.
 *
 * El catálogo (`eventoConfig`) marca 92 campos como `required`, pero hasta ahora nadie los
 * miraba: se podía avanzar de paso y guardar la actividad con el detalle vacío.
 */
export function camposObligatoriosFaltantes(
  config: EventoConfig | null | undefined,
  draft: Record<string, string>,
): CampoFaltante[] {
  const faltantes: CampoFaltante[] = [];
  for (const field of camposRenderizados(config, draft)) {
    if (!field.required) continue;

    if (field.allowOther) {
      // Con "Otro" no alcanza con que haya valor: el texto libre tiene que ser válido.
      const valor = resolveCustomDraftValue(field, draft);
      const error = customValueError(valor, field.options ?? [], true);
      if (error) faltantes.push({ name: field.name, label: field.label, motivo: error });
      continue;
    }

    if (!valorDe(field, draft).trim()) {
      faltantes.push({ name: field.name, label: field.label, motivo: "Falta completar." });
    }
  }
  return faltantes;
}

/** Texto corto para el hint del botón "Siguiente": nombra lo que falta sin abrumar. */
export function resumirFaltantes(faltantes: CampoFaltante[], max = 2): string {
  if (faltantes.length === 0) return "";
  const nombres = faltantes.slice(0, max).map((f) => f.label.toLowerCase());
  const resto = faltantes.length - nombres.length;
  const lista = nombres.join(", ");
  return resto > 0 ? `${lista} y ${resto} más` : lista;
}

/**
 * Recorta un valor numérico al rango declarado en el catálogo.
 *
 * Los atributos `min`/`max` del input no impiden tipear fuera de rango: solo gobiernan las
 * flechitas y la validación nativa del submit. Un porcentaje de avance en 250 se guardaría
 * igual, así que el recorte se hace acá.
 */
export function clampNumerico(field: FieldDef, value: string): string {
  if (field.type !== "number" || value === "") return value;
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  if (field.min !== undefined && n < Number(field.min)) return field.min;
  if (field.max !== undefined && n > Number(field.max)) return field.max;
  return value;
}
