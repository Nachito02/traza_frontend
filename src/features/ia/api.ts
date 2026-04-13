import { apiClient } from "../../lib/api";

export type IaConsultaResponse = {
  pregunta: string;
  resumen: string;
  resultados?: {
    fincas?: Array<{ nombre_finca?: string }>;
    cuarteles?: Array<{ codigo_cuartel?: string; finca?: { nombre_finca?: string } }>;
    campanias?: Array<{ nombre?: string }>;
    trazabilidades?: Array<{ nombre_producto?: string; estado?: string }>;
    hallazgos?: Array<{ titulo?: string; mensaje?: string; severidad?: string }>;
  };
};

export async function consultarIa(payload: {
  pregunta: string;
  bodegaId?: string | null;
  trazabilidadId?: string | null;
  limit?: number;
}) {
  const response = await apiClient.post<IaConsultaResponse>("/ia/consultas", payload);
  return response.data;
}
