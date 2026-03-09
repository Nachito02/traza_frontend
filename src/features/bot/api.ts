import { apiClient } from "../../lib/api";

export const BOT_SCOPES = [
  "encargos.ver",
  "encargos.contactar",
  "encargos.cargar_datos",
  "encargos.resolver",
] as const;

export type BotScope = (typeof BOT_SCOPES)[number];

export const BOT_SCOPE_LABELS: Record<BotScope, string> = {
  "encargos.ver": "Ver trabajos asignados",
  "encargos.contactar": "Marcar contacto vía WhatsApp",
  "encargos.cargar_datos": "Ayudar con carga de datos",
  "encargos.resolver": "Enviar resultado final",
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
