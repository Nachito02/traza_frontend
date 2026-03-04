import { Link, NavLink, Outlet } from "react-router-dom";

const LINKS = [
  { to: "/bodega/recepcion", label: "Recepción" },
  { to: "/bodega/ciu-qc", label: "CIU y QC" },
  { to: "/bodega/vasijas", label: "Vasijas y Proceso" },
  { to: "/bodega/cortes", label: "Cortes y Producto" },
  { to: "/bodega/fraccionamiento", label: "Fraccionamiento y Despacho" },
  { to: "/bodega/qr", label: "Producto y Trazabilidad" },
];

export default function ElaboracionLayout() {
  return (
    <div className="min-h-screen bg-secondary px-6 py-10">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <header className="rounded-2xl bg-primary/30 p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold text-text">Bodega</h1>
              <p className="mt-2 text-sm text-text-secondary">
                Flujo operativo completo: recepción, control, elaboración, fraccionamiento y trazabilidad
                de producto final.
              </p>
            </div>
            <Link
              to="/bodega/vasijas"
              className="rounded-lg border border-[#C9A961] bg-[#FFF9F0] px-3 py-2 text-xs font-semibold text-[#722F37] transition hover:bg-[#F7EEDB]"
            >
              Crear vasija
            </Link>
          </div>
          <nav className="mt-4 flex flex-wrap gap-2">
            {LINKS.map((link) => (
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
