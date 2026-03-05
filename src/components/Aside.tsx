import {
  LayoutDashboard,
  Map,
  LayoutGrid,
  GitPullRequest,
  Users,
  ListTodo,
  Warehouse,
  ClipboardPenLine,
  Grape,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { resolveModuleAccess } from "../lib/permissions";

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
    { to: "/admin/cuarteles", label: "Cuarteles", icon: <LayoutGrid /> },
    ...(access.canAccessBodega
      ? [{ to: "/bodega", label: "Bodega", icon: <Warehouse /> }]
      : []),
    ...(access.canAccessOperacion
      ? [{ to: "/operacion", label: "Operacion", icon: <ClipboardPenLine /> }]
      : []),
    { to: "/tareas", label: "Tareas", icon: <ListTodo /> },
    { to: "/usuarios", label: "Usuarios", icon: <Users /> },
    { to: "/setup", label: "Trazabilidad", icon: <GitPullRequest /> },
  ];

  return (
    <aside className={`bg-secondary p-4 shadow-sm ${className}`}>
      <div className="mb-4 flex items-center gap-2 rounded-lg bg-[#3D1B1F] px-2 py-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#C9A961] text-[#3D1B1F]">
          <Grape size={16} />
        </div>
        <div className="text-sm font-bold uppercase tracking-wide text-[#FFF9F0]">
          Traza
        </div>
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
      </nav>
    </aside>
  );
};

export default Aside;
