import { normalizarTexto } from "../../lib/texto";
import type { InsumoCatalogo } from "../costos/api";
import type { Existencia } from "../inventario/api";

/**
 * Estado de stock de un insumo para mostrar junto a su nombre.
 *
 * `sin_datos` y `agotado` son distintos a propósito: un insumo **sin movimientos de stock no
 * aparece** en el mapa de existencias, y eso no es lo mismo que tener 0. Decirle "sin stock" a
 * un producto que simplemente nunca se inventarió sería mentirle al operario y mandarlo a
 * buscar al depósito algo que sí está.
 */
export type EstadoStock =
  | { clase: "disponible"; texto: string }
  | { clase: "agotado"; texto: string }
  | { clase: "sin_datos"; texto: string };

export function estadoStock(
  insumoId: string,
  existencias: Record<string, Existencia>,
): EstadoStock {
  const ex = existencias[insumoId];
  if (!ex) return { clase: "sin_datos", texto: "sin stock registrado" };
  if (ex.stock > 0) return { clase: "disponible", texto: `disp. ${ex.stock} ${ex.unidad_base}` };
  return { clase: "agotado", texto: "sin stock" };
}

/**
 * Texto contra el que se busca. Incluye campos que no se muestran en una sola línea:
 *
 * - **principio activo**: dos marcas distintas pueden ser el mismo producto, y el operario
 *   muchas veces lo conoce por el principio, no por la marca.
 * - **familia**: la sub-categoría (Nitrogenado, Neonicotinoide…), útil para barrer por grupo.
 */
export function textoBuscableInsumo(insumo: InsumoCatalogo): string {
  return normalizarTexto(
    [insumo.nombre_comercial, insumo.tipo, insumo.principio_activo, insumo.familia]
      .filter(Boolean)
      .join(" "),
  );
}

/** Etiqueta de una línea para el campo cerrado. Corta a propósito: el campo es angosto. */
export function etiquetaInsumo(insumo: InsumoCatalogo): string {
  return `${insumo.nombre_comercial} (${insumo.tipo})`;
}
