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
    <aside className={`bg-[color:var(--surface-base)] p-4 text-[color:var(--text-on-dark)] shadow-sm ${className}`}>
      <div className="mb-4 flex items-center gap-2 rounded-lg bg-[color:var(--surface-hero)] px-2 py-2">

        <img src={trazaLogo} alt="Traza" className="h-7 w-auto object-contain" />
      </div>
      <nav className="space-y-2">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              [
                "block rounded-lg px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-[color:var(--accent-primary)] text-[color:var(--text-primary)]"
                  : "text-[color:var(--text-on-dark)] hover:bg-white/10",
              ].join(" ")
            }
          >
            <div className="flex items-center gap-2">{link.icon}{link.label}</div>
          </NavLink>
        ))}
        <div
          title="Próximamente"
          className="flex cursor-not-allowed items-center gap-2 rounded-lg px-3 py-2 text-sm text-[color:var(--text-on-dark-muted)]/50 select-none"
        >
          <GitPullRequest />
          Trazabilidad
        </div>
      </nav>
    </aside>
  );
};

export default Aside;
