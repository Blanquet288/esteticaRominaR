import { useEffect, useState } from 'react';
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
  Sparkles,
  TrendingUp,
  UserCheck,
  Wallet,
  X,
} from 'lucide-react';
import logoRomina from '../../assets/RominaLetras.png';

export const NAV_SECTIONS = [
  {
    id: 'principal',
    label: 'Principal',
    type: 'links',
    items: [{ path: '/', label: 'Dashboard', icon: LayoutDashboard, end: true }],
  },
  {
    id: 'operacion',
    label: 'Operación diaria',
    type: 'links',
    items: [
      { path: '/ventas', label: 'Registrar ventas', icon: Scissors, end: true },
      { path: '/gastos', label: 'Gastos', icon: Wallet },
      { path: '/ventas/historial', label: 'Historial de ventas', icon: History },
    ],
  },
  {
    id: 'finanzas',
    label: 'Finanzas y cierres',
    type: 'accordion',
    items: [
      { path: '/finanzas/rendimiento', label: 'Rendimiento por empleada', icon: TrendingUp },
      { path: '/ahorro', label: 'Fondo de ahorro', icon: PiggyBank },
      { path: '/finanzas/cierre', label: 'Cierre mensual', icon: Calculator },
      { path: '/finanzas/anual', label: 'Métricas y Reporte Anual', icon: BarChart3 },
      { path: '/finanzas/calculadora', label: 'Calculadora de billetes', icon: Banknote },
    ],
  },
  {
    id: 'admin',
    label: 'Administración',
    type: 'accordion',
    items: [
      { path: '/catalogo', label: 'Catálogo de servicios', icon: Sparkles },
      { path: '/empleados', label: 'Empleadas', icon: UserCheck },
      { path: '/configuracion', label: 'Configuración', icon: Settings },
    ],
  },
];

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
  const [openGroups, setOpenGroups] = useState(() => {
    const active = groupForPath(location.pathname);
    return { finanzas: active === 'finanzas', admin: active === 'admin' };
  });

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
        {NAV_SECTIONS.map((section) => {
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
