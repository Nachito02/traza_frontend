import { apiClient } from "../../lib/api";

export type AuthUserBodega = {
  bodega_id: string;
  nombre: string;
  roles_en_bodega?: string[];
  rol_en_bodega?: string;
};

export type AuthUser = {
  id: string;
  email: string | null;
  nombre: string;
  is_active: boolean;
  roles_globales: string[];
  bodegas: AuthUserBodega[];
};

export async function fetchAuthUsers(name?: string) {
  const query = name?.trim()
    ? `?name=${encodeURIComponent(name.trim())}`
    : "";
  const response = await apiClient.get<AuthUser[]>(`/auth/users${query}`);
  return response.data;
}

export async function updateUserBodegaRoleByName(params: {
  userId: string;
  bodegaName: string;
  rolesEnBodega: string[];
}) {
  const response = await apiClient.patch(
    `/auth/users/${encodeURIComponent(params.userId)}/bodegas/${encodeURIComponent(params.bodegaName)}/role`,
    {
      rolesEnBodega: params.rolesEnBodega,
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
