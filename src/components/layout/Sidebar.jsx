import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  Banknote,
  BarChart3,
  Calculator,
  ChevronDown,
  History,
  LayoutDashboard,
  LogOut,
  PiggyBank,
  Scissors,
  Settings,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserCheck,
  Wallet,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import logoRomina from '../../assets/RominaLetras.png';

export const NAV_SECTIONS = [
  {
    id: 'principal',
    label: 'Principal',
    type: 'links',
    items: [
      {
        path: '/',
        label: 'Dashboard',
        icon: LayoutDashboard,
        end: true,
        permission: 'dashboard',
      },
    ],
  },
  {
    id: 'operacion',
    label: 'Operación diaria',
    type: 'links',
    items: [
      {
        path: '/ventas',
        label: 'Registrar ventas',
        icon: Scissors,
        end: true,
        permission: 'ventas',
      },
      { path: '/gastos', label: 'Gastos', icon: Wallet, permission: 'gastos' },
      {
        path: '/ventas/historial',
        label: 'Historial de ventas',
        icon: History,
        permission: 'historial_ventas',
      },
    ],
  },
  {
    id: 'finanzas',
    label: 'Finanzas y cierres',
    type: 'accordion',
    items: [
      {
        path: '/finanzas/rendimiento',
        label: 'Rendimiento por personal',
        icon: TrendingUp,
        module: 'finanzas',
        permission: 'finanzas_rendimiento',
      },
      {
        path: '/ahorro',
        label: 'Fondo de ahorro',
        icon: PiggyBank,
        module: 'finanzas',
        permission: 'finanzas_ahorro_movs',
      },
      {
        path: '/finanzas/cierre',
        label: 'Cierre mensual',
        icon: Calculator,
        module: 'finanzas',
        permission: 'finanzas_cierre_mensual',
      },
      {
        path: '/finanzas/anual',
        label: 'Métricas y Reporte Anual',
        icon: BarChart3,
        module: 'finanzas',
        permission: 'finanzas_reporte_anual',
      },
      {
        path: '/finanzas/calculadora',
        label: 'Calculadora de billetes',
        icon: Banknote,
        module: 'finanzas',
        permission: 'finanzas_cierre_mensual',
      },
    ],
  },
  {
    id: 'admin',
    label: 'Administración',
    type: 'accordion',
    items: [
      { path: '/catalogo', label: 'Catálogo de servicios', icon: Sparkles, permission: 'catalogo' },
      { path: '/empleados', label: 'Empleadas', icon: UserCheck, permission: 'empleados' },
      { path: '/configuracion', label: 'Configuración', icon: Settings, permission: 'configuracion' },
      {
        path: '/admin/usuarios',
        label: 'Usuarios y roles',
        icon: ShieldCheck,
        permission: 'usuarios_roles',
      },
    ],
  },
];

export function navItemAllowed(item, hasPermission, hasAnyPermission) {
  if (item.module && !hasPermission(item.module)) return false;
  if (item.anyOf?.length) return hasAnyPermission(item.anyOf);
  if (item.permission) return hasPermission(item.permission);
  return true;
}

const ALL_NAV_ITEMS = NAV_SECTIONS.flatMap((section) => section.items);

export function getPageTitle(pathname) {
  const exact = ALL_NAV_ITEMS.find((item) => item.path === pathname);
  if (exact) return exact.label;
  const nested = ALL_NAV_ITEMS
    .filter((item) => item.path !== '/' && pathname.startsWith(item.path))
    .sort((a, b) => b.path.length - a.path.length)[0];
  return nested?.label || 'Dashboard';
}

function groupForPath(pathname) {
  return (
    NAV_SECTIONS.find(
      (section) =>
        section.type === 'accordion' &&
        section.items.some((item) => pathname === item.path || pathname.startsWith(`${item.path}/`)),
    )?.id || null
  );
}

function NavItem({ item, onNavigate }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.path}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) => `nav-link ${isActive ? 'is-active' : ''}`}
    >
      <Icon size={18} />
      <span>{item.label}</span>
    </NavLink>
  );
}

export default function Sidebar({
  open,
  collapsed,
  displayName,
  email,
  initial,
  onClose,
  onNavigate,
  onLogout,
}) {
  const location = useLocation();
  const { hasPermission, hasAnyPermission } = useAuth();
  const [openGroups, setOpenGroups] = useState(() => {
    const active = groupForPath(location.pathname);
    return { finanzas: active === 'finanzas', admin: active === 'admin' };
  });

  const visibleSections = useMemo(
    () =>
      NAV_SECTIONS.map((section) => ({
        ...section,
        items: section.items.filter((item) =>
          navItemAllowed(item, hasPermission, hasAnyPermission),
        ),
      })).filter((section) => section.items.length > 0),
    [hasPermission, hasAnyPermission],
  );

  useEffect(() => {
    const active = groupForPath(location.pathname);
    if (!active) return;
    setOpenGroups((current) => (current[active] ? current : { ...current, [active]: true }));
  }, [location.pathname]);

  const toggleGroup = (id) => {
    setOpenGroups((current) => ({ ...current, [id]: !current[id] }));
  };

  const sidebarClass = ['sidebar', 'no-print', open ? 'is-open' : '', collapsed ? 'is-collapsed' : '']
    .filter(Boolean)
    .join(' ');

  return (
    <aside className={sidebarClass}>
      <div className="sidebar-brand">
        <Link to="/" className="sidebar-brand-link" onClick={onNavigate} aria-label="Ir al dashboard">
          <img src={logoRomina} alt="Estética Romina" className="sidebar-logo" />
        </Link>
        <button type="button" className="icon-btn sidebar-close" onClick={onClose} aria-label="Cerrar menú">
          <X size={18} />
        </button>
      </div>

      <nav className="sidebar-nav" aria-label="Principal">
        {visibleSections.map((section) => {
          const isAccordion = section.type === 'accordion';
          const isOpen = !isAccordion || Boolean(openGroups[section.id]);

          return (
            <div key={section.id} className="nav-group">
              {isAccordion ? (
                <button
                  type="button"
                  className="nav-group-toggle"
                  onClick={() => toggleGroup(section.id)}
                  aria-expanded={isOpen}
                >
                  <span>{section.label}</span>
                  <ChevronDown
                    size={14}
                    className={`nav-chevron ${isOpen ? 'is-open' : ''}`}
                  />
                </button>
              ) : (
                <p className="nav-group-label">{section.label}</p>
              )}

              <div className={`nav-sub ${isOpen ? 'is-open' : ''}`}>
                <div className="nav-sub-inner">
                  {section.items.map((item) => (
                    <NavItem key={item.path} item={item} onNavigate={onNavigate} />
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <span className="avatar">{initial}</span>
          <div className="sidebar-user-meta">
            <strong>{displayName}</strong>
            <small>{email}</small>
          </div>
        </div>
        <button type="button" className="logout-btn" onClick={onLogout}>
          <LogOut size={16} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
