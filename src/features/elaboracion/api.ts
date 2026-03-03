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
  recepcionId?: string;
  analisisId?: string;
  operacionId?: string;
  despachoId?: string;
};

export type ElaboracionResourceKey =
  | "cius"
  | "ciu-recepciones"
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

type CiuRecepcionKey = {
  ciuId: string;
  recepcionBodegaId: string;
};

function buildCiuRecepcionPath(resource: ElaboracionResourceKey, key: CiuRecepcionKey) {
  return `/elaboracion/${resource}/${encodeURIComponent(key.ciuId)}/${encodeURIComponent(key.recepcionBodegaId)}`;
}

export async function patchCiuRecepcion(
  key: CiuRecepcionKey,
  payload: Record<string, unknown>,
) {
  const response = await apiClient.patch<ElaboracionEntity>(
    buildCiuRecepcionPath("ciu-recepciones", key),
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

export async function deleteCiuRecepcion(key: CiuRecepcionKey) {
  await apiClient.delete(buildCiuRecepcionPath("ciu-recepciones", key));
}

export async function fetchTrazabilidadInversaPorQr(codigoQr: string) {
  const response = await apiClient.get<TrazabilidadQrResponse>(
    `/trazabilidades/codigo-envase/${encodeURIComponent(codigoQr)}/inversa`,
  );
  return response.data;
}
