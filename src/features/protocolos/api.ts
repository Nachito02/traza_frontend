import { apiClient } from "../../lib/api";

export type Protocolo = {
  protocolo_id?: string;
  id?: string;
  nombre?: string;
  version?: string;
  codigo?: string;
  descripcion?: string | null;
  activo?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type ProtocoloEtapa = {
  etapa_id?: string;
  id?: string;
  protocolo_id?: string;
  nombre?: string;
  orden?: number;
  created_at?: string;
  updated_at?: string;
};

export type ProtocoloProceso = {
  proceso_id?: string;
  id?: string;
  etapa_id?: string;
  nombre?: string;
  orden?: number;
  evento_tipo?: string;
  obligatorio?: boolean;
  campos_obligatorios?: string[];
  required_fields?: string[];
  camposObligatorios?: string[];
  requiredFields?: string[];
  plantilla?: {
    version?: number;
    campos?: Array<{
      campo: string;
      type: string;
      required?: boolean;
      unit?: string;
      enum?: string[];
    }>;
  };
  created_at?: string;
  updated_at?: string;
};

export type PlantillaCampo = {
  campo: string;
  type?: string;
  unit?: string;
};

export type ProtocoloPlantillaIteracion = {
  iteracion: number;
  etapa?: {
    etapa_id?: string;
    nombre?: string;
    orden?: number;
  };
  proceso?: {
    proceso_id?: string;
    nombre?: string;
    orden?: number;
    evento_tipo?: string;
    obligatorio?: boolean;
  };
  plantilla?: {
    schema_disponible?: boolean;
    campos_obligatorios?: PlantillaCampo[];
    campos_opcionales?: PlantillaCampo[];
  };
};

export async function fetchProtocolos() {
  const response = await apiClient.get<Protocolo[]>("/protocolos");
  return response.data;
}

export async function fetchProtocoloById(id: string) {
  const response = await apiClient.get<ProtocoloExpanded>(`/protocolos/${encodeURIComponent(id)}`);
  return response.data;
}

export type ProtocoloPlantillaResponse = {
  protocolo?: Protocolo;
  iteraciones?: ProtocoloPlantillaIteracion[];
};

export async function fetchProtocoloPlantilla(protocoloId: string) {
  const response = await apiClient.get<ProtocoloPlantillaResponse>(
    `/protocolos/${encodeURIComponent(protocoloId)}/plantilla`,
  );
  return response.data;
}

export type CreateProtocoloPayload = {
  nombre: string;
  version: string;
  descripcion?: string;
};

export type UpdateProtocoloPayload = {
  nombre?: string;
  version?: string;
  descripcion?: string | null;
};

export type DeleteResponse = {
  deleted: boolean;
};

export async function createProtocolo(payload: CreateProtocoloPayload) {
  const response = await apiClient.post<Protocolo>("/protocolos", payload);
  return response.data;
}

export async function updateProtocolo(id: string, payload: UpdateProtocoloPayload) {
  const response = await apiClient.put<Protocolo>(`/protocolos/${encodeURIComponent(id)}`, payload);
  return response.data;
}

export const patchProtocolo = updateProtocolo;

export async function deleteProtocolo(id: string) {
  const response = await apiClient.delete<DeleteResponse>(`/protocolos/${encodeURIComponent(id)}`);
  return response.data;
}

export type ProtocoloExpanded = Protocolo & {
  protocolo_etapa?: Array<
    ProtocoloEtapa & {
      protocolo_proceso?: ProtocoloProceso[];
    }
  >;
  plantilla?: {
    iteraciones?: ProtocoloPlantillaIteracion[];
  };
};

export async function fetchProtocolosExpanded() {
  const response = await apiClient.get<ProtocoloExpanded[]>("/protocolos/expanded");
  return response.data;
}

export type CreateEtapaPayload = {
  nombre: string;
  orden: number;
};

export type UpdateEtapaPayload = {
  nombre?: string;
  orden?: number;
};

export type CreateProcesoPayload = {
  nombre: string;
  orden: number;
  evento_tipo: string;
  campos_obligatorios?: string[];
  plantilla?: {
    version?: number;
    campos?: Array<{
      campo: string;
      type: string;
      required?: boolean;
      unit?: string;
      enum?: string[];
    }>;
  };
};

export type UpdateProcesoPayload = {
  nombre?: string;
  orden?: number;
  evento_tipo?: string;
  campos_obligatorios?: string[];
  plantilla?: {
    version?: number;
    campos?: Array<{
      campo: string;
      type: string;
      required?: boolean;
      unit?: string;
      enum?: string[];
    }>;
  };
};

export async function createEtapa(protocoloId: string, payload: CreateEtapaPayload) {
  const response = await apiClient.post<ProtocoloEtapa>(
    `/protocolos/${encodeURIComponent(protocoloId)}/etapas`,
    payload,
  );
  return response.data;
}

export async function updateEtapa(etapaId: string, payload: UpdateEtapaPayload) {
  const response = await apiClient.put<ProtocoloEtapa>(
    `/protocolos/etapas/${encodeURIComponent(etapaId)}`,
    payload,
  );
  return response.data;
}

export async function deleteEtapa(etapaId: string) {
  const response = await apiClient.delete<DeleteResponse>(
    `/protocolos/etapas/${encodeURIComponent(etapaId)}`,
  );
  return response.data;
}

export async function createProceso(etapaId: string, payload: CreateProcesoPayload) {
  const response = await apiClient.post<ProtocoloProceso>(
    `/protocolos/etapas/${encodeURIComponent(etapaId)}/procesos`,
    {
      ...payload,
      required_fields: payload.campos_obligatorios,
      camposObligatorios: payload.campos_obligatorios,
      requiredFields: payload.campos_obligatorios,
    },
  );
  return response.data;
}

export async function updateProceso(procesoId: string, payload: UpdateProcesoPayload) {
  const response = await apiClient.put<ProtocoloProceso>(
    `/protocolos/procesos/${encodeURIComponent(procesoId)}`,
    {
      ...payload,
      required_fields: payload.campos_obligatorios,
      camposObligatorios: payload.campos_obligatorios,
      requiredFields: payload.campos_obligatorios,
    },
  );
  return response.data;
}

export async function deleteProceso(procesoId: string) {
  const response = await apiClient.delete<DeleteResponse>(
    `/protocolos/procesos/${encodeURIComponent(procesoId)}`,
  );
  return response.data;
}

export function getDefaultProtocoloId(protocolos: Protocolo[]) {
  const byName = protocolos.find((item) => {
    const nombre = `${item.nombre ?? ""} ${item.version ?? ""} ${item.codigo ?? ""}`.toLowerCase();
    return nombre.includes("vitivinic");
  });

  const byKnownCatalog = protocolos.find((item) =>
    String(item.protocolo_id ?? item.id ?? "") === "b6e7538b-58bf-47bf-afdb-5aec31e1fdfd",
  );

  const defaultProtocol = byKnownCatalog ?? byName ?? protocolos[0];
  return defaultProtocol
    ? String(defaultProtocol.protocolo_id ?? defaultProtocol.id ?? "")
    : "";
}
