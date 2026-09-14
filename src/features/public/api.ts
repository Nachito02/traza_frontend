/**
 * Public API — no auth token required.
 * These calls use the raw fetch API (not the authenticated apiClient).
 */
import type { CiuContribucion, LoteGenealogiaNode, LoteHistorialEvento } from "../lotes/api";

const API_BASE = (import.meta.env.VITE_API_URL as string) ?? "";

export type PublicTareaAsignacion = {
  estado: string;
  operario: string | null;
};

export type PublicAdjunto = {
  cid: string;
  url: string;
  nombre: string;
  tipo: string;
  size: number;
};

export type PublicTareaEntrada = {
  entrada_id: string;
  fecha: string;
  descripcion: string | null;
  registrado_por: string | null;
  adjuntos?: PublicAdjunto[];
};

export type PublicTarea = {
  tarea_id: string;
  titulo: string;
  descripcion: string | null;
  estado: string;
  prioridad: string;
  fecha_fin: string | null;
  updated_at: string;
  created_at: string;
  proceso: { nombre: string; tipo_evento: string } | null;
  asignaciones: PublicTareaAsignacion[];
  entradas: PublicTareaEntrada[];
};

export type PublicAnalisisRecepcion =
  | {
      fuente: "Análisis de recepción";
      brix: number | null;
      ph: number | null;
      acidez: number | null;
      temperatura_uva: number | null;
      sanidad: string | null;
      observaciones: string | null;
    }
  | {
      fuente: "Control de calidad";
      brix: number | null;
      ph: number | null;
      acidez: number | null;
      temperatura_uva: number | null;
      estado_pcc: string | null;
      aprobado: boolean | null;
      observaciones: string | null;
    };

export type PublicRemitoUva = {
  remito_uva_id: string;
  salida_finca: string;
  llegada_bodega: string | null;
  kg_declarados: number | null;
  transportista: string | null;
  adjuntos: PublicAdjunto[];
  recepciones: {
    recepcion_bodega_id: string;
    fecha_hora: string;
    kg_pesados: number | null;
    clasificacion: string | null;
    analisis: PublicAnalisisRecepcion[];
  }[];
};

export type PublicCiu = {
  ciu_id: string;
  codigo_ciu: string;
  estado: string;
  emitido_at: string;
  observaciones: string | null;
  variedad_nombre: string | null;
  tenor_azucarino_gl: number | null;
  uva_organica: boolean | null;
};

export type PublicGeoJSONPolygon = {
  type: "Polygon";
  coordinates: [number, number][][];
};

export type PublicTrazabilidadCuartel = {
  cuartel: {
    cuartel_id: string;
    codigo_cuartel: string;
    cultivo: string | null;
    variedad: string | null;
    tipo_variedad: string | null;
    superficie_ha: number | null;
    sistema_riego: string | null;
    sistema_productivo: string | null;
    sistema_conduccion: string | null;
    poligono?: PublicGeoJSONPolygon | null;
    centroide?: { lat: number; lng: number } | null;
    finca: {
      finca_id: string;
      nombre_finca: string;
      ubicacion_texto: string | null;
      renspa: string | null;
    };
  };
  tareas: PublicTarea[];
  remitos_uva: PublicRemitoUva[];
  cius: PublicCiu[];
};

export async function fetchPublicTrazabilidadCuartel(
  cuartelId: string,
): Promise<PublicTrazabilidadCuartel> {
  const response = await fetch(`${API_BASE}/public/trazabilidad/cuartel/${encodeURIComponent(cuartelId)}`);
  if (!response.ok) {
    throw new Error(`Error ${response.status}: ${response.statusText}`);
  }
  return response.json() as Promise<PublicTrazabilidadCuartel>;
}

export type PublicProducto = {
  codigo_envase_id: string;
  codigo_qr: string;
  codigo_lote_impreso: string | null;
  lote_fraccionamiento: {
    lote_fraccionamiento_id: string;
    fecha: string;
    botellas: number | null;
    formato: string | null;
  };
  producto: {
    producto_id: string;
    nombre_comercial: string;
    varietal: string | null;
    anio: number | null;
    tipo: string | null;
  };
  corte: { corte_id: string; fecha: string; objetivo: string | null };
  genealogia: LoteGenealogiaNode[];
  cius: CiuContribucion[];
  /** Línea de campo completa de cada cuartel de origen involucrado en el blend. */
  cuarteles: PublicTrazabilidadCuartel[];
  /** Qué pasó en la bodega con el lote resultado: el corte, a qué vasija fue, etc. */
  historial: LoteHistorialEvento[];
};

export async function fetchPublicProducto(codigoQr: string): Promise<PublicProducto> {
  const response = await fetch(`${API_BASE}/public/producto/${encodeURIComponent(codigoQr)}`);
  if (!response.ok) {
    throw new Error(`Error ${response.status}: ${response.statusText}`);
  }
  return response.json() as Promise<PublicProducto>;
}

export type PublicLote = {
  lote_id: string;
  codigo: string;
  origen: "ingreso" | "corte";
  genealogia: LoteGenealogiaNode;
  cius: CiuContribucion[];
  cuarteles: PublicTrazabilidadCuartel[];
  historial: LoteHistorialEvento[];
  /** Si ya hay un Producto creado con este lote como origen, aunque todavía no se haya fraccionado. */
  producto: {
    producto_id: string;
    nombre_comercial: string;
    varietal: string | null;
    anio: number | null;
    tipo: string | null;
  } | null;
};

/** Vista pública de un lote puntual (todavía no fraccionado en producto, o un lote intermedio del blend). */
export async function fetchPublicLote(loteId: string): Promise<PublicLote> {
  const response = await fetch(`${API_BASE}/public/lote/${encodeURIComponent(loteId)}`);
  if (!response.ok) {
    throw new Error(`Error ${response.status}: ${response.statusText}`);
  }
  return response.json() as Promise<PublicLote>;
}
