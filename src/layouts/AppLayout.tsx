import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import Topbar from "../components/Topbar";
import { useAuthStore } from "../store/authStore";
import Aside from "../components/Aside";

const AppLayout = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // useEffect(() => {
  //   window.requestAnimationFrame(() => {
  //     window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  //   });
  // }, [location.pathname, location.search]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return (
    <div className="min-h-screen bg-[color:var(--app-bg)] text-[color:var(--text-on-dark)]">
      <div className="grid min-h-screen w-full grid-cols-1 md:grid-cols-[280px_1fr]">
        <Aside className="hidden md:block" />

        <main className="min-w-0 w-full bg-[color:var(--app-bg)]">
          <Topbar onOpenMenu={() => setMobileMenuOpen(true)} />
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

      {/* <CorchoBotLauncher /> */}
    </div>
  );
};

export default AppLayout;
