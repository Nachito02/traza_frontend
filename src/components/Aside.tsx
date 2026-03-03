import {
  LayoutDashboard,
  Map,
  GitPullRequest,
  Users,
  Boxes,
  ListTodo,
  FlaskConical,
  Grape,
} from "lucide-react";
import { NavLink } from "react-router-dom";

type AsideProps = {
  className?: string;
  onNavigate?: () => void;
};

const Aside = ({ className = "", onNavigate }: AsideProps) => {
  const links = [
    { to: "/dashboard", label: "Dashboard", icon: <LayoutDashboard /> },
    { to: "/fincas", label: "Fincas", icon: <Map /> },
    { to: "/elaboracion", label: "Elaboracion", icon: <FlaskConical /> },
    { to: "/productos", label: "Productos", icon: <Boxes /> },
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
