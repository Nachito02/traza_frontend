import { apiClient } from "../../lib/api";

export type AuthUserBodega = {
  bodega_id: string;
  nombre: string;
  roles_en_bodega?: string[];
  rol_en_bodega?: string;
};

export type AuthUserFinca = {
  finca_id: string;
  nombre?: string;
  roles_en_finca?: string[];
  rol_en_finca?: string;
};

export type AuthUser = {
  id: string;
  email: string | null;
  nombre: string;
  is_active: boolean;
  must_change_password?: boolean;
  roles_globales: string[];
  bodegas: AuthUserBodega[];
  fincas?: AuthUserFinca[];
  whatsapp_e164?: string | null;
};

export type CreateUserPayload = {
  nombre: string;
  email: string;
  password: string;
  bodegaId: string;
  rolesEnBodega?: string[];
  whatsapp?: string;
};

export type UpdateUserPayload = {
  nombre?: string;
  email?: string;
  password?: string;
  is_active?: boolean;
  whatsapp?: string | null;
};

export type BodegaFincaVinculo = {
  bodega_id?: string;
  finca_id?: string;
  tipo_vinculo?: "propia" | "proveedor_tercero" | string;
  activo?: boolean;
  finca?: {
    finca_id?: string;
    id?: string;
    nombre?: string;
    nombre_finca?: string;
  };
};

export async function fetchAuthUsers(name?: string) {
  const query = name?.trim()
    ? `?name=${encodeURIComponent(name.trim())}`
    : "";
  const response = await apiClient.get<AuthUser[]>(`/auth/users${query}`);
  return response.data;
}

export async function createAuthUser(payload: CreateUserPayload) {
  const response = await apiClient.post<AuthUser>("/auth/users", payload);
  return response.data;
}

export async function fetchAuthUserById(userId: string) {
  const response = await apiClient.get<AuthUser>(
    `/auth/users/${encodeURIComponent(userId)}`,
  );
  return response.data;
}

export async function patchAuthUser(userId: string, payload: UpdateUserPayload) {
  const response = await apiClient.patch<AuthUser>(
    `/auth/users/${encodeURIComponent(userId)}`,
    payload,
  );
  return response.data;
}

export async function deleteAuthUser(userId: string) {
  const response = await apiClient.delete(
    `/auth/users/${encodeURIComponent(userId)}`,
  );
  return response.data;
}

export async function updateUserBodegaRoleByName(params: {
  userId: string;
  bodegaName?: string;
  bodegaId: string;
  rolesEnBodega: string[];
}) {
  const response = await apiClient.patch(
    `/auth/users/${encodeURIComponent(params.userId)}/bodegas/id/${encodeURIComponent(params.bodegaId.trim())}/role`,
    { rolesEnBodega: params.rolesEnBodega },
  );
  return response.data;
}

export async function updateUserFincaRoles(params: {
  userId: string;
  fincaId: string;
  rolesEnFinca: string[];
}) {
  const response = await apiClient.patch(
    `/auth/users/${encodeURIComponent(params.userId)}/fincas/${encodeURIComponent(params.fincaId)}/roles`,
    {
      rolesEnFinca: params.rolesEnFinca,
    },
  );
  return response.data;
}

export async function fetchBodegaFincaVinculos(bodegaId: string) {
  const response = await apiClient.get<BodegaFincaVinculo[]>(
    `/bodegas/${encodeURIComponent(bodegaId)}/fincas/vinculos`,
  );
  return response.data ?? [];
}

export async function upsertBodegaFincaVinculo(params: {
  bodegaId: string;
  fincaId: string;
  tipo_vinculo: "propia" | "proveedor_tercero";
  activo: boolean;
}) {
  const response = await apiClient.put(
    `/bodegas/${encodeURIComponent(params.bodegaId)}/fincas/${encodeURIComponent(params.fincaId)}/vinculo`,
    {
      tipo_vinculo: params.tipo_vinculo,
      activo: params.activo,
    },
  );
  return response.data;
}

export async function updateUserGlobalRole(params: {
  userId: string;
  rolGlobal: string;
  enabled: boolean;
}) {
  const response = await apiClient.patch(
    `/auth/users/${encodeURIComponent(params.userId)}/global-role`,
    {
      rolGlobal: params.rolGlobal,
      enabled: params.enabled,
    },
  );
  return response.data;
}

export type CreateBotPayload = {
  email: string;
  password: string;
  nombre: string;
};

export type BotUser = {
  id: string;
  email: string;
  nombre: string;
};

export async function registerBot(payload: CreateBotPayload) {
  const response = await apiClient.post<BotUser>("/ia/auth/register", payload);
  return response.data;
}
