import type { Dispatch, SetStateAction } from "react";
import { AppChip } from "../../components/ui";
import type { Personal } from "../../features/personal/api";
import PersonalTransitorios from "./PersonalTransitorios";
import type { TransitorioDraft } from "./transitorios";

type Props = {
  personalList: Personal[];
  /** { personal_bodega_id: "horas" } */
  personal: Record<string, string>;
  setPersonal: Dispatch<SetStateAction<Record<string, string>>>;
  personalQuery: string;
  setPersonalQuery: Dispatch<SetStateAction<string>>;
  transitorios: TransitorioDraft[];
  setTransitorios: (next: TransitorioDraft[]) => void;
  horasHombre: number;
  jornalesAuto: number;
};

const hoursInputCls =
  "w-24 rounded-[var(--radius-sm)] border border-[color:var(--field-border)] bg-[color:var(--field-bg)] px-2 py-1 text-sm text-[color:var(--field-text)]";

/**
 * Bloque de "Personal asignado" (legajos propios/contratados con horas) +
 * operarios transitorios. Compartido por el registro de actividad y el panel
 * de costos para que cualquier mejora se toque en un solo lugar.
 */
export default function PersonalSection({
  personalList,
  personal,
  setPersonal,
  personalQuery,
  setPersonalQuery,
  transitorios,
  setTransitorios,
  horasHombre,
  jornalesAuto,
}: Props) {
  const query = personalQuery.trim().toLowerCase();

  return (
    <>
      {personalList.length > 0 ? (
        <div className="mt-3">
          <p className="mb-1 text-sm font-medium text-[color:var(--field-label)]">
            Personal asignado (horas por persona)
          </p>
          <input
            type="search"
            value={personalQuery}
            onChange={(e) => setPersonalQuery(e.target.value)}
            placeholder="Buscar persona…"
            className="mb-2 w-full max-w-xs rounded-[var(--radius-sm)] border border-[color:var(--field-border)] bg-[color:var(--field-bg)] px-3 py-1.5 text-sm text-[color:var(--field-text)]"
          />
          {(["interno", "externo"] as const).map((tp) => {
            const items = personalList.filter(
              (o) => o.tipo === tp && o.nombre.toLowerCase().includes(query),
            );
            if (!items.length) return null;
            return (
              <div key={tp} className="mb-2">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--text-ink-muted)]">
                  {tp === "interno" ? "Propio" : "Contratado"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {items.map((o) => {
                    const active = o.personal_bodega_id in personal;
                    return (
                      <AppChip
                        key={o.personal_bodega_id}
                        active={active}
                        onClick={() =>
                          setPersonal((prev) => {
                            const next = { ...prev };
                            if (active) delete next[o.personal_bodega_id];
                            else next[o.personal_bodega_id] = "";
                            return next;
                          })
                        }
                      >
                        {o.nombre}
                      </AppChip>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {Object.keys(personal).length > 0 ? (
            <div className="mt-3 space-y-2">
              {personalList
                .filter((o) => o.personal_bodega_id in personal)
                .map((o) => (
                  <div key={o.personal_bodega_id} className="flex items-center gap-2">
                    <span className="min-w-40 text-sm">{o.nombre}</span>
                    <input
                      type="number"
                      min="0"
                      value={personal[o.personal_bodega_id]}
                      onChange={(e) =>
                        setPersonal((prev) => ({
                          ...prev,
                          [o.personal_bodega_id]: e.target.value !== "" && Number(e.target.value) < 0 ? "0" : e.target.value,
                        }))
                      }
                      placeholder="horas"
                      className={hoursInputCls}
                    />
                    <button
                      type="button"
                      className="text-xs text-[color:var(--text-ink-muted)] hover:text-[color:var(--field-error)]"
                      onClick={() => setPersonal((prev) => { const n = { ...prev }; delete n[o.personal_bodega_id]; return n; })}
                    >
                      quitar
                    </button>
                  </div>
                ))}
            </div>
          ) : null}
          {horasHombre > 0 ? (
            <p className="mt-2 text-xs text-[color:var(--text-ink-muted)]">
              Horas-hombre totales: <span className="font-semibold">{horasHombre}</span> · Jornales (auto):{" "}
              <span className="font-semibold">{jornalesAuto}</span>
            </p>
          ) : null}
        </div>
      ) : (
        <p className="mt-3 text-xs text-[color:var(--text-ink-muted)]">
          No hay personal cargado. Agregalo en <span className="font-medium text-[color:var(--text-ink)]">Bodega → Personal</span>, o sumá operarios transitorios abajo.
        </p>
      )}

      <PersonalTransitorios value={transitorios} onChange={setTransitorios} />
    </>
  );
}
