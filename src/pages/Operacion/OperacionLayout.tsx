import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AppCard, NoticeBanner, SectionIntro } from "../../components/ui";
import { resolveModuleAccess } from "../../lib/permissions";
import { useAuthStore } from "../../store/authStore";
import { useOperacionStore } from "../../store/operacionStore";

const LINKS_BODEGA = [
  { to: "/operacion/tareas", label: "Tareas" },
  { to: "/operacion/recepcion", label: "Recepción" },
  { to: "/operacion/ciu-qc", label: "CIU y QC" },
  { to: "/operacion/vasijas", label: "Vasijas y Proceso" },
  { to: "/operacion/cortes", label: "Cortes y Producto" },
  { to: "/operacion/fraccionamiento", label: "Fraccionamiento y Despacho" },
  { to: "/operacion/qr", label: "Producto y Trazabilidad" },
];

const LINKS_FINCA = [{ to: "/operacion/tareas", label: "Tareas de Finca" }];

const SUBCATEGORY_LINKS: Record<string, Array<{ to: string; label: string }>> = {
  recepcion: [
    { to: "/operacion/recepcion?section=remito", label: "Remito Uva" },
    { to: "/operacion/recepcion?section=recepcion", label: "Recepción Bodega" },
    { to: "/operacion/recepcion?section=analisis", label: "Análisis Recepción" },
  ],
  "ciu-qc": [
    { to: "/operacion/ciu-qc?section=ciu", label: "CIU" },
    { to: "/operacion/ciu-qc?section=vinculo", label: "CIU-Recepción" },
    { to: "/operacion/ciu-qc?section=qc", label: "QC Ingreso Uva" },
  ],
  vasijas: [
    { to: "/operacion/vasijas?section=vasijas", label: "Vasijas" },
    { to: "/operacion/vasijas?section=operaciones", label: "Operación Vasija" },
    { to: "/operacion/vasijas?section=existencias", label: "Existencia Vasija" },
    { to: "/operacion/vasijas?section=fermentacion", label: "Control Fermentación" },
  ],
  cortes: [
    { to: "/operacion/cortes?section=cortes", label: "Cortes" },
    { to: "/operacion/cortes?section=productos", label: "Productos" },
  ],
  fraccionamiento: [
    { to: "/operacion/fraccionamiento?section=lotes", label: "Lotes" },
    { to: "/operacion/fraccionamiento?section=codigos", label: "Códigos Envase" },
    { to: "/operacion/fraccionamiento?section=despachos", label: "Despachos" },
  ],
  qr: [{ to: "/operacion/qr", label: "Producto y Trazabilidad" }],
};

const OPERACION_SCOPE_STORAGE_KEY = "operacion_scope";
type OperacionScope = "bodega" | "finca";

function readOperacionScopePreference(): OperacionScope | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(OPERACION_SCOPE_STORAGE_KEY);
  if (raw === "bodega" || raw === "finca") return raw;
  return null;
}

function writeOperacionScopePreference(scope: OperacionScope) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(OPERACION_SCOPE_STORAGE_KEY, scope);
}

export default function OperacionLayout() {
  const user = useAuthStore((state) => state.user);
  const activeBodegaId = useAuthStore((state) => state.activeBodegaId);
  const { activeProtocoloId } = useOperacionStore();
  const navigate = useNavigate();
  const location = useLocation();
  const access = resolveModuleAccess(user, activeBodegaId);
  const [selectedScope, setSelectedScope] = useState<OperacionScope>(() => {
    if (access.canAccessOperacionBodega && !access.canAccessOperacionFinca) return "bodega";
    if (!access.canAccessOperacionBodega && access.canAccessOperacionFinca) return "finca";
    const preferred = readOperacionScopePreference();
    if (preferred) return preferred;
    return "bodega";
  });
  useEffect(() => {
    if (access.canAccessOperacionBodega && !access.canAccessOperacionFinca) {
      setSelectedScope("bodega");
      return;
    }
    if (!access.canAccessOperacionBodega && access.canAccessOperacionFinca) {
      setSelectedScope("finca");
      return;
    }
    const preferred = readOperacionScopePreference();
    setSelectedScope(preferred ?? "bodega");
  }, [access.canAccessOperacionBodega, access.canAccessOperacionFinca]);

  const useBodegaOperacion = selectedScope === "bodega";
  const links = useBodegaOperacion ? LINKS_BODEGA : LINKS_FINCA;
  const currentPathWithSearch = `${location.pathname}${location.search}`;

  const activeCategory = useMemo(() => {
    if (!useBodegaOperacion) return "";
    if (location.pathname.startsWith("/operacion/tareas")) return "";
    const params = new URLSearchParams(location.search);
    const categoryFromQuery = params.get("categoria") ?? "";
    if (categoryFromQuery) return categoryFromQuery;
    if (location.pathname.startsWith("/operacion/recepcion")) return "recepcion";
    if (location.pathname.startsWith("/operacion/ciu-qc")) return "ciu-qc";
    if (location.pathname.startsWith("/operacion/vasijas")) return "vasijas";
    if (location.pathname.startsWith("/operacion/cortes")) return "cortes";
    if (location.pathname.startsWith("/operacion/fraccionamiento")) return "fraccionamiento";
    if (location.pathname.startsWith("/operacion/qr")) return "qr";
    return "";
  }, [location.pathname, location.search, useBodegaOperacion]);

  const subcategoryLinks = useMemo(
    () => (useBodegaOperacion ? SUBCATEGORY_LINKS[activeCategory] ?? [] : []),
    [activeCategory, useBodegaOperacion],
  );

  const isLinkActive = (to: string) => {
    if (to.includes("?")) return currentPathWithSearch === to;
    return location.pathname === to;
  };

  const onChangeScope = (scope: OperacionScope) => {
    setSelectedScope(scope);
    writeOperacionScopePreference(scope);
    navigate("/operacion/tareas", { replace: true });
  };

  return (
    <div className="min-h-screen bg-secondary px-6 py-10">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <AppCard
          as="section"
          tone="default"
          padding="lg"
          className="bg-[color:var(--surface-hero)] text-[color:var(--text-on-dark)]"
          header={(
            <SectionIntro
              title="Operación"
              description={
                useBodegaOperacion
                  ? "Registro operativo de recepción, control, elaboración y fraccionamiento."
                  : "Gestión operativa de finca: asignación y seguimiento de tareas."
              }
              descriptionClassName="text-[color:var(--text-on-dark-muted)]"
              actions={(
                <div className="flex flex-wrap gap-2">
                  <Link
                    to="/tareas"
                    className="inline-flex min-h-9 items-center justify-center rounded-[var(--radius-md)] border border-[color:var(--border-shell)] bg-[color:var(--action-secondary-bg)] px-3 py-2 text-xs font-semibold text-[color:var(--text-on-dark)] shadow-[var(--shadow-inset-soft)] transition-all duration-[var(--motion-fast)] ease-[var(--motion-standard)] hover:border-[color:var(--border-default)] hover:bg-[color:var(--action-secondary-hover)]"
                  >
                    Ver tareas en curso
                  </Link>
                  <Link
                    to="/progreso"
                    className="inline-flex min-h-9 items-center justify-center rounded-[var(--radius-md)] border border-[color:var(--border-shell)] bg-[color:var(--action-secondary-bg)] px-3 py-2 text-xs font-semibold text-[color:var(--text-on-dark)] shadow-[var(--shadow-inset-soft)] transition-all duration-[var(--motion-fast)] ease-[var(--motion-standard)] hover:border-[color:var(--border-default)] hover:bg-[color:var(--action-secondary-hover)]"
                  >
                    Ver progreso
                  </Link>
                </div>
              )}
            />
          )}
        >
          <div className="flex flex-wrap items-center gap-4">
            {access.hasBothOperacionScopes ? (
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-[color:var(--text-on-dark-muted)]">Ámbito:</label>
                <select
                  value={selectedScope}
                  onChange={(event) => onChangeScope(event.target.value as OperacionScope)}
                  className="min-h-9 rounded-[var(--radius-md)] border border-[color:var(--border-default)] bg-[color:var(--surface-base)] px-3 py-2 text-xs text-[color:var(--text-ink)] outline-none transition focus:border-[color:var(--accent-secondary)] focus:ring-2 focus:ring-[color:var(--accent-secondary)]/20"
                >
                  <option value="bodega">Bodega</option>
                  <option value="finca">Finca</option>
                </select>
              </div>
            ) : null}
            {useBodegaOperacion && !activeProtocoloId ? (
              <NoticeBanner tone="warning" className="px-3 py-2 text-xs">
                Sin protocolo activo. Configuralo desde{" "}
                <Link to="/bodega" className="font-semibold text-[color:var(--accent-primary)] hover:underline">
                  Bodega
                </Link>
                .
              </NoticeBanner>
            ) : null}
          </div>

          <nav className="mt-5 flex flex-wrap gap-2">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={() =>
                  [
                    "inline-flex min-h-10 items-center justify-center rounded-[var(--radius-md)] border px-3 py-2 text-xs font-semibold shadow-[var(--shadow-inset-soft)] transition-all duration-[var(--motion-fast)] ease-[var(--motion-standard)]",
                    isLinkActive(link.to)
                      ? "border-[color:var(--border-default)] bg-[color:var(--action-primary-bg)] text-[color:var(--text-primary)]"
                      : "border-[color:var(--border-shell)] bg-[color:var(--action-secondary-bg)] text-[color:var(--text-on-dark-muted)] hover:border-[color:var(--border-default)] hover:bg-[color:var(--action-secondary-hover)] hover:text-[color:var(--text-on-dark)]",
                  ].join(" ")
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          {subcategoryLinks.length > 0 ? (
            <nav className="mt-3 flex flex-wrap gap-2">
              {subcategoryLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={() =>
                    [
                      "inline-flex min-h-8 items-center justify-center rounded-full border px-3 py-1 text-[11px] font-semibold transition-all duration-[var(--motion-fast)] ease-[var(--motion-standard)]",
                      isLinkActive(link.to)
                        ? "border-[color:var(--border-default)] bg-[color:var(--action-primary-bg)] text-[color:var(--text-primary)]"
                        : "border-[color:var(--border-shell)] bg-[color:var(--action-ghost-bg)] text-[color:var(--text-on-dark-muted)] hover:border-[color:var(--border-default)] hover:bg-[color:var(--action-ghost-hover)] hover:text-[color:var(--text-on-dark)]",
                    ].join(" ")
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>
          ) : null}
        </AppCard>

        <Outlet />
      </div>
    </div>
  );
}
