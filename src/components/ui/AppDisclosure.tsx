import type { ReactNode } from "react";

export type AppDisclosureProps = {
  /** Encabezado siempre visible. */
  summary: ReactNode;
  /** Texto auxiliar a la derecha del encabezado (ej. "3 cargados"). */
  hint?: ReactNode;
  /** Controlado: el caller decide si está abierto (hace falta para forzar apertura al validar). */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Cuando es false, el encabezado no responde al click y la sección queda fija abierta. */
  collapsible?: boolean;
  /** Marca visual de error, para cuando la validación falla con la sección plegada. */
  invalid?: boolean;
  children: ReactNode;
  className?: string;
};

/**
 * Sección colapsable sobre `<details>` nativo, pero controlada: necesitamos poder abrirla
 * desde afuera cuando la validación falla o cuando ya hay contenido cargado.
 *
 * Ojo: `<details>` cerrado NO desmonta a sus hijos, solo los oculta. Si hay estado adentro,
 * sobrevive al plegado — que es justo lo que queremos para los borradores de insumo.
 */
function AppDisclosure({
  summary,
  hint,
  open,
  onOpenChange,
  collapsible = true,
  invalid = false,
  children,
  className,
}: AppDisclosureProps) {
  return (
    <details
      open={open}
      onToggle={(event) => {
        const next = (event.currentTarget as HTMLDetailsElement).open;
        if (next !== open) onOpenChange(next);
      }}
      className={[
        "rounded-[var(--radius-md)] border",
        invalid
          ? "border-[color:var(--feedback-danger-text)]"
          : "border-[color:var(--border-shell)]",
        className ?? "",
      ].join(" ")}
    >
      <summary
        onClick={(event) => {
          if (!collapsible) event.preventDefault();
        }}
        className={[
          "flex items-center justify-between gap-3 px-3 py-2 text-sm font-semibold",
          collapsible ? "cursor-pointer select-none" : "cursor-default",
        ].join(" ")}
      >
        <span>{summary}</span>
        {hint ? (
          <span className="text-xs font-normal text-[color:var(--text-ink-muted)]">{hint}</span>
        ) : null}
      </summary>
      <div className="border-t border-[color:var(--border-shell)] px-3 py-3">{children}</div>
    </details>
  );
}

export default AppDisclosure;
