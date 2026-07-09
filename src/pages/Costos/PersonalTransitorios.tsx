import { useState } from "react";
import { AppButton, AppInput, AppSelect } from "../../components/ui";
import type { PersonalAsignadoInput } from "../../features/costos/api";
import type { Personal } from "../../features/personal/api";

// Operario transitorio: se carga al vuelo, sin registrarlo en Bodega → Personal.
export type TransitorioDraft = {
  nombre: string;
  tipo: "interno" | "externo";
  modalidad: "por_hora" | "mensual" | "al_tanto";
  horas: string;
  costo_hora: string;
  sueldo_mensual: string;
  dias_mes: string;
  monto: string;
};

const EMPTY: TransitorioDraft = {
  nombre: "",
  tipo: "externo",
  modalidad: "por_hora",
  horas: "",
  costo_hora: "",
  sueldo_mensual: "",
  dias_mes: "25",
  monto: "",
};

const numOr = (v: string): number | null => {
  if (!v.trim()) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/** Convierte un borrador de transitorio al payload de personal_asignado. */
export function transitorioToPayload(t: TransitorioDraft): PersonalAsignadoInput {
  const base: PersonalAsignadoInput = {
    personal_id: null,
    nombre: t.nombre.trim(),
    tipo: t.tipo,
    transitorio: true,
    modalidad: t.modalidad,
  };
  if (t.modalidad === "al_tanto") return { ...base, monto: numOr(t.monto) };
  if (t.modalidad === "mensual")
    return { ...base, sueldo_mensual: numOr(t.sueldo_mensual), dias_mes: numOr(t.dias_mes) ?? 25, horas: numOr(t.horas) };
  return { ...base, costo_hora: numOr(t.costo_hora), horas: numOr(t.horas) };
}

/**
 * Arma el payload `personal_asignado`: legajos registrados (con su tipo) +
 * operarios transitorios. Único punto de verdad para ambos formularios.
 */
export function buildPersonalAsignado(
  personal: Record<string, string>,
  personalList: Personal[],
  transitorios: TransitorioDraft[],
): PersonalAsignadoInput[] {
  const registrados: PersonalAsignadoInput[] = Object.entries(personal).map(([id, horas]) => {
    const p = personalList.find((x) => x.personal_bodega_id === id);
    return {
      personal_id: id,
      nombre: p?.nombre ?? "",
      tipo: p?.tipo ?? "interno",
      horas: horas.trim() ? Number(horas) : null,
    };
  });
  return [...registrados, ...transitorios.map(transitorioToPayload)];
}

/** Reconstruye un borrador editable desde una entrada guardada (para el panel). */
export function payloadToTransitorio(p: PersonalAsignadoInput): TransitorioDraft {
  const s = (n: number | null | undefined) => (n === null || n === undefined ? "" : String(n));
  return {
    nombre: p.nombre ?? "",
    tipo: p.tipo === "interno" ? "interno" : "externo",
    modalidad: p.modalidad === "mensual" ? "mensual" : p.modalidad === "al_tanto" ? "al_tanto" : "por_hora",
    horas: s(p.horas),
    costo_hora: s(p.costo_hora),
    sueldo_mensual: s(p.sueldo_mensual),
    dias_mes: p.dias_mes ? String(p.dias_mes) : "25",
    monto: s(p.monto),
  };
}

/** Texto resumido del costo de un transitorio para la lista. */
function resumenCosto(t: TransitorioDraft): string {
  if (t.modalidad === "al_tanto") return `al tanto · $${t.monto || "—"}`;
  if (t.modalidad === "mensual")
    return `mensual $${t.sueldo_mensual || "—"} (${t.dias_mes || 25} días)${t.horas ? ` · ${t.horas} h` : ""}`;
  return `$${t.costo_hora || "—"}/h${t.horas ? ` · ${t.horas} h` : ""}`;
}

const TIPO_LABEL: Record<TransitorioDraft["tipo"], string> = { interno: "Propio", externo: "Contratado" };

type Props = {
  value: TransitorioDraft[];
  onChange: (next: TransitorioDraft[]) => void;
};

/**
 * Editor de operarios transitorios (propio/contratado) con precio por hora,
 * mensual o al tanto. Compartido por el form de registro y el panel de costos.
 */
export default function PersonalTransitorios({ value, onChange }: Props) {
  const [draft, setDraft] = useState<TransitorioDraft>(EMPTY);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof TransitorioDraft>(k: K, v: TransitorioDraft[K]) =>
    setDraft((prev) => ({ ...prev, [k]: v }));

  const add = () => {
    if (!draft.nombre.trim()) return setError("Indicá el nombre del operario.");
    if (draft.modalidad === "al_tanto" && !(Number(draft.monto) > 0)) return setError("Indicá el monto al tanto.");
    if (draft.modalidad === "por_hora" && !(Number(draft.costo_hora) > 0)) return setError("Indicá el costo por hora.");
    if (draft.modalidad === "mensual" && !(Number(draft.sueldo_mensual) > 0)) return setError("Indicá el sueldo mensual.");
    onChange([...value, draft]);
    setDraft(EMPTY);
    setError(null);
  };

  return (
    <div className="mt-4 rounded-[var(--radius-md)] border border-dashed border-[color:var(--border-shell)] p-3">
      <p className="mb-2 text-sm font-medium text-[color:var(--field-label)]">
        Operarios transitorios <span className="font-normal text-[color:var(--text-ink-muted)]">(sin cargarlos en Personal)</span>
      </p>

      {value.length > 0 ? (
        <ul className="mb-3 space-y-2">
          {value.map((t, idx) => (
            <li key={idx} className="flex items-center justify-between rounded-[var(--radius-md)] border border-[color:var(--border-shell)] px-3 py-2 text-sm">
              <span>
                <strong>{t.nombre}</strong>
                <span className="text-[color:var(--text-ink-muted)]"> · {TIPO_LABEL[t.tipo]} · {resumenCosto(t)}</span>
              </span>
              <button
                type="button"
                className="text-xs text-[color:var(--text-ink-muted)] hover:text-[color:var(--field-error)]"
                onClick={() => onChange(value.filter((_, i) => i !== idx))}
              >
                quitar
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="grid gap-3 md:grid-cols-3">
        <AppInput label="Nombre" value={draft.nombre} onChange={(e) => set("nombre", e.target.value)} placeholder="ej. Cuadrilla López" />
        <AppSelect label="Tipo" value={draft.tipo} onChange={(e) => set("tipo", e.target.value as TransitorioDraft["tipo"])}>
          <option value="externo">Contratado</option>
          <option value="interno">Propio</option>
        </AppSelect>
        <AppSelect label="Modalidad" value={draft.modalidad} onChange={(e) => set("modalidad", e.target.value as TransitorioDraft["modalidad"])}>
          <option value="por_hora">Por hora</option>
          <option value="mensual">Mensual</option>
          <option value="al_tanto">Al tanto</option>
        </AppSelect>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-3">
        {draft.modalidad === "por_hora" ? (
          <>
            <AppInput label="Costo por hora" type="number" value={draft.costo_hora} onChange={(e) => set("costo_hora", e.target.value)} />
            <AppInput label="Horas trabajadas" type="number" value={draft.horas} onChange={(e) => set("horas", e.target.value)} />
          </>
        ) : draft.modalidad === "mensual" ? (
          <>
            <AppInput label="Sueldo mensual" type="number" value={draft.sueldo_mensual} onChange={(e) => set("sueldo_mensual", e.target.value)} />
            <AppInput label="Días/mes" type="number" value={draft.dias_mes} onChange={(e) => set("dias_mes", e.target.value)} />
            <AppInput label="Horas trabajadas" type="number" value={draft.horas} onChange={(e) => set("horas", e.target.value)} />
          </>
        ) : (
          <AppInput label="Monto (al tanto)" type="number" value={draft.monto} onChange={(e) => set("monto", e.target.value)} />
        )}
      </div>

      {error ? <p className="mt-2 text-xs text-[color:var(--field-error)]">{error}</p> : null}
      <div className="mt-3">
        <AppButton variant="secondary" size="sm" onClick={add}>Agregar transitorio</AppButton>
      </div>
    </div>
  );
}
