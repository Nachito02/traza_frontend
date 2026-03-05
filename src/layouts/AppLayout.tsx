import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Topbar from "../components/Topbar";
import { useAuthStore } from "../store/authStore";
import Aside from "../components/Aside";

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
    
    <div className="min-h-screen bg-[#F9F6F2]">
      <div className="mx-auto grid w-full max-w-7xl   md:grid-cols-[240px_1fr]">
        <Aside className="hidden md:block" />

        <main className="min-w-0">
          <Topbar onOpenMenu={() => setMobileMenuOpen(true)} />
          {showBackButton ? (
            <div className="bg-secondary px-6 pt-1 -mb-4">
              <button
                type="button"
                onClick={() => {
                  if (window.history.length > 1) {
                    navigate(-1);
                    return;
                  }
                  navigate("/dashboard");
                }}
                className="inline-flex items-center rounded-md px-3 py-2 text-white transition hover:bg-white/10"
                aria-label="Volver"
              >
                <ArrowLeft className="h-6 w-6" strokeWidth={4} />
              </button>
            </div>
          ) : null}
          <Outlet />
        </main>
      </div>

      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
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
    </div>
  );
};

export default AppLayout;
