type UserLike = {
  roles_globales?: unknown;
  bodegas?: unknown;
  fincas?: unknown;
  rol?: unknown;
  role?: unknown;
} | null;

const GLOBAL_ADMIN_ROLES = ["admin_sistema", "super_user", "superuser"];
const BODEGA_ROLES = [
  "admin_bodega",
  "encargado_bodega",
  "productor",
  "responsable_calidad_inocuidad",
  "responsable_ssyo",
  "enologo",
];
const FINCA_ROLES = ["encargado_finca", "operador_campo"];

function normalizeRoles(input: unknown): string[] {
  if (typeof input === "string") {
    const normalized = input.trim().toLowerCase();
    return normalized ? [normalized] : [];
  }
  if (Array.isArray(input)) {
    return input
      .flatMap((role) => {
        if (typeof role === "string") return [role];
        if (role && typeof role === "object") {
          const anyRole = role as Record<string, unknown>;
          return [
            anyRole.rol_global,
            anyRole.rol_en_bodega,
            anyRole.rol_en_finca,
            anyRole.rol,
            anyRole.role,
          ].filter((value): value is string => typeof value === "string");
        }
        return [];
      })
      .map((role) => role.trim().toLowerCase())
      .filter(Boolean);
  }
  if (input && typeof input === "object") {
    const anyRole = input as Record<string, unknown>;
    return normalizeRoles([
      anyRole.rol_global,
      anyRole.rol_en_bodega,
      anyRole.rol_en_finca,
      anyRole.rol,
      anyRole.role,
    ]);
  }
  return [];
}

function includesAnyRole(currentRoles: string[], expectedRoles: string[]) {
  const expected = new Set(expectedRoles.map((role) => role.toLowerCase()));
  return currentRoles.some((role) => expected.has(role));
}

function collectRoleStringsDeep(input: unknown, depth = 0): string[] {
  if (depth > 4 || input === null || input === undefined) return [];
  if (typeof input === "string") {
    const normalized = input.trim().toLowerCase();
    return normalized ? [normalized] : [];
  }
  if (Array.isArray(input)) {
    return input.flatMap((item) => collectRoleStringsDeep(item, depth + 1));
  }
  if (typeof input === "object") {
    const source = input as Record<string, unknown>;
    const direct: string[] = [];
    const nested: string[] = [];
    for (const [key, value] of Object.entries(source)) {
      const keyLower = key.toLowerCase();
      if (keyLower.includes("rol") || keyLower.includes("role")) {
        direct.push(...normalizeRoles(value));
      } else {
        nested.push(...collectRoleStringsDeep(value, depth + 1));
      }
    }
    return [...direct, ...nested];
  }
  return [];
}

function getUserBodegaRoles(user: UserLike, activeBodegaId: string | number | null) {
  if (!user) return [];
  const anyUser = user as {
    roles_en_bodega?: unknown;
    rol_en_bodega?: unknown;
    rolesEnBodega?: unknown;
    rolEnBodega?: unknown;
    bodegas?: Array<{
      bodega_id?: string | number;
      nombre?: string;
      roles_en_bodega?: string[];
      rol_en_bodega?: string;
      rolesEnBodega?: string[];
      rolEnBodega?: string;
    }>;
  };
  const topLevelRoles = normalizeRoles([
    anyUser.roles_en_bodega,
    anyUser.rol_en_bodega,
    anyUser.rolesEnBodega,
    anyUser.rolEnBodega,
  ]);
  if (!activeBodegaId) return topLevelRoles;

  const match = (anyUser.bodegas ?? []).find((item) => {
    const sameId = String(item.bodega_id ?? "") === String(activeBodegaId);
    const sameName = String(item.nombre ?? "") === String(activeBodegaId);
    return sameId || sameName;
  });

  const scopedRoles = match
    ? normalizeRoles([
        match.roles_en_bodega,
        match.rol_en_bodega,
        match.rolesEnBodega,
        match.rolEnBodega,
      ])
    : normalizeRoles(
        (anyUser.bodegas ?? []).flatMap((bodega) => [
          bodega.roles_en_bodega,
          bodega.rol_en_bodega,
          bodega.rolesEnBodega,
          bodega.rolEnBodega,
        ]),
      );

  return Array.from(new Set([...topLevelRoles, ...scopedRoles]));
}

function getUserFincaRoles(user: UserLike) {
  if (!user) return [];
  const anyUser = user as {
    fincas?: Array<{
      roles_en_finca?: string[];
      rol_en_finca?: string;
    }>;
  };
  return (anyUser.fincas ?? []).flatMap((finca) =>
    normalizeRoles(finca.roles_en_finca ?? (finca.rol_en_finca ? [finca.rol_en_finca] : [])),
  );
}

export function resolveModuleAccess(user: UserLike, activeBodegaId: string | number | null) {
  const globalRoles = normalizeRoles([user?.roles_globales, user?.rol, user?.role]);
  const bodegaRoles = getUserBodegaRoles(user, activeBodegaId);
  const fincaRoles = getUserFincaRoles(user);
  const deepRoles = collectRoleStringsDeep(user);

  const isAdminSistema =
    includesAnyRole(globalRoles, GLOBAL_ADMIN_ROLES) ||
    includesAnyRole(deepRoles, GLOBAL_ADMIN_ROLES);
  const hasBodegaRole =
    includesAnyRole(globalRoles, BODEGA_ROLES) ||
    includesAnyRole(bodegaRoles, BODEGA_ROLES) ||
    includesAnyRole(deepRoles, BODEGA_ROLES);
  const hasFincaRole =
    includesAnyRole(globalRoles, FINCA_ROLES) ||
    includesAnyRole(fincaRoles, FINCA_ROLES) ||
    includesAnyRole(bodegaRoles, FINCA_ROLES) ||
    includesAnyRole(deepRoles, FINCA_ROLES);
  const hasLinkedFincas = Boolean(
    (user as { fincas?: unknown } | null)?.fincas &&
      Array.isArray((user as { fincas?: unknown } | null)?.fincas) &&
      ((user as { fincas?: unknown[] } | null)?.fincas?.length ?? 0) > 0,
  );

  return {
    isAdminSistema,
    canAccessBodega: isAdminSistema || hasBodegaRole,
    canAccessOperacionBodega: isAdminSistema || hasBodegaRole,
    canAccessOperacionFinca: isAdminSistema || hasFincaRole,
    canAccessOperacion: isAdminSistema || hasBodegaRole || hasFincaRole,
    hasBothOperacionScopes: (isAdminSistema || hasBodegaRole) && (isAdminSistema || hasFincaRole),
    isFincaOnly: hasFincaRole && !hasBodegaRole && !isAdminSistema,
    hasLinkedFincas,
  };
}
