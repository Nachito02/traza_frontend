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

export const EMPTY: TransitorioDraft = {
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
