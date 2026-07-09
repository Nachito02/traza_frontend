/** Evita valores negativos en inputs numéricos (los ajusta a "0"). */
export const nonNeg = (v: string): string => (v !== "" && Number(v) < 0 ? "0" : v);
