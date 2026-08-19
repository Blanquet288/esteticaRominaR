import { Navigate } from 'react-router-dom';
import { ShieldOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { NAV_SECTIONS, navItemAllowed } from '../components/layout/Sidebar';
import DashboardPage from '../modules/dashboard/DashboardPage';
import '../components/ui/ModulePlaceholder.css';

export default function HomeRoute() {
  const { hasAnyPermission, hasPermission } = useAuth();

  if (hasPermission('dashboard')) {
    return <DashboardPage />;
  }

  const firstAllowed = NAV_SECTIONS.flatMap((section) => section.items).find(
    (item) => item.path !== '/' && navItemAllowed(item, hasPermission, hasAnyPermission),
  );

  if (firstAllowed) {
    return <Navigate to={firstAllowed.path} replace />;
  }

  return (
    <section className="module-placeholder">
      <div className="placeholder-icon">
        <ShieldOff size={28} />
      </div>
      <h3>Sin módulos asignados</h3>
      <p>Tu cuenta está activa, pero aún no tiene permisos. Pide a la administradora que te asigne un rol.</p>
    </section>
  );
}
