import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { AppButton, AppCard, GuidedState, SectionIntro } from "../../components/ui";
import { useAuthStore } from "../../store/authStore";
import { useOperacionStore } from "../../store/operacionStore";

const LINKS_BODEGA = [
  { to: "/operacion/campo", label: "Operaciones de campo" },
  { to: "/operacion/recepcion", label: "Ingreso de uva" },
  { to: "/operacion/vasijas", label: "Vasijas y Proceso" },
  { to: "/operacion/cortes", label: "Cortes y Producto" },
  { to: "/operacion/fraccionamiento", label: "Fraccionamiento y Despacho" },
  { to: "/operacion/qr", label: "Producto y Trazabilidad" },
];

export default function OperacionLayout() {
  const activeBodegaId = useAuthStore((state) => state.activeBodegaId);
  const { activeProtocoloId } = useOperacionStore();
  const location = useLocation();
  const links = LINKS_BODEGA;
  const currentPathWithSearch = `${location.pathname}${location.search}`;

  const isLinkActive = (to: string) => {
    if (to.includes("?")) return currentPathWithSearch === to;
    return location.pathname === to;
  };

  return (
    <div className="min-h-screen bg-secondary px-6 py-10">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <SectionIntro
          eyebrow="Bodega"
          title="Registro operativo"
          description="Recepción, control, elaboración y fraccionamiento."
        />

        <AppCard
          as="section"
          tone="default"
          padding="lg"
        >
          {!activeProtocoloId ? (
            <GuidedState
              title="Falta elegir un protocolo activo"
              description="El protocolo define las etapas, procesos y actividades disponibles para registrar la trazabilidad operativa."
              action={(
                <Link to="/bodega">
                  <AppButton variant="primary" size="sm">Configurar protocolo</AppButton>
                </Link>
              )}
              secondaryAction={undefined}
              steps={[
                { label: "Bodega activa", done: Boolean(activeBodegaId) },
                { label: "Protocolo activo", done: false },
              ]}
            />
          ) : null}

          <nav className={["flex flex-wrap gap-2", !activeProtocoloId ? "mt-5" : ""].join(" ").trim()}>
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={() =>
                  [
                    "inline-flex min-h-10 items-center justify-center rounded-[var(--radius-md)] border px-3 py-2 text-xs font-semibold shadow-[var(--shadow-inset-soft)] transition-all duration-[var(--motion-fast)] ease-[var(--motion-standard)]",
                    isLinkActive(link.to)
                      ? "border-[color:var(--border-default)] bg-[color:var(--action-primary-bg)] text-[color:var(--text-primary)]"
                      : "border-[color:var(--border-shell)] bg-[color:var(--action-secondary-bg)] text-[color:var(--text-ink-muted)] hover:border-[color:var(--border-default)] hover:bg-[color:var(--action-secondary-hover)] hover:text-[color:var(--text-ink)]",
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
