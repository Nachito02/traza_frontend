import { useMemo, useState } from "react";
import { AppButton, AppInput, AppSelect } from "../../components/ui";
import { getApiErrorMessage } from "../../lib/api";
import type { InsumoCatalogo } from "../../features/costos/api";
import type { Existencia } from "../../features/inventario/api";

const UNIDADES_DOSIS = [
  { value: "kg/ha", label: "kg/ha" },
  { value: "l/ha", label: "l/ha" },
  { value: "g/ha", label: "g/ha" },
  { value: "ml/ha", label: "ml/ha" },
  { value: "unidad/ha", label: "unidad/ha" },
  { value: "ton/ha", label: "ton/ha" },
];

export type AddInsumoLine = {
  insumo: InsumoCatalogo;
  dosis_ha: number;
  unidad_dosis: string;
  cantidad_total: number;
};

type Props = {
  insumos: InsumoCatalogo[];
  existencias: Record<string, Existencia>;
  superficieHa?: number | null;
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
export default function InsumoPicker({ insumos, existencias, superficieHa, reservado, onAdd, onError }: Props) {
  const [insId, setInsId] = useState("");
  const [dosis, setDosis] = useState("");
  const [unidad, setUnidad] = useState("kg/ha");
  const [adding, setAdding] = useState(false);
  const cantidadTotal = useMemo(() => {
    const dosisN = Number(dosis);
    const superficieN = Number(superficieHa);
    if (!(dosisN > 0) || !(superficieN > 0)) return 0;
    return Number((dosisN * superficieN).toFixed(2));
  }, [dosis, superficieHa]);

  const submit = async () => {
    if (!insId) return onError?.("Seleccioná un insumo del catálogo.");
    const dosisN = Number(dosis);
    const cantidadN = cantidadTotal;
    if (!(dosisN > 0)) return onError?.("La dosis por ha es obligatoria.");
    if (!(Number(superficieHa) > 0) || !(cantidadN > 0)) {
      return onError?.("La superficie intervenida debe ser mayor a 0 para calcular la cantidad total.");
    }
    const insumo = insumos.find((i) => i.insumo_id === insId);
    if (!insumo) return onError?.("Insumo no encontrado.");
    setAdding(true);
    try {
      await onAdd({ insumo, dosis_ha: dosisN, unidad_dosis: unidad.trim() || "kg/ha", cantidad_total: cantidadN });
      setInsId("");
      setDosis("");
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
        <AppSelect label="Unidad dosis" value={unidad} onChange={(e) => setUnidad(e.target.value)}>
          {UNIDADES_DOSIS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </AppSelect>
        <AppInput
          label="Cantidad total"
          type="number"
          min="0"
          value={cantidadTotal > 0 ? String(cantidadTotal) : ""}
          readOnly
        />
      </div>
      <p className="mt-2 text-xs text-[color:var(--text-ink-muted)]">
        {Number(superficieHa) > 0
          ? `Cantidad total = dosis x ${Number(superficieHa).toLocaleString("es-AR", { maximumFractionDigits: 2 })} ha de superficie intervenida.`
          : "Definí la superficie intervenida para calcular automáticamente la cantidad total."}
      </p>

      {ex ? (() => {
        const usado = (reservado?.(insId) ?? 0) + cantidadTotal;
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
