import { Link, NavLink, Outlet } from "react-router-dom";
import { AppCard, SectionIntro } from "../../components/ui";

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
        <AppCard
          as="section"
          tone="default"
          padding="lg"
          className="bg-[color:var(--surface-hero)] text-[color:var(--text-on-dark)]"
          header={(
            <SectionIntro
              title="Bodega"
              description="Flujo operativo completo: recepción, control, elaboración, fraccionamiento y trazabilidad de producto final."
              descriptionClassName="text-[color:var(--text-on-dark-muted)]"
              actions={(
                <Link
                  to="/bodega/vasijas"
                  className="inline-flex min-h-10 items-center justify-center rounded-[var(--radius-md)] border border-[color:var(--border-default)] bg-[color:var(--surface-base)] px-4 py-2 text-xs font-semibold text-[color:var(--accent-primary)] shadow-[var(--shadow-inset-soft)] transition-all duration-[var(--motion-fast)] ease-[var(--motion-standard)] hover:border-[color:var(--accent-secondary)] hover:bg-[color:var(--action-ghost-hover)]"
                >
                  Crear vasija
                </Link>
              )}
            />
          )}
        >
          <nav className="flex flex-wrap gap-2">
            {LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  [
                    "inline-flex min-h-10 items-center justify-center rounded-[var(--radius-md)] border px-3 py-2 text-xs font-semibold shadow-[var(--shadow-inset-soft)] transition-all duration-[var(--motion-fast)] ease-[var(--motion-standard)]",
                    isActive
                      ? "border-[color:var(--accent-secondary)] bg-[color:var(--surface-base)] text-[color:var(--accent-primary)]"
                      : "border-[color:var(--border-default)] bg-white/90 text-[color:var(--text-ink-muted)] hover:border-[color:var(--accent-secondary)] hover:bg-[color:var(--surface-base)] hover:text-[color:var(--accent-primary)]",
                  ].join(" ")
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </AppCard>

        <Outlet />
      </div>
    </div>
  );
}
