/**
 * Normaliza texto para comparar y buscar: minúsculas, sin acentos, sin espacios sobrantes.
 *
 * Sin el quitado de acentos, buscar "organico" no encuentra "Orgánico" ni "fosforo" encuentra
 * "Fósforo" — que es justo lo que pasa con un catálogo en castellano.
 *
 * Mismo criterio que `normalizeClaveActividad` del backend (costos.service.ts), sin el paso
 * final a snake_case.
 */
export function normalizarTexto(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * `true` si el texto contiene **todos** los términos de la búsqueda, en cualquier orden.
 *
 * Partir por palabras permite "glifo 48" → "Glifosato 48 SL", que es como la gente busca de
 * verdad: recuerda dos pedazos sueltos del nombre, no la cadena exacta.
 *
 * `texto` se espera ya normalizado (viene precomputado); `query` se normaliza acá.
 */
export function coincideBusqueda(textoNormalizado: string, query: string): boolean {
  const terminos = normalizarTexto(query).split(" ").filter(Boolean);
  if (terminos.length === 0) return true;
  return terminos.every((t) => textoNormalizado.includes(t));
}
