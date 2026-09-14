/**
 * Política de insumos por proceso: decide si la sección de insumos del wizard de carga
 * de actividades va obligatoria, sugerida (desplegada pero sin bloquear) u opcional (plegada).
 *
 * Por qué no sale del catálogo:
 * - `ProtocoloProceso` no tiene ningún campo que marque "acá se usan insumos".
 * - `ActividadSugerencia.aplica_insumos` existe, pero se busca por nombre normalizado y las
 *   claves seedeadas (`fertilizar`) no coinciden con los nombres del protocolo
 *   ("FERTILIZACIÓN (APLICACIÓN)" -> `fertilizacion_(aplicacion)`), así que nunca matchea.
 *   Sirve como pista cosmética de insumos sugeridos, nunca como gate.
 *
 * TODO: reemplazar por un campo `protocolo_proceso.insumos_modo` en backend. Mientras tanto la
 * heurística por nombre vive acá y solo acá.
 */

export type InsumosModo = "requerido" | "sugerido" | "opcional";

/** Misma normalización que `normalizeClaveActividad` del backend, sin el paso a snake_case. */
export function normalizarNombre(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Procesos donde el insumo *es* la actividad: no tiene sentido registrarlas sin producto,
 * y además hay exigencia regulatoria de dejar asentado qué se aplicó.
 */
export const EVENTO_TIPOS_REQUERIDO = [
  "fertilizacion",
  "aplicacion_fitosanitaria",
  "enmienda",
] as const;

/**
 * Herbicida, siembra, plantación, poda, atadura e injertos no tienen `evento_tipo` propio:
 * cuelgan de `labor_suelo` / `canopia` con el nombre libre que cargó la bodega. Por eso el
 * segundo nivel mira el nombre.
 */
const NOMBRE_REQUERIDO = [
  "herbicida",
  "matayuyo",
  "desmalezad",
  "fertiliz",
  "enmienda",
  "materia organica",
  "fitosanit",
  "agroquimic",
  "fungicida",
  "insecticida",
  "plaguicida",
];
const NOMBRE_SUGERIDO = ["verdeo", "siembra", "plantacion", "replante"];
/**
 * Veto explícito: se evalúa ANTES que `NOMBRE_REQUERIDO` a propósito. Una labor como
 * "limpieza de equipos de fertilización" menciona el producto pero no lo aplica, y bloquearla
 * empuja al operario a inventar un insumo para poder guardar. Ante la duda, no bloquear.
 */
const NOMBRE_OPCIONAL = [
  "poda",
  "atadura",
  "atado",
  "injerto",
  "mantenimiento",
  "limpieza",
  "lavado",
  "cobertura",
  "inventario",
  "monitoreo",
  "analisis",
];

export type ResolveInsumosModoInput = {
  eventoTipo?: string | null;
  nombre?: string | null;
};

/**
 * Resuelve el modo en tres niveles: `evento_tipo` manda; si no alcanza, palabras clave del
 * nombre; si nada aplica, opcional. El nivel de nombre nunca contradice al de evento_tipo.
 */
export function resolveInsumosModo({ eventoTipo, nombre }: ResolveInsumosModoInput): InsumosModo {
  const tipo = normalizarNombre(eventoTipo ?? "");
  if ((EVENTO_TIPOS_REQUERIDO as readonly string[]).includes(tipo)) return "requerido";

  const texto = normalizarNombre(nombre ?? "");
  if (!texto) return "opcional";

  // El veto va primero: preferimos no bloquear de más (ver comentario de NOMBRE_OPCIONAL).
  if (NOMBRE_OPCIONAL.some((k) => texto.includes(k))) return "opcional";
  if (NOMBRE_REQUERIDO.some((k) => texto.includes(k))) return "requerido";
  if (NOMBRE_SUGERIDO.some((k) => texto.includes(k))) return "sugerido";

  return "opcional";
}

/** Copy del encabezado de la sección según el modo. */
export function tituloSeccionInsumos(modo: InsumosModo): string {
  if (modo === "requerido") return "Insumos *";
  if (modo === "sugerido") return "Insumos";
  return "Agregar insumos (opcional)";
}
