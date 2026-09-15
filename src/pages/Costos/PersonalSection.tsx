import { useMemo, type Dispatch, type SetStateAction } from "react";
import { MODALIDAD_LABELS, ROL_LABELS, type Personal } from "../../features/personal/api";
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

const money = (n: number) =>
  n.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

/**
 * Cómo se paga a esta persona, en una línea. Para `al_tanto` y `otro` no se muestra
 * un costo por hora porque no existe: se pagan por unidad producida, y mostrar "$0/h"
 * haría pensar que salen gratis.
 */
function detallePago(p: Personal): string {
  if (p.modalidad === "al_tanto" || p.modalidad === "otro") {
    return `${MODALIDAD_LABELS[p.modalidad]} · por unidad`;
  }
  if (p.costo_hora_efectivo > 0) return `${money(p.costo_hora_efectivo)}/h`;
  return `${MODALIDAD_LABELS[p.modalidad]} · sin costo cargado`;
}

/**
 * Bloque de "Personal asignado" (legajos propios/contratados con horas) +
 * operarios transitorios. Compartido por el registro de actividad y el panel
 * de costos para que cualquier mejora se toque en un solo lugar.
 *
 * Una sola lista de filas, no una nube de chips más una lista de horas aparte:
 * antes había que elegir arriba y bajar a otro bloque a cargar las horas de esa
 * misma persona. Cada fila muestra rol y cómo se le paga, que es lo que hace
 * falta para saber a quién estás asignando.
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

  const grupos = useMemo(() => {
    const coincide = (p: Personal) =>
      !query ||
      p.nombre.toLowerCase().includes(query) ||
      (p.rol ? ROL_LABELS[p.rol].toLowerCase().includes(query) : false) ||
      (p.legajo ?? "").toLowerCase().includes(query);

    return (["interno", "externo"] as const).map((tipo) => ({
      tipo,
      titulo: tipo === "interno" ? "Personal propio" : "Contratado",
      items: personalList.filter((p) => p.tipo === tipo && coincide(p)),
    }));
  }, [personalList, query]);

  const seleccionados = Object.keys(personal).length;
  const hayResultados = grupos.some((g) => g.items.length > 0);

  const toggle = (id: string, activo: boolean) =>
    setPersonal((prev) => {
      const next = { ...prev };
      if (activo) delete next[id];
      else next[id] = "";
      return next;
    });

  if (personalList.length === 0) {
    return (
      <>
        <p className="mt-3 text-xs text-[color:var(--text-ink-muted)]">
          No hay personal cargado. Agregalo en{" "}
          <span className="font-medium text-[color:var(--text-ink)]">Bodega → Personal</span>, o sumá
          operarios transitorios abajo.
        </p>
        <PersonalTransitorios value={transitorios} onChange={setTransitorios} />
      </>
    );
  }

  return (
    <>
      <div className="mt-5">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-[color:var(--field-label)]">Personal asignado</p>
            <p className="text-xs text-[color:var(--text-ink-muted)]">
              Elegí quiénes trabajaron y cargá las horas de cada uno.
            </p>
          </div>
          {seleccionados > 0 ? (
            <span className="rounded-full bg-[color:var(--surface-accent-soft)] px-2.5 py-1 text-xs font-medium text-[color:var(--text-ink)]">
              {seleccionados} seleccionado{seleccionados > 1 ? "s" : ""}
            </span>
          ) : null}
        </div>

        <input
          type="search"
          value={personalQuery}
          onChange={(e) => setPersonalQuery(e.target.value)}
          placeholder="Buscar por nombre, rol o legajo…"
          className="mb-4 w-full max-w-sm rounded-[var(--radius-sm)] border border-[color:var(--field-border)] bg-[color:var(--field-bg)] px-3 py-2 text-sm text-[color:var(--field-text)]"
        />

        {!hayResultados ? (
          <p className="text-xs text-[color:var(--text-ink-muted)]">
            Nadie coincide con “{personalQuery}”.
          </p>
        ) : null}

        <div className="space-y-5">
          {grupos.map((grupo) =>
            grupo.items.length === 0 ? null : (
              <div key={grupo.tipo}>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--text-ink-muted)]">
                  {grupo.titulo}
                  <span className="ml-1.5 font-normal normal-case tracking-normal">
                    ({grupo.items.length})
                  </span>
                </p>

                <ul className="space-y-2">
                  {grupo.items.map((p) => {
                    const activo = p.personal_bodega_id in personal;
                    const horas = personal[p.personal_bodega_id] ?? "";
                    return (
                      <li
                        key={p.personal_bodega_id}
                        className={`rounded-[var(--radius-md)] border px-3 py-2.5 transition-colors ${
                          activo
                            ? "border-[color:var(--accent-primary)] bg-[color:var(--surface-accent-soft)]"
                            : "border-[color:var(--border-shell)] hover:border-[color:var(--border-default)]"
                        }`}
                      >
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                          <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                            <input
                              type="checkbox"
                              checked={activo}
                              onChange={() => toggle(p.personal_bodega_id, activo)}
                              className="h-4 w-4 shrink-0 accent-[color:var(--accent-primary)]"
                            />
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium text-[color:var(--text-ink)]">
                                {p.nombre}
                              </span>
                              <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[color:var(--text-ink-muted)]">
                                {p.rol ? (
                                  <span className="rounded-full border border-[color:var(--border-shell)] px-2 py-0.5 font-medium">
                                    {ROL_LABELS[p.rol]}
                                  </span>
                                ) : null}
                                <span>{detallePago(p)}</span>
                              </span>
                            </span>
                          </label>

                          {activo ? (
                            <span className="flex shrink-0 items-center gap-2">
                              <input
                                type="number"
                                min="0"
                                step="0.5"
                                value={horas}
                                onChange={(e) =>
                                  setPersonal((prev) => ({
                                    ...prev,
                                    [p.personal_bodega_id]:
                                      e.target.value !== "" && Number(e.target.value) < 0
                                        ? "0"
                                        : e.target.value,
                                  }))
                                }
                                placeholder="0"
                                aria-label={`Horas trabajadas por ${p.nombre}`}
                                className="w-20 rounded-[var(--radius-sm)] border border-[color:var(--field-border)] bg-[color:var(--field-bg)] px-2 py-1.5 text-sm text-[color:var(--field-text)]"
                              />
                              <span className="text-xs text-[color:var(--text-ink-muted)]">h</span>
                              {/* Costo de esta línea, solo si se paga por hora: para al_tanto/otro
                                  el costo sale de las unidades producidas, no de las horas. */}
                              {Number(horas) > 0 && p.costo_hora_efectivo > 0 ? (
                                <span className="w-24 text-right text-xs font-medium tabular-nums text-[color:var(--text-ink)]">
                                  {money(Number(horas) * p.costo_hora_efectivo)}
                                </span>
                              ) : (
                                <span className="w-24" />
                              )}
                            </span>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ),
          )}
        </div>

        {horasHombre > 0 ? (
          <p className="mt-4 rounded-[var(--radius-md)] bg-[color:var(--surface-soft)] px-3 py-2 text-xs text-[color:var(--text-ink-muted)]">
            Horas-hombre totales: <span className="font-semibold text-[color:var(--text-ink)]">{horasHombre}</span>
            {" · "}Jornales (auto):{" "}
            <span className="font-semibold text-[color:var(--text-ink)]">{jornalesAuto}</span>
          </p>
        ) : null}
      </div>

      <PersonalTransitorios value={transitorios} onChange={setTransitorios} />
    </>
  );
}
