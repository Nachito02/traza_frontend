import {
  LayoutDashboard,
  Map,
  GitPullRequest,
  Users,
  ListTodo,
  Warehouse,
  ClipboardPenLine,
  Bot,
  ScrollText,
  TrendingUp,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { resolveModuleAccess } from "../lib/permissions";
import trazaLogo from "../assets/traza.png";

type AsideProps = {
  className?: string;
  onNavigate?: () => void;
};

const Aside = ({ className = "", onNavigate }: AsideProps) => {
  const user = useAuthStore((state) => state.user);
  const activeBodegaId = useAuthStore((state) => state.activeBodegaId);
  const access = resolveModuleAccess(user, activeBodegaId);

  const links = [
    { to: "/dashboard", label: "Panel de administracion", icon: <LayoutDashboard /> },
    ...(access.canAccessBodega
      ? [{ to: "/bodega", label: "Bodega", icon: <Warehouse /> }]
      : []),
    { to: "/fincas", label: "Fincas", icon: <Map /> },
    ...(access.canAccessOperacion
      ? [{ to: "/operacion", label: "Operacion", icon: <ClipboardPenLine /> }]
      : []),
    ...(access.canAccessBodega
      ? [{ to: "/progreso", label: "Progreso", icon: <TrendingUp /> }]
      : []),
    { to: "/tareas", label: "Tareas", icon: <ListTodo /> },
    { to: "/usuarios", label: "Usuarios", icon: <Users /> },
    { to: "/integraciones", label: "Bots", icon: <Bot /> },
    ...(access.isAdminSistema
      ? [{ to: "/admin/protocolos", label: "Protocolos", icon: <ScrollText /> }]
      : []),
  ];

  return (
    <aside
      className={`flex h-full flex-col border-r border-[color:var(--border-shell)] bg-[color:var(--surface-shell)] px-4 py-5 text-[color:var(--text-on-dark)] ${className}`}
    >
      <div className="mb-6 flex items-center gap-2 rounded-[var(--radius-xl)] border border-[color:var(--border-shell)] bg-[color:var(--surface-shell-raised)] px-3 py-3 shadow-[var(--shadow-soft)]">
        <img src={trazaLogo} alt="Traza" className="h-8 w-auto object-contain" />
      </div>

      <div className="mb-3 px-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--text-on-dark-muted)]">
          Centro operativo
        </p>
      </div>

      <nav className="space-y-1.5">
        {links.map((link) => (
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
        <div
          title="Próximamente"
          className="mt-2 flex cursor-not-allowed items-center gap-3 rounded-[var(--radius-lg)] border border-dashed border-[color:var(--border-shell)] px-3 py-3 text-sm text-[color:var(--text-on-dark-muted)]/60 select-none"
        >
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-white/5">
            <GitPullRequest />
          </span>
          <div className="min-w-0 flex-1">
            <div className="font-medium">Trazabilidad</div>
            <div className="text-xs text-[color:var(--text-on-dark-muted)]/70">Próximamente</div>
          </div>
        </div>
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
