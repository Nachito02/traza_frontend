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
import ChangePassword from "./pages/Login/ChangePassword";
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
import TrazabilidadesActivas from "./pages/Trazabilidad/TrazabilidadesActivas";
import FincaDetail from "./pages/Fincas/FincaDetail";
import Fincas from "./pages/Fincas/Fincas";
import Usuarios from "./pages/Usuarios/Usuarios";
import Integraciones from "./pages/Integraciones/Integraciones";
import Tareas from "./pages/Tareas/Tareas";
import RecepcionPage from "./pages/Elaboracion/RecepcionPage";
import CiuQcPage from "./pages/Elaboracion/CiuQcPage";
import VasijasProcesoPage from "./pages/Elaboracion/VasijasProcesoPage";
import CortesProductoPage from "./pages/Elaboracion/CortesProductoPage";
import FraccionamientoDespachoPage from "./pages/Elaboracion/FraccionamientoDespachoPage";
import QrInversaPage from "./pages/Elaboracion/QrInversaPage";
import FincasAdmin from "./pages/Admin/FincasAdmin";
import CuartelesAdmin from "./pages/Admin/CuartelesAdmin";
import CampaniasAdmin from "./pages/Admin/CampaniasAdmin";
import BodegaHome from "./pages/Bodega/BodegaHome";
import BodegaVasijasPage from "./pages/Bodega/BodegaVasijasPage";
import OperacionLayout from "./pages/Operacion/OperacionLayout";
import { resolveModuleAccess } from "./lib/permissions";

function LegacyElaboracionRedirect() {
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const activeBodegaId = useAuthStore((state) => state.activeBodegaId);
  const access = resolveModuleAccess(user, activeBodegaId);
  const canUseOperacionBodega = access.canAccessOperacionBodega;
  if (!canUseOperacionBodega) {
    return <Navigate to="/operacion/tareas" replace />;
  }
  const targetPath = location.pathname.replace(/^\/elaboracion/, "/operacion");
  return <Navigate to={`${targetPath}${location.search}${location.hash}`} replace />;
}

export default function App() {
  const bootstrap = useAuthStore((state) => state.bootstrap);
  const isLoading = useAuthStore((state) => state.isLoading);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const bodegas = useAuthStore((state) => state.bodegas);
  const activeBodegaId = useAuthStore((state) => state.activeBodegaId);
  const setActiveBodega = useAuthStore((state) => state.setActiveBodega);
  const navigate = useNavigate();
  const location = useLocation();
  const access = resolveModuleAccess(user, activeBodegaId);
  const canUseOperacionBodega = access.canAccessOperacionBodega;

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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[#722F37]">
        Cargando sesión…
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/registro" element={<Register />} />
      <Route path="/cambiar-password" element={<ChangePassword />} />
      <Route element={<AppLayout />}>
        <Route path="/contexto" element={<ContextSelector />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/fincas" element={<Fincas />} />
        <Route path="/admin/fincas" element={<FincasAdmin />} />
        <Route path="/admin/cuarteles" element={<CuartelesAdmin />} />
        <Route path="/admin/campanias" element={<CampaniasAdmin />} />
        <Route path="/bodega" element={access.canAccessBodega ? <BodegaHome /> : <Navigate to="/fincas" replace />} />
        <Route path="/bodega/vasijas" element={access.canAccessBodega ? <BodegaVasijasPage /> : <Navigate to="/fincas" replace />} />
        <Route path="/bodega/recepcion" element={canUseOperacionBodega ? <Navigate to="/operacion/recepcion" replace /> : <Navigate to="/fincas" replace />} />
        <Route path="/bodega/ciu-qc" element={canUseOperacionBodega ? <Navigate to="/operacion/ciu-qc" replace /> : <Navigate to="/fincas" replace />} />
        <Route path="/bodega/vasijas-proceso" element={canUseOperacionBodega ? <Navigate to="/operacion/vasijas" replace /> : <Navigate to="/fincas" replace />} />
        <Route path="/bodega/cortes" element={canUseOperacionBodega ? <Navigate to="/operacion/cortes" replace /> : <Navigate to="/fincas" replace />} />
        <Route path="/bodega/fraccionamiento" element={canUseOperacionBodega ? <Navigate to="/operacion/fraccionamiento" replace /> : <Navigate to="/fincas" replace />} />
        <Route path="/bodega/qr" element={canUseOperacionBodega ? <Navigate to="/operacion/qr" replace /> : <Navigate to="/fincas" replace />} />
        <Route
          path="/operacion"
          element={
            access.canAccessOperacion
              ? <Navigate to="/operacion/tareas" replace />
              : <Navigate to="/fincas" replace />
          }
        />
        <Route path="/operacion" element={access.canAccessOperacion ? <OperacionLayout /> : <Navigate to="/fincas" replace />}>
          <Route path="tareas" element={<Tareas mode="manager" />} />
          <Route path="recepcion" element={canUseOperacionBodega ? <RecepcionPage /> : <Navigate to="/operacion/tareas" replace />} />
          <Route path="ciu-qc" element={canUseOperacionBodega ? <CiuQcPage /> : <Navigate to="/operacion/tareas" replace />} />
          <Route path="vasijas" element={canUseOperacionBodega ? <VasijasProcesoPage /> : <Navigate to="/operacion/tareas" replace />} />
          <Route path="cortes" element={canUseOperacionBodega ? <CortesProductoPage /> : <Navigate to="/operacion/tareas" replace />} />
          <Route path="fraccionamiento" element={canUseOperacionBodega ? <FraccionamientoDespachoPage /> : <Navigate to="/operacion/tareas" replace />} />
          <Route path="qr" element={canUseOperacionBodega ? <QrInversaPage /> : <Navigate to="/operacion/tareas" replace />} />
        </Route>
        <Route path="/elaboracion" element={canUseOperacionBodega ? <Navigate to="/operacion/recepcion" replace /> : <Navigate to="/fincas" replace />} />
        <Route path="/elaboracion/*" element={<LegacyElaboracionRedirect />} />
        <Route path="/tareas" element={<Tareas mode="operator" />} />
        <Route path="/usuarios" element={<Usuarios />} />
        <Route path="/integraciones" element={<Integraciones />} />
        <Route path="/fincas/:id" element={<FincaDetail />} />
        <Route path="/setup" element={<SetupHome />} />
        <Route path="/setup/finca" element={<SetupFinca />} />
        <Route path="/setup/campania" element={<SetupCampania />} />
        <Route path="/setup/cuarteles" element={<SetupCuarteles />} />
        <Route path="/setup/protocolos" element={<SetupProtocolos />} />
        <Route path="/trazabilidades" element={<TrazabilidadesActivas />} />
        <Route path="/trazabilidades/:id/plan" element={<MilestonesPlan />} />
      </Route>
      {/* <Route path="*" element={<NotFound />} /> */}
    </Routes>
  );
}
