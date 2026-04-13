import { AppButton, AppCard } from "../../../components/ui";

export type SectionOption<T extends string> = {
  key: T;
  label: string;
};

type SectionSelectorProps<T extends string> = {
  value: T;
  onChange: (value: T) => void;
  options: Array<SectionOption<T>>;
};

export default function SectionSelector<T extends string>({
  value,
  onChange,
  options,
}: SectionSelectorProps<T>) {
  return (
    <AppCard as="section" tone="default" padding="sm">
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
    </AppCard>
  );
}
