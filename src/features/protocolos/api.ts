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
