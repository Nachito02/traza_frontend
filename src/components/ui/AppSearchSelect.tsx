import { Select } from "@mantine/core";
import { useCallback, useMemo } from "react";
import type { ReactNode } from "react";
import { coincideBusqueda } from "../../lib/texto";

type AppSearchSelectSize = "sm" | "md" | "lg";

export type AppSearchOption = {
  value: string;
  /** Una línea: es lo que queda en el input cuando la opción está elegida. */
  label: string;
  /** Texto buscable, ya normalizado. Puede incluir campos que no se muestran. */
  search: string;
  /** Segunda línea dentro del desplegable (ej. principio activo). */
  detail?: ReactNode;
  /** Chip a la derecha dentro del desplegable (ej. stock disponible). */
  badge?: ReactNode;
};

export type AppSearchSelectProps = {
  label?: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  uiSize?: AppSearchSelectSize;
  value: string;
  onChange: (value: string) => void;
  options: AppSearchOption[];
  nothingFoundLabel?: string;
  /** Cuántas opciones se montan a la vez. Evita 300 nodos en el DOM al abrir. */
  limit?: number;
};

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const sizeClasses: Record<AppSearchSelectSize, string> = {
  sm: "min-h-11 text-sm",
  md: "min-h-12 text-base",
  lg: "min-h-14 text-base",
};

const fieldToneClasses = {
  default:
    "border-[color:var(--field-border)] hover:border-[color:var(--field-border-hover)] focus:border-[color:var(--field-border-focus)]",
  error:
    "border-[color:var(--field-error)] bg-[color:var(--field-error-bg)] focus:border-[color:var(--field-error)]",
} as const;

/**
 * Select con búsqueda, para catálogos largos donde un `<select>` nativo obliga a scrollear
 * a ciegas. Se escribe parte del nombre y la lista se filtra.
 *
 * Construido sobre el `Select` de Mantine —la misma librería que ya envuelve `AppSelect`—
 * en lugar de a mano, porque un combobox accesible de verdad necesita rol ARIA,
 * `aria-activedescendant`, navegación con flechas, Home/End, Escape, scroll del ítem activo
 * y anuncio a lectores de pantalla. Hacerlo a mano queda a medias casi siempre.
 */
export default function AppSearchSelect({
  label,
  description,
  error,
  placeholder,
  disabled,
  className,
  uiSize = "md",
  value,
  onChange,
  options,
  nothingFoundLabel = "Sin coincidencias",
  limit = 50,
}: AppSearchSelectProps) {
  // `ComboboxItem` de Mantine solo admite {value, label, disabled}: `search`, `detail` y
  // `badge` no caben ahí. Se recuperan por este mapa desde `filter` y `renderOption`.
  const meta = useMemo(() => new Map(options.map((o) => [o.value, o])), [options]);

  // Un `value` duplicado hace que Mantine 9 tire error y no renderice nada. Hoy los ids son
  // PK así que no pasa, pero deduplicar es barato y elimina la clase de bug.
  const data = useMemo(() => {
    const vistos = new Set<string>();
    return options
      .filter((o) => (vistos.has(o.value) ? false : (vistos.add(o.value), true)))
      .map((o) => ({ value: o.value, label: o.label }));
  }, [options]);

  const filter = useCallback(
    ({ options: items, search }: { options: unknown[]; search: string }) =>
      (items as { value: string }[]).filter((item) =>
        coincideBusqueda(meta.get(item.value)?.search ?? "", search),
      ),
    [meta],
  );

  const renderOption = useCallback(
    ({ option }: { option: { value: string; label: string } }) => {
      const o = meta.get(option.value);
      return (
        <div className="flex w-full min-w-0 items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-[color:var(--text-ink)]">
              {option.label}
            </div>
            {o?.detail ? (
              <div className="truncate text-xs text-[color:var(--text-ink-muted)]">{o.detail}</div>
            ) : null}
          </div>
          {o?.badge ? <div className="shrink-0 text-xs">{o.badge}</div> : null}
        </div>
      );
    },
    [meta],
  );

  return (
    <Select
      label={label}
      description={description}
      error={error}
      disabled={disabled}
      className={className}
      placeholder={placeholder}
      searchable
      clearable
      // Mantine habla `Value | null`; el resto de la app habla strings. Se traduce en la
      // frontera para que `setX("")` siga limpiando de verdad.
      value={value || null}
      onChange={(v) => onChange(v ?? "")}
      data={data}
      filter={filter as never}
      renderOption={renderOption as never}
      limit={limit}
      nothingFoundMessage={nothingFoundLabel}
      // El desplegable hereda el ancho del campo, que acá es 1/4 de una grilla: se le da
      // aire propio para que entren el nombre, el principio activo y el stock.
      // `withinPortal: false` no es un detalle menor: este control también se monta dentro de
      // un AppModal (VasijasProcesoPage → CostosActividadPanel). Portaleado a <body>, el
      // desplegable queda fuera del contexto de apilamiento del modal y NO se ve, por más
      // z-index que se le ponga. Sin portal se renderiza dentro del modal y funciona; el
      // caso sin modal también, porque ningún contenedor padre lo recorta.
      // El ancho propio evita que herede el del campo, que es 1/4 de una grilla.
      comboboxProps={{ width: 340, position: "bottom-start", withinPortal: false, zIndex: 1100 }}
      styles={{
        label: { color: "var(--field-label)", fontSize: "0.95rem", fontWeight: 500 },
        description: { color: "var(--text-on-dark-muted)" },
        error: { color: "var(--field-error)", fontSize: "0.95rem", fontWeight: 500 },
        input: {
          background: error ? "var(--field-error-bg)" : "var(--field-bg)",
          borderColor: error ? "var(--field-error)" : "var(--field-border)",
          color: "var(--field-text)",
          borderRadius: "var(--radius-sm)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)",
        },
        dropdown: {
          background: "var(--surface-base)",
          borderColor: "var(--border-shell)",
          borderRadius: "var(--radius-md)",
        },
      }}
      classNames={{
        root: "block space-y-2.5",
        label: "block text-sm font-medium text-[color:var(--field-label)]",
        description: "block text-xs text-[color:var(--text-on-dark-muted)]",
        error: "block text-sm font-medium text-[color:var(--field-error)]",
        input: joinClasses(
          "w-full rounded-[var(--radius-sm)] border bg-[color:var(--field-bg)] px-4 font-medium text-[color:var(--field-text)] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] outline-none transition-all duration-[var(--motion-fast)] ease-[var(--motion-standard)] hover:bg-[color:var(--field-bg-hover)] focus:bg-[color:var(--field-bg-focus)] focus:shadow-[0_0_0_3px_rgba(78,147,183,0.12)] disabled:cursor-not-allowed disabled:opacity-60",
          error ? fieldToneClasses.error : fieldToneClasses.default,
          uiSize === "lg" && "py-4",
          uiSize !== "lg" && "py-3",
          sizeClasses[uiSize],
        ),
        // El ScrollArea interno de Mantine trae `min-width: min-content`, así que las filas se
        // estiran al ancho del texto más largo: nada se trunca y el badge de stock queda fuera
        // de la vista. Liberarlo es lo que hace que `truncate` funcione.
        dropdown:
          "shadow-[var(--shadow-raised)] [&_.mantine-ScrollArea-content]:!min-w-0 [&_.mantine-ScrollArea-content]:!w-full",
        // `min-w-0` + `[&>*]:min-w-0`: el option de Mantine es flex, y sin liberar el ancho
        // mínimo de sus hijos el `truncate` no tiene contra qué recortar y el badge se va de foco.
        option: joinClasses(
          "rounded-[var(--radius-sm)] px-2 py-2 min-w-0 [&>*]:min-w-0",
          // Mantine resalta la opción activa con su azul por defecto; se reemplaza por el
          // acento suave de la plataforma, que además deja el texto oscuro legible.
          "data-[combobox-selected]:!bg-[color:var(--surface-accent-soft)]",
          "hover:!bg-[color:var(--surface-soft)]",
        ),
        empty: "px-3 py-3 text-sm text-[color:var(--text-ink-muted)]",
      }}
    />
  );
}
