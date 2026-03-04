import { useMemo } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
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

  const onChangeScope = (scope: OperacionScope) => {
    writeOperacionScopePreference(scope);
    if (scope === "bodega") {
      navigate("/operacion/recepcion", { replace: true });
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
              to={useBodegaOperacion ? "/operacion/recepcion" : "/operacion/tareas"}
              className="rounded-lg border border-[#C9A961] bg-[#FFF9F0] px-3 py-2 text-xs font-semibold text-[#722F37] transition hover:bg-[#F7EEDB]"
            >
              Ir a {useBodegaOperacion ? "operación bodega" : "tareas"}
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
                className={({ isActive }) =>
                  [
                    "rounded-lg border px-3 py-2 text-xs font-semibold transition",
                    isActive
                      ? "border-[#C9A961] bg-[#FFF9F0] text-[#722F37]"
                      : "border-[#C9A961]/40 bg-white/80 text-[#7A4A50] hover:bg-[#FFF9F0]",
                  ].join(" ")
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </header>

        <Outlet />
      </div>
    </div>
  );
}
