/**
 * Public API — no auth token required.
 * These calls use the raw fetch API (not the authenticated apiClient).
 */
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

export type PublicRemitoUva = {
  remito_uva_id: string;
  salida_finca: string;
  llegada_bodega: string | null;
  kg_declarados: number | null;
  transportista: string | null;
  recepciones: {
    recepcion_bodega_id: string;
    fecha_hora: string;
    kg_pesados: number | null;
    clasificacion: string | null;
  }[];
};

export type PublicCiu = {
  ciu_id: string;
  codigo_ciu: string;
  estado: string;
  emitido_at: string;
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
