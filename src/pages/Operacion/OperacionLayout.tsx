import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { AppButton, AppCard, GuidedState, SectionIntro } from "../../components/ui";
import { useAuthStore } from "../../store/authStore";
import { useOperacionStore } from "../../store/operacionStore";

const LINKS_BODEGA = [
  { to: "/operacion/recepcion", label: "Recepción" },
  { to: "/operacion/ciu-qc", label: "CIU y QC" },
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
        <AppCard
          as="section"
          tone="default"
          padding="lg"
          className="bg-[color:var(--surface-hero)] text-[color:var(--text-on-dark)]"
          header={(
            <SectionIntro
              title="Operación"
              description="Registro operativo de recepción, control, elaboración y fraccionamiento."
              descriptionClassName="text-[color:var(--text-on-dark-muted)]"
              actions={(
                <div className="flex flex-wrap gap-2">
                  <Link
                    to="/ordenes"
                    className="inline-flex min-h-9 items-center justify-center rounded-[var(--radius-md)] border border-[color:var(--border-shell)] bg-[color:var(--action-secondary-bg)] px-3 py-2 text-xs font-semibold text-[color:var(--text-on-dark)] shadow-[var(--shadow-inset-soft)] transition-all duration-[var(--motion-fast)] ease-[var(--motion-standard)] hover:border-[color:var(--border-default)] hover:bg-[color:var(--action-secondary-hover)]"
                  >
                    Ver órdenes de trabajo
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
          {!activeProtocoloId ? (
            <div className="mt-5">
              <GuidedState
                title="Falta elegir un protocolo activo"
                description="El protocolo define las etapas, procesos y actividades disponibles para registrar la trazabilidad operativa."
                action={(
                  <Link to="/bodega">
                    <AppButton variant="primary" size="sm">Configurar protocolo</AppButton>
                  </Link>
                )}
                secondaryAction={(
                  <Link to="/setup/protocolos">
                    <AppButton variant="secondary" size="sm">Usar setup guiado</AppButton>
                  </Link>
                )}
                steps={[
                  { label: "Bodega activa", done: Boolean(activeBodegaId) },
                  { label: "Protocolo activo", done: false },
                ]}
              />
            </div>
          ) : null}

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

          
        </AppCard>

        <Outlet />
      </div>
    </div>
  );
}
