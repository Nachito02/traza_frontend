import {
  LayoutDashboard,
  Map,
  Users,
  ListTodo,
  Warehouse,
  ClipboardPenLine,
  Bot,
  ScrollText,
  TrendingUp,
  Settings2,
} from "lucide-react";
import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { resolveModuleAccess } from "../lib/permissions";
import trazaLogo from "../assets/traza.png";

type AsideProps = {
  className?: string;
  onNavigate?: () => void;
};

type NavigationLink = {
  to: string;
  label: string;
  description?: string;
  icon: ReactNode;
};

type NavigationGroup = {
  label: string;
  links: NavigationLink[];
};

const Aside = ({ className = "", onNavigate }: AsideProps) => {
  const user = useAuthStore((state) => state.user);
  const activeBodegaId = useAuthStore((state) => state.activeBodegaId);
  const access = resolveModuleAccess(user, activeBodegaId);

  const dailyOrderRoute = access.canAccessOperacion ? "/ordenes" : "/tareas";
  const groups: NavigationGroup[] = [
    {
      label: "Trabajo diario",
      links: [
        {
          to: "/dashboard",
          label: "Panel",
          description: "Resumen de la operación",
          icon: <LayoutDashboard />,
        },
        {
          to: dailyOrderRoute,
          label: "Órdenes de trabajo",
          description: "Pendientes y registros",
          icon: <ListTodo />,
        },
        ...(access.canAccessOperacionBodega
          ? [
              {
                to: "/operacion/recepcion",
                label: "Registro operativo",
                description: "Recepción y elaboración",
                icon: <ClipboardPenLine />,
              },
            ]
          : []),
        ...(access.canAccessBodega
          ? [
              {
                to: "/progreso",
                label: "Progreso",
                description: "Avance por protocolo",
                icon: <TrendingUp />,
              },
            ]
          : []),
      ],
    },
    {
      label: "Administración",
      links: [
        ...(access.canAccessBodega
          ? [
              {
                to: "/bodega",
                label: "Bodega",
                description: "Recursos y protocolo activo",
                icon: <Warehouse />,
              },
            ]
          : []),
        {
          to: "/fincas",
          label: "Fincas",
          description: "Cuarteles y vínculos",
          icon: <Map />,
        },
        {
          to: "/usuarios",
          label: "Usuarios",
          description: "Roles y permisos",
          icon: <Users />,
        },
        {
          to: "/integraciones",
          label: "Bots",
          description: "Delegaciones IA",
          icon: <Bot />,
        },
      ],
    },
    {
      label: "Configuración",
      links: [
        {
          to: "/setup",
          label: "Setup inicial",
          description: "Datos base del sistema",
          icon: <Settings2 />,
        },
        ...(access.isAdminSistema
          ? [
              {
                to: "/admin/protocolos",
                label: "Protocolos",
                description: "Etapas y procesos",
                icon: <ScrollText />,
              },
            ]
          : []),
      ],
    },
  ].filter((group) => group.links.length > 0);

  return (
    <aside
      className={`flex h-full flex-col border-r border-[color:var(--border-shell)] bg-[color:var(--surface-shell)] px-4 py-5 text-[color:var(--text-on-dark)] ${className}`}
    >
      <div className="mb-6 flex items-center gap-2 justify-center  px-3 py-3 ">
        <img src={trazaLogo} alt="Traza" className="h-6 w-auto object-contain" />
      </div>

      <nav className="space-y-5">
        {groups.map((group) => (
          <section key={group.label} className="space-y-1.5">
            <div className="px-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[color:var(--text-on-dark-muted)]">
                {group.label}
              </p>
            </div>
            {group.links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={onNavigate}
                className={({ isActive }) =>
                  [
                    "group block rounded-[var(--radius-lg)] border px-3 py-3 text-sm transition-all duration-[var(--motion-fast)] ease-[var(--motion-standard)]",
                    isActive
                      ? "border-[color:var(--border-default)] bg-[linear-gradient(135deg,rgba(78,147,183,0.22),rgba(18,43,58,0.92))] text-[color:var(--text-on-dark)] shadow-[var(--shadow-soft)]"
                      : "border-transparent text-[color:var(--text-on-dark-muted)] hover:border-[color:var(--border-shell)] hover:bg-white/5 hover:text-[color:var(--text-on-dark)]",
                  ].join(" ")
                }
              >
                {({ isActive }) => (
                  <div className="flex items-center gap-3">
                    <span
                      className={[
                        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] border transition-all",
                        isActive
                          ? "border-[color:var(--border-default)] bg-white/10 text-[color:var(--accent-secondary)]"
                          : "border-[color:transparent] bg-white/5 text-[color:var(--text-on-dark-muted)] group-hover:border-[color:var(--border-shell)] group-hover:text-[color:var(--text-on-dark)]",
                      ].join(" ")}
                    >
                      {link.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{link.label}</div>
                      {link.description ? (
                        <div className="mt-0.5 truncate text-[11px] text-[color:var(--text-on-dark-muted)]/70">
                          {link.description}
                        </div>
                      ) : null}
                    </div>
                    <span
                      className={[
                        "h-2 w-2 rounded-full transition-all",
                        isActive ? "bg-[color:var(--accent-secondary)]" : "bg-transparent",
                      ].join(" ")}
                    />
                  </div>
                )}
              </NavLink>
            ))}
          </section>
        ))}
      </nav>

      <div className="mt-auto pt-5">
        <div className="rounded-[var(--radius-xl)] border border-[color:var(--border-shell)] bg-[color:var(--surface-shell-raised)] px-3 py-3 shadow-[var(--shadow-soft)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--text-on-dark-muted)]">
            Modo de trabajo
          </p>
          <p className="mt-2 text-sm font-medium text-[color:var(--text-on-dark)]">
            Control operativo
          </p>
          <p className="mt-1 text-xs leading-5 text-[color:var(--text-on-dark-muted)]">
            Navegación estable, módulos claros y tareas visibles para operar sin fricción.
          </p>
        </div>
      </div>
    </aside>
  );
};

export default Aside;
