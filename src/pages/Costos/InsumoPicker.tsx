import { useMemo, useState } from "react";
import { AppButton, AppInput, AppSearchSelect, AppSelect } from "../../components/ui";
import type { AppSearchOption } from "../../components/ui";
import { estadoStock, etiquetaInsumo, textoBuscableInsumo } from "../../features/actividades/buscarInsumos";
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
  /** `null` = la cantidad la manda el cálculo. Con valor = el usuario la pisó a mano. */
  const [cantidadManual, setCantidadManual] = useState<string | null>(null);

  // Memoizado a propósito: este componente re-renderiza con cada tecla de "Dosis por ha",
  // y sin esto se re-normalizarían los ~300 nombres del catálogo en cada pulsación.
  const opcionesInsumo: AppSearchOption[] = useMemo(
    () =>
      insumos.map((i) => {
        const stock = estadoStock(i.insumo_id, existencias);
        return {
          value: i.insumo_id,
          label: etiquetaInsumo(i),
          search: textoBuscableInsumo(i),
          detail: i.principio_activo ?? "Sin principio activo",
          badge: (
            <span
              className={
                stock.clase === "agotado"
                  ? "text-[color:var(--feedback-danger-text)]"
                  : "text-[color:var(--text-ink-muted)]"
              }
            >
              {stock.texto}
            </span>
          ),
        };
      }),
    [insumos, existencias],
  );

  const cantidadCalculada = useMemo(() => {
    const dosisN = Number(dosis);
    const superficieN = Number(superficieHa);
    if (!(dosisN > 0) || !(superficieN > 0)) return 0;
    return Number((dosisN * superficieN).toFixed(2));
  }, [dosis, superficieHa]);

  const usandoManual = cantidadManual !== null;
  const cantidadTotal = usandoManual
    ? Number(cantidadManual)
    : cantidadCalculada;
  const cantidadValor = usandoManual
    ? cantidadManual
    : cantidadCalculada > 0
      ? String(cantidadCalculada)
      : "";

  const submit = async () => {
    if (!insId) return onError?.("Seleccioná un insumo del catálogo.");
    const dosisN = Number(dosis);
    const cantidadN = cantidadTotal;
    if (!(dosisN > 0)) return onError?.("La dosis por ha es obligatoria.");
    // La superficie solo hace falta si dependemos del cálculo; con cantidad manual no.
    if (!usandoManual && !(Number(superficieHa) > 0)) {
      return onError?.("La superficie intervenida debe ser mayor a 0 para calcular la cantidad total.");
    }
    if (!(cantidadN > 0)) {
      return onError?.("La cantidad total debe ser mayor a 0.");
    }
    const insumo = insumos.find((i) => i.insumo_id === insId);
    if (!insumo) return onError?.("Insumo no encontrado.");
    setAdding(true);
    try {
      await onAdd({ insumo, dosis_ha: dosisN, unidad_dosis: unidad.trim() || "kg/ha", cantidad_total: cantidadN });
      setInsId("");
      setDosis("");
      setCantidadManual(null);
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
        <AppSearchSelect
          label="Insumo"
          value={insId}
          onChange={setInsId}
          options={opcionesInsumo}
          placeholder="Buscar por nombre o principio activo…"
          nothingFoundLabel="Ningún insumo coincide"
        />
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
          value={cantidadValor}
          onChange={(e) => {
            const v = e.target.value;
            // Vaciar el campo devuelve el control al cálculo automático.
            setCantidadManual(v === "" ? null : v);
          }}
        />
      </div>
      <p className="mt-2 text-xs text-[color:var(--text-ink-muted)]">
        {usandoManual ? (
          <>
            Valor manual.
            {cantidadCalculada > 0 ? ` Calculado: ${cantidadCalculada}.` : ""}{" "}
            <button
              type="button"
              onClick={() => setCantidadManual(null)}
              className="underline underline-offset-2"
            >
              Volver al cálculo automático
            </button>
          </>
        ) : Number(superficieHa) > 0 ? (
          `Cantidad total = dosis x ${Number(superficieHa).toLocaleString("es-AR", { maximumFractionDigits: 2 })} ha de superficie intervenida. Podés editarla si aplicaste otra cantidad.`
        ) : (
          "Definí la superficie intervenida para calcularla, o escribí la cantidad total a mano."
        )}
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
