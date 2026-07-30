import { apiClient } from "../../lib/api";

export type Finca = {
  finca_id?: string;
  id?: string;
  nombre_finca?: string;
  ubicacion?: string | null;
  ubicacion_texto?: string | null;
  rut?: string | null;
  renspa?: string | null;
  catastro?: string | null;
  nro_inscripto_inv?: string | null;
  cuit?: string | null;
  razon_social?: string | null;
  created_at?: string;
  vinculo?: {
    bodega_id?: string;
    finca_id?: string;
    tipo_vinculo?: "propia" | "proveedor_tercero" | string;
    activo?: boolean;
  };
  vinculos?: Array<{
    bodega_id?: string;
    finca_id?: string;
    tipo_vinculo?: "propia" | "proveedor_tercero" | string;
    activo?: boolean;
  }>;
};

export async function fetchFincas(bodegaId: string | number) {
  const response = await apiClient.get<Finca[]>(
    `/fincas?bodegaId=${encodeURIComponent(String(bodegaId))}`,
  );
  return response.data ?? [];
}

export type CreateFincaPayload = {
  bodegaId: string | number;
  nombre_finca: string;
  rut?: string | null;
  renspa?: string | null;
  catastro?: string | null;
  ubicacion_texto?: string | null;
  nro_inscripto_inv?: string | null;
  cuit?: string | null;
  razon_social?: string | null;
};

export type UpdateFincaPayload = {
  nombre_finca: string;
  rut?: string | null;
  renspa?: string | null;
  catastro?: string | null;
  ubicacion_texto?: string | null;
  nro_inscripto_inv?: string | null;
  cuit?: string | null;
  razon_social?: string | null;
};

export async function createFinca(payload: CreateFincaPayload) {
  const response = await apiClient.post<Finca>("/fincas", payload);
  return response.data;
}

export async function fetchFincaById(fincaId: string | number) {
  const encodedId = encodeURIComponent(String(fincaId));
  const response = await apiClient.get<Finca>(`/fincas/${encodedId}`);
  return response.data;
}

export async function patchFinca(
  fincaId: string | number,
  payload: UpdateFincaPayload,
) {
  const response = await apiClient.patch<Finca>(
    `/fincas/${encodeURIComponent(String(fincaId))}`,
    payload,
  );
  return response.data;
}

export async function deleteFinca(fincaId: string | number) {
  await apiClient.delete(`/fincas/${encodeURIComponent(String(fincaId))}`);
}
