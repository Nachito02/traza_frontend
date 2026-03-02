import { LayoutDashboard, Map, GitPullRequest, Users, Boxes, ListTodo } from "lucide-react";
import { NavLink } from "react-router-dom";

type AsideProps = {
  className?: string;
  onNavigate?: () => void;
};

const Aside = ({ className = "", onNavigate }: AsideProps) => {
  const links = [
    { to: "/dashboard", label: "Dashboard", icon: <LayoutDashboard /> },
    { to: "/fincas", label: "Fincas", icon: <Map /> },
    { to: "/productos", label: "Productos", icon: <Boxes /> },
    { to: "/tareas", label: "Tareas", icon: <ListTodo /> },
    { to: "/usuarios", label: "Usuarios", icon: <Users /> },
    { to: "/setup", label: "Trazabilidad", icon: <GitPullRequest /> },
  ];

  return (
    <aside className={`bg-secondary p-4 shadow-sm ${className}`}>
      <h2 className="mb-4 text-sm font-bold text-center text-text">Menú</h2>
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
