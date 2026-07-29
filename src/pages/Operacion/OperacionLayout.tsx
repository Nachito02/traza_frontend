import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { AppButton, AppCard, GuidedState, SectionIntro } from "../../components/ui";
import { useAuthStore } from "../../store/authStore";
import { useOperacionStore } from "../../store/operacionStore";

const FINCA_TO = "/operacion/campo";

const NAV_GROUPS = [
  {
    label: "Finca",
    links: [
      { to: FINCA_TO, label: "Operaciones de campo" },
    ],
  },
  {
    label: "Bodega",
    links: [
      { to: "/operacion/recepcion", label: "Ingreso de uva" },
      { to: "/operacion/vasijas", label: "Vasijas y Proceso" },
      { to: "/operacion/cortes", label: "Cortes y Producto" },
      { to: "/operacion/fraccionamiento", label: "Fraccionamiento y Despacho" },
      { to: "/operacion/qr", label: "Producto y Trazabilidad" },
    ],
  },
];

export default function OperacionLayout() {
  const activeBodegaId = useAuthStore((state) => state.activeBodegaId);
  const { activeProtocoloId } = useOperacionStore();
  const location = useLocation();
  const isRegistroRoute = location.pathname === "/operacion/registro";
  // El modo edit/task llega por deep link (desde una tarea u orden ya elegida): ahí no
  // corresponde pedir una categoría, se va directo al formulario.
  const isDeepLinkedRegistro = isRegistroRoute && new URLSearchParams(location.search).has("mode");
  // El asistente de "Registrar actividad" (Actividad/Finca/Cuartel) solo aplica a
  // actividades de campo: las categorías de Bodega tienen su propia página/formulario.
  const isFincaGateActive = isRegistroRoute && !isDeepLinkedRegistro;
  const [campoSeleccionado, setCampoSeleccionado] = useState(false);
  const currentPathWithSearch = `${location.pathname}${location.search}`;

  useEffect(() => {
    if (isRegistroRoute) setCampoSeleccionado(false);
  }, [isRegistroRoute]);

  const isLinkActive = (to: string) => {
    if (to.includes("?")) return currentPathWithSearch === to;
    return location.pathname === to;
  };

  return (
    <div className="min-h-screen bg-secondary px-6 py-10">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <SectionIntro
          eyebrow={isRegistroRoute ? undefined : "Bodega"}
          title={isRegistroRoute ? "Registrar actividad" : "Registro operativo"}
          description={isRegistroRoute ? "Cargá la actividad y sus costos en un solo paso. Queda completada a tu nombre." : "Recepción, control, elaboración y fraccionamiento."}
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

          <div className={["space-y-4", !activeProtocoloId ? "mt-5" : ""].join(" ").trim()}>
            {NAV_GROUPS.map((group) => (
              <nav key={group.label} className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[color:var(--text-ink-muted)]">
                  {group.label}
                </p>
                <div className="flex flex-wrap gap-2">
                  {group.links.map((link) => {
                    const isFincaToggle = isFincaGateActive && link.to === FINCA_TO;
                    const active = isFincaToggle ? campoSeleccionado : isLinkActive(link.to);
                    const linkClassName = [
                      "inline-flex min-h-10 items-center justify-center rounded-[var(--radius-md)] border px-3 py-2 text-xs font-semibold shadow-[var(--shadow-inset-soft)] transition-all duration-[var(--motion-fast)] ease-[var(--motion-standard)]",
                      active
                        ? "border-[color:var(--border-default)] bg-[color:var(--action-primary-bg)] text-[color:var(--text-primary)]"
                        : "border-[color:var(--border-shell)] bg-[color:var(--action-secondary-bg)] text-[color:var(--text-ink-muted)] hover:border-[color:var(--border-default)] hover:bg-[color:var(--action-secondary-hover)] hover:text-[color:var(--text-ink)]",
                    ].join(" ");

                    if (isFincaToggle) {
                      return (
                        <button
                          key={link.to}
                          type="button"
                          onClick={() => setCampoSeleccionado(true)}
                          className={linkClassName}
                        >
                          {link.label}
                        </button>
                      );
                    }

                    return (
                      <NavLink key={link.to} to={link.to} className={() => linkClassName}>
                        {link.label}
                      </NavLink>
                    );
                  })}
                </div>
              </nav>
            ))}
          </div>
        </AppCard>

        {isFincaGateActive && !campoSeleccionado ? (
          <AppCard padding="lg">
            <p className="text-sm text-[color:var(--text-ink-muted)]">
              Elegí "Operaciones de campo" arriba para cargar una actividad de finca. Para bodega, entrá a la sección correspondiente.
            </p>
          </AppCard>
        ) : (
          <Outlet />
        )}
      </div>
    </div>
  );
}
