import { useMemo } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { resolveModuleAccess } from "../../lib/permissions";
import { useAuthStore } from "../../store/authStore";

const LINKS_BODEGA = [
  { to: "/operacion/tareas?categoria=recepcion", label: "Recepción" },
  { to: "/operacion/tareas?categoria=ciu-qc", label: "CIU y QC" },
  { to: "/operacion/tareas?categoria=vasijas", label: "Vasijas y Proceso" },
  { to: "/operacion/tareas?categoria=cortes", label: "Cortes y Producto" },
  { to: "/operacion/tareas?categoria=fraccionamiento", label: "Fraccionamiento y Despacho" },
  { to: "/operacion/tareas?categoria=qr", label: "Producto y Trazabilidad" },
];

const LINKS_FINCA = [{ to: "/operacion/tareas", label: "Tareas de Finca" }];
const SUBCATEGORY_LINKS: Record<
  string,
  Array<{ to: string; label: string }>
> = {
  recepcion: [
    { to: "/operacion/tareas?categoria=recepcion&tarea=remito_uva", label: "Remito Uva" },
    { to: "/operacion/tareas?categoria=recepcion&tarea=recepcion_bodega", label: "Recepción Bodega" },
    { to: "/operacion/tareas?categoria=recepcion&tarea=analisis_recepcion", label: "Análisis Recepción" },
  ],
  "ciu-qc": [
    { to: "/operacion/tareas?categoria=ciu-qc&tarea=ciu", label: "CIU" },
    { to: "/operacion/tareas?categoria=ciu-qc&tarea=ciu_recepcion", label: "CIU-Recepción" },
    { to: "/operacion/tareas?categoria=ciu-qc&tarea=qc_ingreso_uva", label: "QC Ingreso Uva" },
  ],
  vasijas: [
    { to: "/operacion/tareas?categoria=vasijas&tarea=vasija", label: "Vasijas" },
    { to: "/operacion/tareas?categoria=vasijas&tarea=operacion_vasija", label: "Operación Vasija" },
    { to: "/operacion/tareas?categoria=vasijas&tarea=existencia_vasija", label: "Existencia Vasija" },
    { to: "/operacion/tareas?categoria=vasijas&tarea=control_fermentacion", label: "Control Fermentación" },
  ],
  cortes: [
    { to: "/operacion/tareas?categoria=cortes&tarea=corte", label: "Cortes" },
    { to: "/operacion/tareas?categoria=cortes&tarea=producto", label: "Productos" },
  ],
  fraccionamiento: [
    { to: "/operacion/tareas?categoria=fraccionamiento&tarea=lote_fraccionamiento", label: "Lotes" },
    { to: "/operacion/tareas?categoria=fraccionamiento&tarea=codigo_envase", label: "Códigos Envase" },
    { to: "/operacion/tareas?categoria=fraccionamiento&tarea=despacho", label: "Despachos" },
  ],
  qr: [
    { to: "/operacion/tareas?categoria=qr&tarea=producto_trazabilidad", label: "Producto y Trazabilidad" },
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
  const selectedScope = useMemo<OperacionScope>(() => {
    if (access.canAccessOperacionBodega && !access.canAccessOperacionFinca) return "bodega";
    if (!access.canAccessOperacionBodega && access.canAccessOperacionFinca) return "finca";
    const preferred = readOperacionScopePreference();
    if (preferred) return preferred;
    return "bodega";
  }, [access.canAccessOperacionBodega, access.canAccessOperacionFinca]);

  const useBodegaOperacion = selectedScope === "bodega";
  const links = useBodegaOperacion ? LINKS_BODEGA : LINKS_FINCA;
  const currentPathWithSearch = `${location.pathname}${location.search}`;
  const activeCategory = useMemo(() => {
    if (!useBodegaOperacion) return "";
    const params = new URLSearchParams(location.search);
    const categoryFromQuery = params.get("categoria") ?? "";
    if (categoryFromQuery) return categoryFromQuery;
    const found = LINKS_BODEGA.find((link) =>
      location.pathname === "/operacion/tareas" ? currentPathWithSearch.startsWith(link.to) : false,
    );
    if (found?.to.includes("categoria=")) {
      const parsed = new URL(found.to, "http://localhost");
      return parsed.searchParams.get("categoria") ?? "";
    }
    return "recepcion";
  }, [currentPathWithSearch, location.pathname, location.search, useBodegaOperacion]);
  const subcategoryLinks = useMemo(
    () => (useBodegaOperacion ? SUBCATEGORY_LINKS[activeCategory] ?? [] : []),
    [activeCategory, useBodegaOperacion],
  );

  const isLinkActive = (to: string) => {
    if (to.includes("?")) return currentPathWithSearch === to;
    return location.pathname === to;
  };

  const onChangeScope = (scope: OperacionScope) => {
    writeOperacionScopePreference(scope);
    if (scope === "bodega") {
      navigate("/operacion/tareas", { replace: true });
      return;
    }
    navigate("/operacion/tareas", { replace: true });
  };

  return (
    <div className="min-h-screen bg-secondary px-6 py-10">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <header className="rounded-2xl bg-primary/30 p-6 shadow-sm">
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
              className="rounded-lg border border-[#C9A961] bg-[#FFF9F0] px-3 py-2 text-xs font-semibold text-[#722F37] transition hover:bg-[#F7EEDB]"
            >
              Ver tareas en curso
            </Link>
          </div>
          {access.hasBothOperacionScopes ? (
            <div className="mt-3 flex items-center gap-2">
              <label className="text-xs font-semibold text-[#722F37]">Ámbito:</label>
              <select
                value={selectedScope}
                onChange={(event) => onChangeScope(event.target.value as OperacionScope)}
                className="rounded border border-[#C9A961]/40 bg-white/90 px-2 py-1 text-xs text-[#3D1B1F]"
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
                      : "border-[#C9A961]/40 bg-white/80 text-[#7A4A50] hover:bg-[#FFF9F0]",
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
                        : "border-[#C9A961]/40 bg-white/85 text-[#7A4A50] hover:bg-[#FFF9F0]",
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
