import { AppButton, AppDisclosure } from "../../components/ui";
import InsumoPicker, { type AddInsumoLine } from "./InsumoPicker";
import { tituloSeccionInsumos, type InsumosModo } from "../../features/actividades/insumosPolicy";
import type { InsumoCatalogo } from "../../features/costos/api";
import type { Existencia } from "../../features/inventario/api";

export type InsumoLinea = {
  insumo_id: string;
  descripcion: string;
  dosis_ha: string;
  unidad_dosis: string;
  cantidad_total: string;
  unidad_total: string;
  /** Presente solo cuando la línea ya está persistida (modos task/edit). */
  actividad_insumo_id?: string;
};

type Props = {
  lines: InsumoLinea[];
  modo: InsumosModo;
  superficieHa: number;
  catalogo: InsumoCatalogo[];
  existencias: Record<string, Existencia>;
  onAdd: (line: AddInsumoLine) => void | Promise<void>;
  onRemove: (index: number, line: InsumoLinea) => void | Promise<void>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Marca de error cuando el submit falló por falta de insumos. */
  invalid?: boolean;
  busy?: boolean;
  /** true en task/edit: las líneas se guardan al agregarlas, no al enviar el wizard. */
  persisteAlInstante?: boolean;
  onError: (message: string) => void;
};

/**
 * Sección de insumos compartida por los tres modos del wizard (nueva actividad, completar
 * tarea y editar registro). No hace red: la persistencia la decide el caller vía
 * `onAdd`/`onRemove`, que es lo que permite que "nueva actividad" acumule en memoria y
 * task/edit pegue al backend línea por línea.
 */
export default function InsumosSection({
  lines,
  modo,
  superficieHa,
  catalogo,
  existencias,
  onAdd,
  onRemove,
  open,
  onOpenChange,
  invalid = false,
  busy = false,
  persisteAlInstante = false,
  onError,
}: Props) {
  const reservado = (id: string) =>
    lines
      .filter((i) => i.insumo_id === id)
      .reduce((acc, i) => acc + (Number(i.cantidad_total) || 0), 0);

  return (
    <AppDisclosure
      summary={tituloSeccionInsumos(modo)}
      hint={lines.length ? `${lines.length} cargado${lines.length > 1 ? "s" : ""}` : undefined}
      open={open}
      onOpenChange={onOpenChange}
      collapsible={modo !== "requerido"}
      invalid={invalid}
    >
      {modo === "requerido" ? (
        <p className="mb-3 rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-accent-soft)] px-3 py-2 text-xs text-[color:var(--text-ink-muted)]">
          Esta actividad requiere registrar el producto aplicado: se guarda el insumo y{" "}
          <strong>descuenta stock</strong> automáticamente.
        </p>
      ) : null}

      {persisteAlInstante ? (
        <p className="mb-3 text-xs text-[color:var(--text-ink-muted)]">
          Los insumos se guardan al agregarlos.
        </p>
      ) : null}

      {lines.length ? (
        <ul className="mb-3 space-y-2">
          {lines.map((i, idx) => (
            <li
              key={i.actividad_insumo_id ?? `${i.insumo_id}::${idx}`}
              className="flex items-center justify-between rounded-[var(--radius-md)] border border-[color:var(--border-shell)] px-3 py-2 text-sm"
            >
              <span>
                <strong>{i.descripcion}</strong> · {i.dosis_ha} {i.unidad_dosis} · total{" "}
                {i.cantidad_total} {i.unidad_total}
              </span>
              <AppButton
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() => void onRemove(idx, i)}
              >
                Quitar
              </AppButton>
            </li>
          ))}
        </ul>
      ) : null}

      <InsumoPicker
        insumos={catalogo}
        existencias={existencias}
        superficieHa={superficieHa}
        reservado={reservado}
        onAdd={onAdd}
        onError={onError}
      />
    </AppDisclosure>
  );
}
