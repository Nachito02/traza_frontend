import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login/Login";
import ContextSelector from "./pages/ContextSelector/ContextSelector";
import Dashboard from "./pages/Dashboard/Dashboard";
import { useAuthStore } from "./store/authStore";

export default function App() {
  const bootstrap = useAuthStore((state) => state.bootstrap);
  const isLoading = useAuthStore((state) => state.isLoading);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  // if (isLoading) {
  //   return (
  //     <div className="min-h-screen flex items-center justify-center text-[#722F37]">
  //       Cargando sesión…
  //     </div>
  //   );
  // }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/contexto" element={<ContextSelector />} />
      <Route path="/dashboard" element={<Dashboard />} />
      {/* <Route path="*" element={<NotFound />} /> */}
    </Routes>
  );
}
