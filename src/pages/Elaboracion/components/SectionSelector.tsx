import { AppButton, AppCard } from "../../../components/ui";

export type SectionOption<T extends string> = {
  key: T;
  label: string;
};

type SectionSelectorProps<T extends string> = {
  value: T;
  onChange: (value: T) => void;
  options: Array<SectionOption<T>>;
  /** When true, renders only the button row without a wrapping AppCard */
  bare?: boolean;
};

export default function SectionSelector<T extends string>({
  value,
  onChange,
  options,
  bare = false,
}: SectionSelectorProps<T>) {
  const buttons = (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <AppButton
          key={option.key}
          type="button"
          variant={value === option.key ? "primary" : "secondary"}
          size="sm"
          onClick={() => onChange(option.key)}
        >
          {option.label}
        </AppButton>
      ))}
    </div>
  );

  if (bare) return buttons;

  return (
    <AppCard as="section" tone="default" padding="sm">
      {buttons}
    </AppCard>
  );
}
