import {
  LayoutDashboard,
  Map,
  Users,
  ListTodo,
  Warehouse,
  ClipboardPenLine,
  // Bot,
  // ScrollText,
  TrendingUp,
  Settings2,
  QrCode,
  Coins,
} from "lucide-react";
import type { ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { resolveModuleAccess } from "../lib/permissions";
import trazaLogo from "../assets/traza_logo_02.png";

type AsideProps = {
  className?: string;
  onNavigate?: () => void;
};

type NavigationLink = {
  to: string;
  label: string;
  description?: string;
  icon: ReactNode;
  /** Si se define, el link también queda activo cuando la ruta actual empieza con este prefijo */
  matchPrefix?: string;
};

type NavigationGroup = {
  label: string;
  links: NavigationLink[];
};

const Aside = ({ className = "", onNavigate }: AsideProps) => {
  const user = useAuthStore((state) => state.user);
  const activeBodegaId = useAuthStore((state) => state.activeBodegaId);
  const access = resolveModuleAccess(user, activeBodegaId);

  const location = useLocation();
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
                to: "/operacion/campo",
                label: "Registro operativo",
                description: "Campo y elaboración",
                icon: <ClipboardPenLine />,
                matchPrefix: "/operacion/",
              },
            ]
          : access.canAccessOperacionFinca
            ? [
                {
                  to: "/campo",
                  label: "Mis tareas de campo",
                  description: "Registrá avances y finalizá tareas",
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
              {
                to: "/costos",
                label: "Costos",
                description: "Por cuartel y campaña",
                icon: <Coins />,
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
        ...(access.canAccessBodega
          ? [{
              to: "/usuarios",
              label: "Usuarios",
              description: "Roles y permisos",
              icon: <Users />,
            }]
          : []),
        // {
        //   to: "/integraciones",
        //   label: "Bots",
        //   description: "Delegaciones IA",
        //   icon: <Bot />,
        // },
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
        ...(access.canAccessBodega
          ? [
              {
                to: "/admin/qr-cuarteles",
                label: "QR cuarteles",
                description: "Trazabilidad pública",
                icon: <QrCode />,
              },
              {
                to: "/admin/tarifas",
                label: "Tarifas de costos",
                description: "Mano de obra, máquinas, combustible",
                icon: <Coins />,
              },
            ]
          : []),
        // ...(access.isAdminSistema
        //   ? [
        //       {
        //         to: "/admin/protocolos",
        //         label: "Protocolos",
        //         description: "Etapas y procesos",
        //         icon: <ScrollText />,
        //       },
        //     ]
        //   : []),
      ],
    },
  ].filter((group) => group.links.length > 0);

  return (
    <aside
      className={`flex h-full flex-col border-r border-[color:var(--border-shell)] bg-[color:var(--surface-shell)] px-4 py-5 text-[color:var(--text-on-dark)] ${className}`}
    >
      <div className="mb-6 flex items-center justify-center px-3 py-4 border-b border-white/10">
        <img
          src={trazaLogo}
          alt="Traza"
          className="h-14 w-auto object-contain drop-shadow-[0_0_12px_rgba(78,147,183,0.5)]"
        />
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
                className={({ isActive }) => {
                  const active = isActive || (link.matchPrefix ? location.pathname.startsWith(link.matchPrefix) : false);
                  return [
                    "group block rounded-[var(--radius-lg)] border px-3 py-3 text-sm transition-all duration-[var(--motion-fast)] ease-[var(--motion-standard)]",
                    active
                      ? "border-[color:var(--border-default)] border-l-2 border-l-[color:var(--accent-primary)] bg-[linear-gradient(135deg,rgba(78,147,183,0.22),rgba(18,43,58,0.92))] text-[color:var(--text-on-dark)] shadow-[var(--shadow-soft)]"
                      : "border-transparent text-[color:var(--text-on-dark-muted)] hover:border-[color:var(--border-shell)] hover:bg-white/5 hover:text-[color:var(--text-on-dark)]",
                  ].join(" ");
                }}
              >
                {({ isActive }) => {
                  const active = isActive || (link.matchPrefix ? location.pathname.startsWith(link.matchPrefix) : false);
                  return (
                    <div className="flex items-center gap-3">
                      <span
                        className={[
                          "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] border transition-all",
                          active
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
                          active ? "bg-[color:var(--accent-secondary)]" : "bg-transparent",
                        ].join(" ")}
                      />
                    </div>
                  );
                }}
              </NavLink>
            ))}
          </section>
        ))}
      </nav>

      
    </aside>
  );
};

export default Aside;
