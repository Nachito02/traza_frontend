import { useState } from "react";
import { AppButton, AppInput, AppSelect } from "../../components/ui";
import { getApiErrorMessage } from "../../lib/api";
import type { InsumoCatalogo } from "../../features/costos/api";
import type { Existencia } from "../../features/inventario/api";

export type AddInsumoLine = {
  insumo: InsumoCatalogo;
  dosis_ha: number;
  unidad_dosis: string;
  cantidad_total: number;
};

type Props = {
  insumos: InsumoCatalogo[];
  existencias: Record<string, Existencia>;
  /** Cantidad ya reservada (no reflejada en existencias) para el insumo — ej. líneas en borrador. */
  reservado?: (insumoId: string) => number;
  onAdd: (line: AddInsumoLine) => void | Promise<void>;
  onError?: (message: string) => void;
};

/**
 * Formulario para agregar un insumo: selector con disponible + dosis/unidad/cantidad
 * y aviso de stock restante. Compartido por el registro de actividad (agrega a un
 * borrador) y el panel de costos (pega al backend). La persistencia la resuelve el
 * caller vía `onAdd`; este componente sólo maneja los inputs y la validación.
 */
export default function InsumoPicker({ insumos, existencias, reservado, onAdd, onError }: Props) {
  const [insId, setInsId] = useState("");
  const [dosis, setDosis] = useState("");
  const [unidad, setUnidad] = useState("kg/ha");
  const [cantidad, setCantidad] = useState("");
  const [adding, setAdding] = useState(false);

  const submit = async () => {
    if (!insId) return onError?.("Seleccioná un insumo del catálogo.");
    const dosisN = Number(dosis);
    const cantidadN = Number(cantidad);
    if (!(dosisN > 0) || !(cantidadN > 0)) return onError?.("Dosis por ha y cantidad total son obligatorias.");
    const insumo = insumos.find((i) => i.insumo_id === insId);
    if (!insumo) return onError?.("Insumo no encontrado.");
    setAdding(true);
    try {
      await onAdd({ insumo, dosis_ha: dosisN, unidad_dosis: unidad.trim() || "kg/ha", cantidad_total: cantidadN });
      setInsId("");
      setDosis("");
      setCantidad("");
    } catch (e) {
      onError?.(getApiErrorMessage(e));
    } finally {
      setAdding(false);
    }
  };

  const ex = insId ? existencias[insId] : undefined;

  return (
    <>
      <div className="grid gap-3 md:grid-cols-4">
        <AppSelect label="Insumo" value={insId} onChange={(e) => setInsId(e.target.value)}>
          <option value="">Seleccionar…</option>
          {insumos.map((i) => {
            const e = existencias[i.insumo_id];
            return (
              <option key={i.insumo_id} value={i.insumo_id}>
                {i.nombre_comercial} ({i.tipo}){e ? ` · disp. ${e.stock} ${e.unidad_base}` : ""}
              </option>
            );
          })}
        </AppSelect>
        <AppInput label="Dosis por ha" type="number" min="0" value={dosis} onChange={(e) => setDosis(e.target.value)} />
        <AppInput label="Unidad dosis" value={unidad} onChange={(e) => setUnidad(e.target.value)} />
        <AppInput label="Cantidad total" type="number" min="0" value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
      </div>

      {ex ? (() => {
        const usado = (reservado?.(insId) ?? 0) + (Number(cantidad) || 0);
        const queda = ex.stock - usado;
        return (
          <p className={`mt-2 text-xs ${queda < 0 ? "text-[color:var(--feedback-danger-text)]" : "text-[color:var(--text-ink-muted)]"}`}>
            Disponible: <strong>{ex.stock} {ex.unidad_base}</strong>
            {usado > 0 ? ` · quedará ${queda} ${ex.unidad_base}` : ""}
            {queda < 0 ? " — stock insuficiente (quedará en negativo)" : ""}
          </p>
        );
      })() : null}

      <div className="mt-3">
        <AppButton variant="secondary" loading={adding} onClick={() => void submit()}>
          Agregar insumo
        </AppButton>
      </div>
    </>
  );
}
