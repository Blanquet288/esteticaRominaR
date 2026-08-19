import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import LoginPage from '../modules/auth/LoginPage';
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
import UsuariosRolesPage from '../modules/admin/UsuariosRolesPage';
import ProtectedRoute from './ProtectedRoute';
import PublicRoute from './PublicRoute';
import RoleProtectedRoute from './RoleProtectedRoute';
import HomeRoute from './HomeRoute';

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/" element={<HomeRoute />} />

            <Route element={<RoleProtectedRoute permission="ventas" />}>
              <Route path="/ventas" element={<VentasPage />} />
            </Route>
            <Route element={<RoleProtectedRoute permission="historial_ventas" />}>
              <Route path="/ventas/historial" element={<HistorialVentasPage />} />
            </Route>
            <Route element={<RoleProtectedRoute permission="gastos" />}>
              <Route path="/gastos" element={<GastosPage />} />
            </Route>
            <Route element={<RoleProtectedRoute permission="catalogo" />}>
              <Route path="/catalogo" element={<CatalogoPage />} />
            </Route>
            <Route element={<RoleProtectedRoute permission="empleados" />}>
              <Route path="/empleados" element={<EmpleadosPage />} />
            </Route>
            <Route element={<RoleProtectedRoute allOf={['finanzas', 'finanzas_ahorro_movs']} />}>
              <Route path="/ahorro" element={<AhorroPage />} />
            </Route>
            <Route element={<RoleProtectedRoute allOf={['finanzas', 'finanzas_rendimiento']} />}>
              <Route path="/finanzas/rendimiento" element={<RendimientoPage />} />
            </Route>
            <Route element={<RoleProtectedRoute allOf={['finanzas', 'finanzas_cierre_mensual']} />}>
              <Route path="/finanzas/cierre" element={<CierreMensualPage />} />
              <Route path="/finanzas/calculadora" element={<CalculadoraBilletesPage />} />
              <Route path="/cierre-mensual" element={<Navigate to="/finanzas/cierre" replace />} />
            </Route>
            <Route element={<RoleProtectedRoute allOf={['finanzas', 'finanzas_reporte_anual']} />}>
              <Route path="/finanzas/anual" element={<ReporteAnualPage />} />
              <Route path="/finanzas/metricas" element={<Navigate to="/finanzas/anual" replace />} />
            </Route>
            <Route element={<RoleProtectedRoute permission="configuracion" />}>
              <Route path="/configuracion" element={<ConfiguracionPage />} />
            </Route>
            <Route element={<RoleProtectedRoute permission="usuarios_roles" />}>
              <Route path="/admin/usuarios" element={<UsuariosRolesPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
