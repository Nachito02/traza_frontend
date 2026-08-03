import { apiClient } from "../../lib/api";

export type ElaboracionEntity = Record<string, unknown> & {
  id?: string;
  ciuId?: string;
  recepcionBodegaId?: string;
  vasijaId?: string;
  corteId?: string;
  productoId?: string;
  loteFraccionamientoId?: string;
  codigoEnvaseId?: string;
  remitoId?: string;
  remito_uva_id?: string;
  recepcionId?: string;
  recepcion_bodega_id?: string;
  analisisId?: string;
  analisis_recepcion_id?: string;
  operacionId?: string;
  despachoId?: string;
};

export type ElaboracionResourceKey =
  | "cius"
  | "qc-ingreso-uva"
  | "existencias-vasija"
  | "controles-fermentacion"
  | "vasijas"
  | "cortes"
  | "productos"
  | "lotes-fraccionamiento"
  | "codigos-envase"
  | "remitos-uva"
  | "recepciones-bodega"
  | "analisis-recepcion"
  | "operaciones-vasija"
  | "despachos";

export type TrazabilidadQrResponse = {
  codigoEnvase?: Record<string, unknown>;
  loteFraccionamiento?: Record<string, unknown>;
  producto?: Record<string, unknown>;
  corte?: Record<string, unknown>;
  origenes?: Array<Record<string, unknown>>;
} & Record<string, unknown>;

export type LoteCosechaOption = {
  lote_cosecha_id: string;
  fecha_cosecha: string;
  cantidad: string | number;
  unidad: string;
  destino?: string | null;
  cuartel_id: string;
  campania_id: string;
  cuartel?: {
    cuartel_id: string;
    codigo_cuartel: string;
    finca_id: string;
    finca?: {
      finca_id: string;
      nombre_finca: string;
      bodega_id: string;
    };
  };
};

function normalizeListResponse(data: unknown) {
  if (Array.isArray(data)) {
    return data as ElaboracionEntity[];
  }
  if (data && typeof data === "object") {
    const value = data as {
      items?: unknown;
      data?: unknown;
      rows?: unknown;
      results?: unknown;
    };
    if (Array.isArray(value.items)) return value.items as ElaboracionEntity[];
    if (Array.isArray(value.data)) return value.data as ElaboracionEntity[];
    if (Array.isArray(value.rows)) return value.rows as ElaboracionEntity[];
    if (Array.isArray(value.results)) return value.results as ElaboracionEntity[];
  }
  return [];
}

function toQueryString(params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    query.set(key, String(value));
  });
  const result = query.toString();
  return result ? `?${result}` : "";
}

export async function listElaboracionResource(
  resource: ElaboracionResourceKey,
  params: Record<string, string | number | undefined>,
) {
  const response = await apiClient.get<unknown>(
    `/elaboracion/${resource}${toQueryString(params)}`,
  );
  return normalizeListResponse(response.data);
}

export async function listLotesCosecha(
  params: Record<string, string | number | undefined>,
) {
  const response = await apiClient.get<LoteCosechaOption[]>(
    `/elaboracion/lotes-cosecha${toQueryString(params)}`,
  );
  return response.data ?? [];
}

export async function getElaboracionResource(
  resource: ElaboracionResourceKey,
  id: string,
) {
  const response = await apiClient.get<ElaboracionEntity>(
    `/elaboracion/${resource}/${encodeURIComponent(id)}`,
  );
  return response.data;
}

export async function createElaboracionResource(
  resource: ElaboracionResourceKey,
  payload: Record<string, unknown>,
) {
  const response = await apiClient.post<ElaboracionEntity>(
    `/elaboracion/${resource}`,
    payload,
  );
  return response.data;
}

export async function patchElaboracionResource(
  resource: ElaboracionResourceKey,
  id: string,
  payload: Record<string, unknown>,
) {
  const response = await apiClient.patch<ElaboracionEntity>(
    `/elaboracion/${resource}/${encodeURIComponent(id)}`,
    payload,
  );
  return response.data;
}

export async function deleteElaboracionResource(
  resource: ElaboracionResourceKey,
  id: string,
) {
  await apiClient.delete(`/elaboracion/${resource}/${encodeURIComponent(id)}`);
}

type LoteImpacto = { codigo: string; esUnicoOrigen: boolean; volumenVasijaL: number; bloqueado: boolean };

export type ImpactoBorradoRecepcion = {
  tieneAnalisis: boolean;
  ciu: { codigo_ciu: string } | null;
  lote: LoteImpacto | null;
};

export type ImpactoBorradoRemito = {
  recepciones: number;
  tieneAnalisis: boolean;
  cius: string[];
  lotes: LoteImpacto[];
};

export async function fetchImpactoBorradoRecepcion(recepcionBodegaId: string) {
  const response = await apiClient.get<ImpactoBorradoRecepcion>(
    `/elaboracion/recepciones-bodega/${encodeURIComponent(recepcionBodegaId)}/impacto-borrado`,
  );
  return response.data;
}

export async function fetchImpactoBorradoRemito(remitoUvaId: string) {
  const response = await apiClient.get<ImpactoBorradoRemito>(
    `/elaboracion/remitos-uva/${encodeURIComponent(remitoUvaId)}/impacto-borrado`,
  );
  return response.data;
}

export type ImpactoBorradoOperacionVasija = {
  tipo: string;
  vasijaContenidoVinculado: Array<{ volumen_l: number; activo: boolean }>;
  reversible: boolean;
  motivoNoReversible: string | null;
};

export async function fetchImpactoBorradoOperacionVasija(operacionVasijaId: string) {
  const response = await apiClient.get<ImpactoBorradoOperacionVasija>(
    `/elaboracion/operaciones-vasija/${encodeURIComponent(operacionVasijaId)}/impacto-borrado`,
  );
  return response.data;
}

export type ComposicionActualVasija = {
  vasija_id: string;
  codigo: string;
  capacidad_litros: number | string | null;
  volumen_disponible_l: number;
  composicion: Array<{
    vasija_contenido_id: string;
    lote_id: string;
    lote_codigo: string;
    lote_origen: string;
    lote_variedad: string | null;
    volumen_l: number;
    porcentaje: number;
    desde: string;
  }>;
};

export async function fetchComposicionActualVasija(vasijaId: string) {
  const response = await apiClient.get<ComposicionActualVasija>(
    `/elaboracion/vasijas/${encodeURIComponent(vasijaId)}/composicion-actual`,
  );
  return response.data;
}

export async function fetchTrazabilidadInversaPorQr(codigoQr: string) {
  const response = await apiClient.get<TrazabilidadQrResponse>(
    `/trazabilidades/codigo-envase/${encodeURIComponent(codigoQr)}/inversa`,
  );
  return response.data;
}
