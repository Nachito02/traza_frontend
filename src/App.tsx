import { useEffect } from "react";
import {
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import Login from "./pages/Login/Login";
import Register from "./pages/Login/Register";
import ContextSelector from "./pages/ContextSelector/ContextSelector";
import Dashboard from "./pages/Dashboard/Dashboard";
import { useAuthStore } from "./store/authStore";
import AppLayout from "./layouts/AppLayout";
import SetupHome from "./pages/Setup/SetupHome";
import SetupFinca from "./pages/Setup/SetupFinca";
import SetupCampania from "./pages/Setup/SetupCampania";
import SetupCuarteles from "./pages/Setup/SetupCuarteles";
import SetupProtocolos from "./pages/Setup/SetupProtocolos";
import MilestonesPlan from "./pages/Trazabilidad/MilestonesPlan";
import NuevaTrazabilidadProducto from "./pages/Trazabilidad/NuevaTrazabilidadProducto";
import TrazabilidadesActivas from "./pages/Trazabilidad/TrazabilidadesActivas";
import FincaDetail from "./pages/Fincas/FincaDetail";
import Fincas from "./pages/Fincas/Fincas";
import Usuarios from "./pages/Usuarios/Usuarios";
import Tareas from "./pages/Tareas/Tareas";

export default function App() {
  const bootstrap = useAuthStore((state) => state.bootstrap);
  const isLoading = useAuthStore((state) => state.isLoading);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const bodegas = useAuthStore((state) => state.bodegas);
  const activeBodegaId = useAuthStore((state) => state.activeBodegaId);
  const setActiveBodega = useAuthStore((state) => state.setActiveBodega);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (!isAuthenticated || isLoading) return;
    if (bodegas.length === 1 && !activeBodegaId) {
      setActiveBodega(bodegas[0].bodega_id);
      if (location.pathname !== "/dashboard") {
        navigate("/dashboard", { replace: true });
      }
      return;
    }

    if (bodegas.length > 1 && !activeBodegaId) {
      if (location.pathname !== "/contexto") {
        navigate("/contexto", { replace: true });
      }
    }
  }, [
    activeBodegaId,
    bodegas,
    isAuthenticated,
    isLoading,
    location.pathname,
    navigate,
    setActiveBodega,
  ]);

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
      <Route path="/registro" element={<Register />} />
      <Route element={<AppLayout />}>
        <Route path="/contexto" element={<ContextSelector />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/fincas" element={<Fincas />} />
        <Route path="/tareas" element={<Tareas />} />
        <Route path="/usuarios" element={<Usuarios />} />
        <Route path="/fincas/:id" element={<FincaDetail />} />
        <Route path="/setup" element={<SetupHome />} />
        <Route path="/setup/finca" element={<SetupFinca />} />
        <Route path="/setup/campania" element={<SetupCampania />} />
        <Route path="/setup/cuarteles" element={<SetupCuarteles />} />
        <Route path="/setup/protocolos" element={<SetupProtocolos />} />
        <Route path="/productos" element={<TrazabilidadesActivas />} />
        <Route path="/productos/nuevo" element={<NuevaTrazabilidadProducto />} />
        <Route path="/productos/:id/plan" element={<MilestonesPlan />} />
        <Route path="/trazabilidades" element={<Navigate to="/productos" replace />} />
        <Route path="/trazabilidades/nueva" element={<Navigate to="/productos/nuevo" replace />} />
        <Route path="/trazabilidades/:id/plan" element={<MilestonesPlan />} />
      </Route>
      {/* <Route path="*" element={<NotFound />} /> */}
    </Routes>
  );
}
