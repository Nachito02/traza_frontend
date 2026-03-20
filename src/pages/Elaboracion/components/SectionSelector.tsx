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
    <section className="rounded-2xl bg-primary p-4 shadow-lg">
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => onChange(option.key)}
            className={[
              "rounded border px-3 py-2 text-xs font-semibold transition",
              value === option.key
                ? "border-[#C9A961] bg-[#FFF9F0] text-[#722F37]"
                : "border-[#C9A961]/40 bg-white text-[#722F37] hover:bg-[#FFF9F0]",
            ].join(" ")}
          >
            {option.label}
          </button>
        ))}
      </div>
    </section>
  );
}
