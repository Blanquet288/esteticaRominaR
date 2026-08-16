import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import LoginPage from '../modules/auth/LoginPage';
import DashboardPage from '../modules/dashboard/DashboardPage';
import VentasPage from '../modules/ventas/VentasPage';
import HistorialVentasPage from '../modules/ventas/HistorialVentasPage';
import GastosPage from '../modules/gastos/GastosPage';
import CatalogoPage from '../modules/catalogo/CatalogoPage';
import EmpleadosPage from '../modules/empleados/EmpleadosPage';
import AhorroPage from '../modules/ahorro/AhorroPage';
import CierreMensualPage from '../modules/finanzas/CierreMensualPage';
import CalculadoraBilletesPage from '../modules/finanzas/CalculadoraBilletesPage';
import RendimientoPage from '../modules/finanzas/RendimientoPage';
import ReporteAnualPage from '../modules/finanzas/ReporteAnualPage';
import ConfiguracionPage from '../modules/configuracion/ConfiguracionPage';
import ProtectedRoute from './ProtectedRoute';
import PublicRoute from './PublicRoute';

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/ventas" element={<VentasPage />} />
            <Route path="/ventas/historial" element={<HistorialVentasPage />} />
            <Route path="/gastos" element={<GastosPage />} />
            <Route path="/catalogo" element={<CatalogoPage />} />
            <Route path="/empleados" element={<EmpleadosPage />} />
            <Route path="/ahorro" element={<AhorroPage />} />
            <Route path="/finanzas/rendimiento" element={<RendimientoPage />} />
            <Route path="/finanzas/cierre" element={<CierreMensualPage />} />
            <Route path="/finanzas/anual" element={<ReporteAnualPage />} />
            <Route path="/finanzas/metricas" element={<Navigate to="/finanzas/anual" replace />} />
            <Route path="/finanzas/calculadora" element={<CalculadoraBilletesPage />} />
            <Route path="/cierre-mensual" element={<Navigate to="/finanzas/cierre" replace />} />
            <Route path="/configuracion" element={<ConfiguracionPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
