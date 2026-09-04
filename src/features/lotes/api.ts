import { apiClient } from "../../lib/api";

export type RecepcionPendienteLote = {
  recepcion_bodega_id: string;
  fecha_hora: string;
  kg_pesados: number | string | null;
  ciu: { ciu_id: string; codigo_ciu: string; estado: string } | null;
  remito_uva: {
    cuartel_id: string;
    cuartel: { cuartel_id: string; codigo_cuartel: string; variedad: string | null } | null;
    finca: { finca_id: string; nombre_finca: string } | null;
  };
  lote_origen_recepcion: { lote_id: string; lote: { lote_id: string; codigo: string } } | null;
};

export type Lote = {
  lote_id: string;
  bodega_id: string;
  codigo: string;
  secuencia: number;
  origen: "ingreso" | "corte";
  campania_id: string | null;
  cuartel_id: string | null;
  variedad: string | null;
  observaciones: string | null;
  created_at: string;
  cuartel: { cuartel_id: string; codigo_cuartel: string; finca: { nombre_finca: string } } | null;
  campania: { campania_id: string; nombre: string; fecha_inicio: string } | null;
  lote_origen_recepcion: Array<{
    recepcion_bodega_id: string;
    recepcion_bodega: {
      ciu: { codigo_ciu: string } | null;
    };
  }>;
  composicion_hijo: Array<{
    lote_padre_id: string;
    porcentaje: number | string | null;
    volumen_l: number | string | null;
    lote_padre: { lote_id: string; codigo: string; origen: "ingreso" | "corte" };
  }>;
  _count: { vasija_contenido: number; composicion_padre: number };
};

export type CorteBlendResult = {
  corte_id: string;
  fecha: string;
  objetivo: string | null;
  corte_componente: Array<{ vasija_id: string | null; volumen_l: number | string | null }>;
  lote_creado: Lote[];
};

/** Todos los ingresos de la bodega, más recientes primero, para armar un lote nuevo. */
export async function fetchRecepcionesParaLote(params: { bodegaId: string }) {
  const response = await apiClient.get<RecepcionPendienteLote[]>("/elaboracion/recepciones-bodega/para-lote", {
    params,
  });
  return response.data;
}

export async function crearLote(payload: {
  bodegaId: string;
  campaniaId: string;
  recepcionBodegaIds: string[];
  observaciones?: string;
}) {
  const response = await apiClient.post<Lote>("/elaboracion/lotes", payload);
  return response.data;
}

export async function crearCorteConVasijas(payload: {
  bodegaId: string;
  fecha: string;
  objetivo?: string;
  campaniaId?: string;
  responsableUserId?: string;
  observaciones?: string;
  fuentes: Array<{ vasijaId: string; volumenL: number }>;
  destinos: Array<{ vasijaId: string; volumenL: number }>;
}) {
  const response = await apiClient.post<CorteBlendResult>("/elaboracion/lotes/blend", payload);
  return response.data;
}

export async function fetchLotes(bodegaId: string) {
  const response = await apiClient.get<Lote[]>("/elaboracion/lotes", { params: { bodegaId } });
  return response.data;
}

export async function fetchLote(loteId: string) {
  const response = await apiClient.get<Lote>(`/elaboracion/lotes/${encodeURIComponent(loteId)}`);
  return response.data;
}

export async function updateLote(
  loteId: string,
  payload: { codigo?: string; variedad?: string; observaciones?: string },
) {
  const response = await apiClient.patch<Lote>(`/elaboracion/lotes/${encodeURIComponent(loteId)}`, payload);
  return response.data;
}

export async function deleteLote(loteId: string) {
  await apiClient.delete(`/elaboracion/lotes/${encodeURIComponent(loteId)}`);
}

export type ImpactoBorradoLote = {
  recepcionesOrigen: number;
  vasijaContenido: Array<{ vasija_id: string; vasija_codigo: string; volumen_l: number; activo: boolean }>;
  usadoComoComponenteDe: Array<{ lote_id: string; codigo: string }>;
};

export async function fetchImpactoBorradoLote(loteId: string) {
  const response = await apiClient.get<ImpactoBorradoLote>(
    `/elaboracion/lotes/${encodeURIComponent(loteId)}/impacto-borrado`,
  );
  return response.data;
}

export type LoteGenealogiaNode = {
  lote_id: string;
  codigo: string;
  origen: "ingreso" | "corte";
  porcentaje_en_padre: number | null;
  cuartel: { cuartel_id: string; codigo_cuartel: string; finca: { finca_id: string; nombre_finca: string } } | null;
  cius: Array<{ ciu_id: string; codigo_ciu: string }>;
  hijos: LoteGenealogiaNode[];
};

export type CiuContribucion = {
  ciu_id: string;
  codigo_ciu: string;
  lote_id: string;
  lote_codigo: string;
  porcentaje_efectivo: number;
};

export async function fetchLoteGenealogia(loteId: string) {
  const response = await apiClient.get<{ genealogia: LoteGenealogiaNode; cius: CiuContribucion[] }>(
    `/elaboracion/lotes/${encodeURIComponent(loteId)}/genealogia`,
  );
  return response.data;
}

export type LoteHistorialEvento =
  | {
      kind: "origen_ingreso";
      fecha: string;
      recepciones: Array<{ codigo_ciu: string | null; fecha_hora: string; kg_pesados: number | null }>;
    }
  | {
      kind: "origen_corte";
      fecha: string;
      corte_id: string;
      objetivo: string | null;
      componentes: Array<{ lote_id: string; lote_codigo: string; porcentaje: number }>;
    }
  | {
      kind: "movimiento_vasija";
      fecha: string;
      vasija_codigo: string;
      volumen_l: number;
      cerrado: boolean;
      tipo_operacion: string | null;
      observaciones: string | null;
      responsable: string | null;
    }
  | {
      kind: "usado_en_corte";
      fecha: string;
      corte_id: string;
      lote_resultado_id: string;
      lote_resultado_codigo: string;
      porcentaje: number;
    };

export async function fetchLoteHistorial(loteId: string) {
  const response = await apiClient.get<LoteHistorialEvento[]>(
    `/elaboracion/lotes/${encodeURIComponent(loteId)}/historial`,
  );
  return response.data;
}

/** Descarga el archivo con los CIU del lote (para mandar al INV) directo desde el navegador. */
export async function descargarLoteCiusExport(loteId: string, codigoLote: string) {
  const response = await apiClient.get(`/elaboracion/lotes/${encodeURIComponent(loteId)}/cius-export`, {
    responseType: "blob",
  });
  const url = URL.createObjectURL(response.data as Blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `lote-${codigoLote}-cius.txt`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
