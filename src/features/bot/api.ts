import { apiClient } from "../../lib/api";

export const BOT_SCOPES = [
  "tareas.crear",
  "tareas.actualizar_estado",
  "tareas.contactar",
  "tareas.cargar_datos",
  "cuarteles.crear",
  "vasijas.crear",
] as const;

export type BotScope = (typeof BOT_SCOPES)[number];

export const BOT_SCOPE_LABELS: Record<BotScope, string> = {
  "tareas.crear": "Crear tareas",
  "tareas.actualizar_estado": "Actualizar estado de tareas",
  "tareas.contactar": "Marcar contacto vía WhatsApp",
  "tareas.cargar_datos": "Ayudar con carga de datos",
  "cuarteles.crear": "Crear cuarteles",
  "vasijas.crear": "Crear vasijas",
};

export type Delegation = {
  bot_delegation_id: string;
  bot_user_id: string;
  bodega_id: string | null;
  scopes: BotScope[];
  expires_at: string | null;
  created_at: string;
};

export type CreateDelegationPayload = {
  botUserId: string;
  bodegaId?: string | null;
  scopes: BotScope[];
  expiresAt?: string | null;
};

export async function fetchMyDelegations() {
  const response = await apiClient.get<Delegation[]>("/bot/delegaciones/me");
  return response.data ?? [];
}

export async function createDelegation(payload: CreateDelegationPayload) {
  const response = await apiClient.post<Delegation>("/bot/delegaciones", payload);
  return response.data;
}

export async function revokeDelegation(delegationId: string) {
  const response = await apiClient.delete(`/bot/delegaciones/${encodeURIComponent(delegationId)}`);
  return response.data;
}
