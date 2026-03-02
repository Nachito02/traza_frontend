import { apiClient } from "../../lib/api";

export type Protocolo = {
  protocolo_id?: string;
  id?: string;
  nombre?: string;
  codigo?: string;
  descripcion?: string;
};

export async function fetchProtocolos() {
  const response = await apiClient.get<Protocolo[]>("/protocolos");
  return response.data;
}

export type ProtocoloExpanded = Protocolo & {
  protocolo_etapa?: Array<{
    etapa_id?: string;
    nombre?: string;
    orden?: number;
    protocolo_proceso?: Array<{
      proceso_id?: string;
      nombre?: string;
      orden?: number;
      evento_tipo?: string;
      obligatorio?: boolean;
    }>;
  }>;
};

export async function fetchProtocolosExpanded() {
  const response = await apiClient.get<ProtocoloExpanded[]>("/protocolos/expanded");
  return response.data;
}

export function getDefaultProtocoloId(protocolos: Protocolo[]) {
  const byName = protocolos.find((item) => {
    const nombre = `${item.nombre ?? ""} ${item.codigo ?? ""}`.toLowerCase();
    return nombre.includes("vitivinic");
  });

  const defaultProtocol = byName ?? protocolos[0];
  return defaultProtocol
    ? String(defaultProtocol.protocolo_id ?? defaultProtocol.id ?? "")
    : "";
}
