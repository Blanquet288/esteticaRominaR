import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import logoRomina from '../../assets/RominaLetras.png';
import { Menu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Sidebar, { getPageTitle } from './Sidebar';
import UserMenu from './UserMenu';
import './MainLayout.css';

const DESKTOP_QUERY = '(min-width: 961px)';

export default function MainLayout() {
  const { user, profile, logout } = useAuth();
  const location = useLocation();
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia(DESKTOP_QUERY).matches);
  const [sidebarOpen, setSidebarOpen] = useState(() => window.matchMedia(DESKTOP_QUERY).matches);

  const pageTitle = getPageTitle(location.pathname);
  const displayName =
    profile?.nombre || user?.displayName || user?.email?.split('@')[0] || 'Equipo';
  const initial = displayName.charAt(0).toUpperCase();

  useEffect(() => {
    const media = window.matchMedia(DESKTOP_QUERY);
    const onChange = (event) => {
      setIsDesktop(event.matches);
      setSidebarOpen(event.matches);
    };

    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const lockScroll = sidebarOpen && !isDesktop;
    document.body.style.overflow = lockScroll ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [sidebarOpen, isDesktop]);

  const closeSidebar = () => setSidebarOpen(false);
  const toggleSidebar = () => setSidebarOpen((open) => !open);

  const handleNavClick = () => {
    if (!isDesktop) closeSidebar();
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="app-shell">
      {sidebarOpen && !isDesktop ? (
        <button
          type="button"
          className="sidebar-backdrop no-print"
          aria-label="Cerrar menú"
          onClick={closeSidebar}
        />
      ) : null}

      <Sidebar
        open={sidebarOpen}
        collapsed={!sidebarOpen && isDesktop}
        displayName={displayName}
        email={user?.email}
        initial={initial}
        onClose={closeSidebar}
        onNavigate={handleNavClick}
        onLogout={handleLogout}
      />

      <div className="app-content">
        <header className="topbar no-print">
          <button
            type="button"
            className="icon-btn menu-toggle"
            onClick={toggleSidebar}
            aria-label={sidebarOpen ? 'Ocultar menú' : 'Mostrar menú'}
            aria-expanded={sidebarOpen}
          >
            <Menu size={20} />
          </button>

          <Link to="/" className="topbar-logo" aria-label="Ir al dashboard">
            <img src={logoRomina} alt="Estética Romina" />
          </Link>

          <div className="topbar-title">
            <p>Panel de gestión</p>
            <h2>{pageTitle}</h2>
          </div>

          <UserMenu
            displayName={displayName}
            email={user?.email}
            initial={initial}
            onLogout={handleLogout}
          />
        </header>

        <main className="page-area">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
