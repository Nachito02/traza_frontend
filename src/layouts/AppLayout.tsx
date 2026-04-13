import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Topbar from "../components/Topbar";
import { useAuthStore } from "../store/authStore";
import Aside from "../components/Aside";
import CorchoBotLauncher from "../components/CorchoBotLauncher";

const AppLayout = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const showBackButton = location.pathname !== "/dashboard";

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return (
    <div className="min-h-screen bg-[color:var(--surface-soft)]">
      <div className="mx-auto grid w-full max-w-7xl md:grid-cols-[240px_1fr]">
        <Aside className="hidden md:block" />

        <main className="min-w-0">
          <Topbar onOpenMenu={() => setMobileMenuOpen(true)} />
          {showBackButton ? (
            <div className="relative h-0 overflow-visible">
              <button
                type="button"
                onClick={() => {
                  if (window.history.length > 1) {
                    navigate(-1);
                    return;
                  }
                  navigate("/dashboard");
                }}
                className="absolute left-4 top-1 z-10 inline-flex items-center gap-1.5 rounded-[var(--radius-md)] px-2 py-1.5 text-sm font-medium text-[color:var(--accent-primary)] transition hover:bg-[color:var(--surface-accent-soft)]"
                aria-label="Volver"
              >
                <ArrowLeft className="h-4 w-4" strokeWidth={2} />
                <span>Volver</span>
              </button>
            </div>
          ) : null}
          <Outlet />
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
