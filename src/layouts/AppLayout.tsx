import { Outlet, useNavigate } from "react-router-dom";
import Topbar from "../components/Topbar";
import { useAuthStore } from "../store/authStore";

const AppLayout = () => {

  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if(!isAuthenticated) {
    return navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen">
      {isAuthenticated && <Topbar />}
      <main className={isAuthenticated ? "pt-4" : ""}>
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
