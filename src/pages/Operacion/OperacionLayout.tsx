import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { resolveModuleAccess } from "../../lib/permissions";
import { useAuthStore } from "../../store/authStore";

const LINKS_BODEGA = [
  { to: "/operacion/recepcion", label: "Recepción" },
  { to: "/operacion/ciu-qc", label: "CIU y QC" },
  { to: "/operacion/vasijas", label: "Vasijas y Proceso" },
  { to: "/operacion/cortes", label: "Cortes y Producto" },
  { to: "/operacion/fraccionamiento", label: "Fraccionamiento y Despacho" },
  { to: "/operacion/qr", label: "Producto y Trazabilidad" },
];

const LINKS_FINCA = [{ to: "/operacion/tareas", label: "Tareas de Finca" }];
const SUBCATEGORY_LINKS: Record<
  string,
  Array<{ to: string; label: string }>
> = {
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
  qr: [
    { to: "/operacion/qr", label: "Producto y Trazabilidad" },
  ],
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
    const params = new URLSearchParams(location.search);
    const categoryFromQuery = params.get("categoria") ?? "";
    if (categoryFromQuery) return categoryFromQuery;
    if (location.pathname.startsWith("/operacion/recepcion")) return "recepcion";
    if (location.pathname.startsWith("/operacion/ciu-qc")) return "ciu-qc";
    if (location.pathname.startsWith("/operacion/vasijas")) return "vasijas";
    if (location.pathname.startsWith("/operacion/cortes")) return "cortes";
    if (location.pathname.startsWith("/operacion/fraccionamiento")) return "fraccionamiento";
    if (location.pathname.startsWith("/operacion/qr")) return "qr";
    return "recepcion";
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
    if (scope === "bodega") {
      navigate("/operacion/tareas", { replace: true });
      return;
    }
    navigate("/operacion/tareas", { replace: true });
  };

  return (
    <div className="min-h-screen bg-secondary px-6 py-10">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <header className="rounded-2xl bg-primary p-6 shadow-lg">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold text-text">Operación</h1>
              <p className="mt-2 text-sm text-text-secondary">
                {useBodegaOperacion
                  ? "Registro operativo de recepción, control, elaboración, fraccionamiento y trazabilidad."
                  : "Gestión operativa de finca: asignación y seguimiento de tareas."}
              </p>
            </div>
            <Link
              to="/tareas"
              className="rounded-lg border border-[#C9A961]/40 px-3 py-2 text-xs font-semibold text-text transition hover:bg-primary"
            >
              Ver tareas en curso
            </Link>
          </div>
          {access.hasBothOperacionScopes ? (
            <div className="mt-3 flex items-center gap-2">
              <label className="text-xs font-semibold text-text">Ámbito:</label>
              <select
                value={selectedScope}
                onChange={(event) => onChangeScope(event.target.value as OperacionScope)}
                className="rounded border border-[#C9A961]/40 bg-white px-2 py-1 text-xs text-[#3D1B1F]"
              >
                <option value="bodega">Bodega</option>
                <option value="finca">Finca</option>
              </select>
            </div>
          ) : null}
          <nav className="mt-4 flex flex-wrap gap-2">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={() =>
                  [
                    "rounded-lg border px-3 py-2 text-xs font-semibold transition",
                    isLinkActive(link.to)
                      ? "border-[#C9A961] bg-[#FFF9F0] text-[#722F37]"
                      : "border-[#C9A961]/40 bg-white text-[#7A4A50] hover:bg-[#FFF9F0]",
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
                      "rounded-full border px-3 py-1 text-[11px] font-semibold transition",
                      isLinkActive(link.to)
                        ? "border-[#722F37] bg-[#722F37] text-[#FFF9F0]"
                        : "border-[#C9A961]/40 bg-white text-[#7A4A50] hover:bg-[#FFF9F0]",
                    ].join(" ")
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>
          ) : null}
        </header>

        <Outlet />
      </div>
    </div>
  );
}
