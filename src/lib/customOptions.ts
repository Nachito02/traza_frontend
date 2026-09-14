export const CUSTOM_OPTION = "__custom__";
export const CUSTOM_VALUE_MAX_LENGTH = 200;
export type SelectOption = { value: string; label: string };

export function isOtherOption(value: string) {
  return [CUSTOM_OPTION, "otro", "otra", "otros", "otras", "__otro__", "__otra__"].includes(value.trim().toLowerCase());
}

export function customValueError(value: string, options: readonly SelectOption[], required = false): string | undefined {
  if (options.some((option) => option.value === value && !isOtherOption(value))) return;
  if (!value && !required) return;
  if (!value.trim() || isOtherOption(value)) return "Especificá una opción.";
  if (value.trim().length > CUSTOM_VALUE_MAX_LENGTH) return "Usá como máximo 200 caracteres.";
}

type CustomField = { name: string; label: string; allowOther?: boolean; required?: boolean; options?: SelectOption[] };
export const LEGACY_OTHER_FIELDS: Record<string, string> = {
  tipo_labor: "otro_labor", tipo_practica: "otro_practica", sistema_riego: "sistema_riego_otro",
};

export function resolveCustomDraftValue(field: CustomField, draft: Record<string, string>) {
  const value = draft[field.name] ?? "";
  if (!isOtherOption(value) || value === CUSTOM_OPTION) return value;
  return draft[LEGACY_OTHER_FIELDS[field.name]]?.trim() || draft.observaciones?.trim() || CUSTOM_OPTION;
}

export function serializeCustomFields(draft: Record<string, string>, fields: readonly CustomField[]) {
  const result = { ...draft };
  for (const field of fields.filter((item) => item.allowOther)) {
    const value = resolveCustomDraftValue(field, draft);
    const error = customValueError(value, field.options ?? [], field.required);
    if (error) throw new Error(`${field.label}: ${error}`);
    result[field.name] = value.trim();
    const legacy = LEGACY_OTHER_FIELDS[field.name];
    if (legacy) delete result[legacy];
  }
  return result;
}
