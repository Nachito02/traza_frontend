import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import Topbar from "../components/Topbar";
import { useAuthStore } from "../store/authStore";
import Aside from "../components/Aside";
import CorchoBotLauncher from "../components/CorchoBotLauncher";

const AppLayout = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return (
    <div className="min-h-screen bg-[color:var(--app-bg)] text-[color:var(--text-on-dark)]">
      <div className="grid min-h-screen w-full md:grid-cols-[280px_1fr]">
        <Aside className="hidden md:block" />

        <main className="min-w-0 bg-[color:var(--app-bg)]">
          <Topbar onOpenMenu={() => setMobileMenuOpen(true)} />
          <div className="px-4 pb-8 pt-4 md:px-6 md:pb-10 md:pt-5 xl:px-8">
            <Outlet />
          </div>
        </main>
      </div>

      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-[color:var(--surface-overlay)] md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <div
        className={[
          "fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-200 md:hidden",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <Aside className="h-full" onNavigate={() => setMobileMenuOpen(false)} />
      </div>

      <CorchoBotLauncher />
    </div>
  );
};

export default AppLayout;
