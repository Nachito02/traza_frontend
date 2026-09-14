import type { ReactNode } from "react";
import AppSelect from "./AppSelect";
import AppInput from "./AppInput";
import { CUSTOM_OPTION, CUSTOM_VALUE_MAX_LENGTH, customValueError, isOtherOption, type SelectOption } from "../../lib/customOptions";

type Props = {
  label: ReactNode;
  value: string;
  options: readonly SelectOption[];
  onChange: (value: string) => void;
  otherLabel?: string;
  required?: boolean;
  disabled?: boolean;
  error?: ReactNode;
  className?: string;
};

/** Opt-in text values: the sentinel represents an empty custom input, never a saved value. */
export default function AppSelectWithOther({ label, value, options, onChange, otherLabel = "Especificá otra opción", required, disabled, error, className }: Props) {
  const knownOptions = options.filter((option) => !isOtherOption(option.value));
  const custom = Boolean(value) && !knownOptions.some((option) => option.value === value);
  const text = isOtherOption(value) ? "" : value;
  return (
    <div className={className}>
      <AppSelect label={label} value={custom ? CUSTOM_OPTION : value} onChange={(event) => onChange(event.target.value)} required={required} disabled={disabled} error={!custom ? error : undefined}>
        <option value="">Seleccionar…</option>
        {knownOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        <option value={CUSTOM_OPTION}>Otro (especificar)</option>
      </AppSelect>
      {custom && <AppInput className="mt-3" label={otherLabel} value={text} onChange={(event) => onChange(event.target.value || CUSTOM_OPTION)} maxLength={CUSTOM_VALUE_MAX_LENGTH} required disabled={disabled} error={error || customValueError(value, knownOptions, true)} />}
    </div>
  );
}
