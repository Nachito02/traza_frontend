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
    { to: "/dashboard", label: "Dashboard", icon: <LayoutDashboard /> },
    { to: "/fincas", label: "Fincas", icon: <Map /> },
    ...(access.canAccessBodega
      ? [{ to: "/bodega", label: "Bodega", icon: <Warehouse /> }]
      : []),
    ...(access.canAccessOperacion
      ? [{ to: "/operacion", label: "Operacion", icon: <ClipboardPenLine /> }]
      : []),
    { to: "/tareas", label: "Tareas", icon: <ListTodo /> },
    { to: "/usuarios", label: "Usuarios", icon: <Users /> },
    { to: "/integraciones", label: "Bots", icon: <Bot /> },
    ...(access.isAdminSistema
      ? [{ to: "/admin/protocolos", label: "Protocolos", icon: <ScrollText /> }]
      : []),
  ];

  return (
    <aside className={`bg-secondary p-4 shadow-sm ${className}`}>
      <div className="mb-4 flex items-center gap-2 rounded-lg bg-dark px-2 py-2">

        <img src={trazaLogo} alt="Traza" className="h-7 w-auto object-contain" />
      </div>
      <nav className="space-y-2">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              ["block rounded-lg px-3 py-2 text-sm transition-colors", isActive ? "bg-primary text-text" : "text-text hover:bg-primary"].join(" ")
            }
          >
            <div className="flex items-center gap-2">{link.icon}{link.label}</div>
          </NavLink>
        ))}
        <div
          title="Próximamente"
          className="flex cursor-not-allowed items-center gap-2 rounded-lg px-3 py-2 text-sm text-text/40 select-none"
        >
          <GitPullRequest />
          Trazabilidad
        </div>
      </nav>
    </aside>
  );
};

export default Aside;
