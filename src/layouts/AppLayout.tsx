import { Navigate, Outlet } from "react-router-dom";
import Topbar from "../components/Topbar";
import { useAuthStore } from "../store/authStore";
import Aside from "../components/Aside";

const AppLayout = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-[#F9F6F2]">
      <div className="mx-auto grid w-full max-w-7xl   md:grid-cols-[240px_1fr]">
        <Aside />

        <main className="min-w-0">
          <Topbar />
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
