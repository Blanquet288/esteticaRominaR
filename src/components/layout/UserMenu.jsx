import { useEffect, useRef, useState } from 'react';
import { ChevronDown, LogOut } from 'lucide-react';

export default function UserMenu({ displayName, email, initial, onLogout }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (!menuRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const handleLogout = async () => {
    setOpen(false);
    await onLogout();
  };

  return (
    <div className="user-menu" ref={menuRef}>
      <button
        type="button"
        className="user-menu-trigger"
        onClick={() => setOpen((isOpen) => !isOpen)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Menú de perfil"
      >
        <span className="avatar">{initial}</span>
        <span className="topbar-user-meta">
          <strong>{displayName}</strong>
          <small>Sesión activa</small>
        </span>
        <ChevronDown
          size={16}
          className={`user-menu-caret ${open ? 'is-open' : ''}`}
        />
      </button>

      {open ? (
        <div className="user-menu-dropdown" role="menu">
          <div className="user-menu-identity">
            <span className="avatar">{initial}</span>
            <div>
              <strong>{displayName}</strong>
              <small>{email}</small>
            </div>
          </div>
          <button
            type="button"
            className="user-menu-logout"
            role="menuitem"
            onClick={handleLogout}
          >
            <LogOut size={16} />
            Cerrar sesión
          </button>
        </div>
      ) : null}
    </div>
  );
}
