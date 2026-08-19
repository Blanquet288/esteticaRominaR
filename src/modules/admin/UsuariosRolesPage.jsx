import { useEffect } from 'react';
import { KeyRound, Plus, ShieldCheck, Star, Users, X } from 'lucide-react';
import useUsuariosRoles from './useUsuariosRoles';
import './UsuariosRolesPage.css';

function Toast({ message, onClose }) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, 3600);
    return () => window.clearTimeout(timer);
  }, [message, onClose]);

  return (
    <div className="rbac-toast" role="status">
      {message}
    </div>
  );
}

function collectKeys(items = []) {
  return items.flatMap((item) => [item.key, ...collectKeys(item.children)]);
}

function PermissionItem({ item, values, parentEnabled, onToggle }) {
  const checked = parentEnabled && values?.[item.key] === true;
  const nested = item.children || [];

  return (
    <div className={`rbac-check-wrap ${nested.length ? 'has-nested' : ''}`}>
      <label className={`rbac-check ${parentEnabled ? '' : 'is-disabled'}`}>
        <input
          type="checkbox"
          disabled={!parentEnabled}
          checked={checked}
          onChange={(event) => onToggle(item, event.target.checked)}
        />
        <span>{item.label}</span>
      </label>
      {nested.length ? (
        <div className="rbac-nested" hidden={!checked}>
          {nested.map((child) => (
            <PermissionItem
              key={child.key}
              item={child}
              values={values}
              parentEnabled={checked}
              onToggle={onToggle}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ModuleBlock({ modulo, values, onToggleMaster, onToggleChild, onToggleAll }) {
  const enabled = values?.[modulo.key] === true;
  const children = modulo.children || [];
  const descendantKeys = collectKeys(children);
  const allOn = descendantKeys.length > 0 && descendantKeys.every((key) => values?.[key] === true);

  return (
    <section className={`rbac-module ${enabled ? 'is-on' : 'is-off'}`}>
      <div className="rbac-module-head">
        <div>
          <h4>{modulo.label}</h4>
          <p>{enabled ? 'Acceso al módulo activo' : 'Sin acceso a este módulo'}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label={`Acceso a ${modulo.label}`}
          className={`rbac-switch ${enabled ? 'is-on' : ''}`}
          onClick={() => onToggleMaster(modulo, !enabled)}
        >
          <span className="rbac-switch-knob" />
        </button>
      </div>

      {children.length ? (
        <div className={`rbac-module-body ${enabled ? 'is-open' : ''}`} hidden={!enabled}>
          <div className="rbac-module-tools">
            <button
              type="button"
              className="rbac-module-all"
              onClick={() => onToggleAll(modulo, !allOn)}
            >
              {allOn ? 'Desmarcar todos' : 'Marcar todos'}
            </button>
          </div>
          <div className="rbac-checks">
            {children.map((item) => (
              <PermissionItem
                key={item.key}
                item={item}
                values={values}
                parentEnabled={enabled}
                onToggle={onToggleChild}
              />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default function UsuariosRolesPage() {
  const rbac = useUsuariosRoles();
  const { modal, closeModal } = rbac;

  useEffect(() => {
    if (!modal) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') closeModal();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [modal, closeModal]);

  return (
    <div className="rbac-page">
      <header className="rbac-hero">
        <div>
          <p className="rbac-kicker">Administración</p>
          <h2>Usuarios y roles</h2>
          <p>Controla quién entra al panel y qué módulos puede ver o usar.</p>
        </div>
        {rbac.tab === 'usuarios' ? (
          <button type="button" className="rbac-add is-header" onClick={rbac.openCreateUser}>
            <Plus size={16} />
            Crear usuario
          </button>
        ) : (
          <button type="button" className="rbac-add is-header" onClick={rbac.openCreateRol}>
            <Plus size={16} />
            Crear nuevo rol
          </button>
        )}
      </header>

      <div className="rbac-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={rbac.tab === 'usuarios'}
          className={rbac.tab === 'usuarios' ? 'is-active' : ''}
          onClick={() => rbac.setTab('usuarios')}
        >
          <Users size={15} />
          <span className="rbac-tab-label">
            <span className="is-short">Usuarios</span>
            <span className="is-full">Usuarios del sistema</span>
          </span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={rbac.tab === 'roles'}
          className={rbac.tab === 'roles' ? 'is-active' : ''}
          onClick={() => rbac.setTab('roles')}
        >
          <ShieldCheck size={15} />
          <span className="rbac-tab-label">
            <span className="is-short">Roles</span>
            <span className="is-full">Roles y permisos</span>
          </span>
        </button>
      </div>

      {rbac.tab === 'usuarios' ? (
        <button type="button" className="rbac-add is-inline" onClick={rbac.openCreateUser}>
          <Plus size={16} />
          Crear usuario
        </button>
      ) : (
        <button type="button" className="rbac-add is-inline" onClick={rbac.openCreateRol}>
          <Plus size={16} />
          Crear nuevo rol
        </button>
      )}

      {rbac.error && !rbac.modal ? <p className="rbac-error">{rbac.error}</p> : null}

      {rbac.loading ? (
        <div className="rbac-empty">Cargando acceso…</div>
      ) : rbac.tab === 'usuarios' ? (
        <UsuariosTab rbac={rbac} />
      ) : (
        <RolesTab rbac={rbac} />
      )}

      {rbac.modal === 'rol-create' || rbac.modal === 'rol-edit' ? (
        <RoleModal rbac={rbac} onClose={closeModal} />
      ) : null}

      {rbac.modal === 'user-create' ? (
        <UserModal rbac={rbac} onClose={closeModal} />
      ) : null}

      {rbac.toast ? <Toast message={rbac.toast} onClose={() => rbac.setToast('')} /> : null}
    </div>
  );
}

function RoleModal({ rbac, onClose }) {
  const isEdit = rbac.modal === 'rol-edit';
  const values = isEdit ? rbac.editingRol?.permisos : rbac.form.permisos;

  return (
    <div className="rbac-overlay" onClick={onClose} role="presentation">
      <div
        className="rbac-modal is-wide"
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="rbac-close" onClick={onClose} aria-label="Cerrar">
          <X size={18} />
        </button>
        <p className="rbac-kicker">{isEdit ? 'Permisos del rol' : 'Nuevo rol'}</p>
        <h3>{isEdit ? rbac.editingRol?.nombre || 'Editar permisos' : 'Crear rol'}</h3>
        <p>
          {isEdit
            ? 'Enciende el acceso a cada módulo y luego marca las acciones internas. Los cambios se guardan al instante.'
            : 'Define un nombre, enciende los módulos y marca qué acciones podrá usar.'}
        </p>

        {rbac.error ? <p className="rbac-error">{rbac.error}</p> : null}

        {isEdit ? (
          rbac.editingRol?.id === 'admin' ? (
            <p className="rbac-role-note">
              El rol admin siempre tiene acceso completo, aunque desactives un módulo aquí.
            </p>
          ) : null
        ) : (
          <>
            <label className="rbac-field">
              Nombre
              <input
                type="text"
                value={rbac.form.nombre}
                onChange={(event) => rbac.updateForm('nombre', event.target.value)}
                placeholder="Supervisora"
                required
              />
            </label>
            <label className="rbac-field">
              Descripción
              <input
                type="text"
                value={rbac.form.descripcion}
                onChange={(event) => rbac.updateForm('descripcion', event.target.value)}
                placeholder="Acceso a operación diaria"
              />
            </label>
          </>
        )}

        {rbac.permisosModulos.map((modulo) => (
          <ModuleBlock
            key={modulo.key}
            modulo={modulo}
            values={values}
            onToggleMaster={(mod, enabled) => {
              if (isEdit && rbac.editingRol) rbac.setModulo(rbac.editingRol.id, mod, enabled);
              else rbac.setFormModulo(mod, enabled);
            }}
            onToggleChild={(item, checked) => {
              if (isEdit && rbac.editingRol) rbac.togglePermiso(rbac.editingRol.id, item, checked);
              else rbac.toggleFormPermiso(item, checked);
            }}
            onToggleAll={(mod, enabled) => {
              if (isEdit && rbac.editingRol) rbac.setBloque(rbac.editingRol.id, mod, enabled);
              else rbac.setFormBloque(mod, enabled);
            }}
          />
        ))}

        {isEdit ? (
          <button type="button" className="rbac-add" onClick={onClose}>
            Listo
          </button>
        ) : (
          <button type="button" className="rbac-add" onClick={rbac.saveRol} disabled={rbac.saving}>
            {rbac.saving ? 'Guardando…' : 'Guardar rol'}
          </button>
        )}
      </div>
    </div>
  );
}

function UserModal({ rbac, onClose }) {
  return (
    <div className="rbac-overlay" onClick={onClose} role="presentation">
      <div
        className="rbac-modal"
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="rbac-close" onClick={onClose} aria-label="Cerrar">
          <X size={18} />
        </button>
        <p className="rbac-kicker">Nueva cuenta</p>
        <h3>Crear usuario</h3>
        <p>Se crea en Firebase Auth sin cerrar tu sesión de administradora.</p>

        {rbac.error ? <p className="rbac-error">{rbac.error}</p> : null}

        <label className="rbac-field">
          Nombre
          <input
            type="text"
            value={rbac.userForm.nombre}
            onChange={(event) => rbac.updateUserForm('nombre', event.target.value)}
            placeholder="Romina López"
            required
          />
        </label>
        <label className="rbac-field">
          Correo
          <input
            type="email"
            value={rbac.userForm.email}
            onChange={(event) => rbac.updateUserForm('email', event.target.value)}
            placeholder="correo@estetica.com"
            required
          />
        </label>
        <label className="rbac-field">
          Contraseña inicial
          <input
            type="password"
            value={rbac.userForm.password}
            onChange={(event) => rbac.updateUserForm('password', event.target.value)}
            placeholder="Mínimo 6 caracteres"
            required
          />
        </label>
        <label className="rbac-field">
          Rol
          <select
            className="rbac-role-select"
            value={rbac.userForm.rolId}
            onChange={(event) => rbac.updateUserForm('rolId', event.target.value)}
          >
            {rbac.roles.map((rol) => (
              <option key={rol.id} value={rol.id}>
                {rol.nombre}
              </option>
            ))}
          </select>
        </label>

        <button type="button" className="rbac-add" onClick={rbac.saveUsuario} disabled={rbac.saving}>
          {rbac.saving ? 'Creando…' : 'Crear usuario'}
        </button>
      </div>
    </div>
  );
}

function roleName(rbac, rolId) {
  return rbac.rolesMap[rolId]?.nombre || rolId || 'Sin rol';
}

function RoleSelect({ rbac, usuario }) {
  return (
    <select
      className="rbac-role-select"
      value={usuario.rolId}
      onChange={(event) => rbac.changeUsuarioRol(usuario.id, event.target.value)}
      aria-label={`Cambiar rol de ${usuario.nombre}`}
    >
      {!rbac.rolesMap[usuario.rolId] && usuario.rolId ? (
        <option value={usuario.rolId}>{usuario.rolId}</option>
      ) : null}
      {rbac.roles.map((rol) => (
        <option key={rol.id} value={rol.id}>
          {rol.nombre}
        </option>
      ))}
    </select>
  );
}

function UsuariosTab({ rbac }) {
  if (!rbac.usuarios.length) {
    return (
      <div className="rbac-empty">
        <p>Aún no hay usuarios en el sistema.</p>
        <small>Crea una cuenta o espera su primer inicio de sesión.</small>
      </div>
    );
  }

  return (
    <>
      <div className="rbac-user-list">
        {rbac.usuarios.map((item) => (
          <article key={item.id} className="rbac-user-card">
            <div className="rbac-user-card-top">
              <div className="rbac-user-meta">
                <strong>
                  {item.nombre}
                  {item.id === rbac.currentUid ? <small className="rbac-you">Tú</small> : null}
                </strong>
                <p>{item.email || 'Sin correo'}</p>
              </div>
              <div className="rbac-user-badges">
                <button
                  type="button"
                  className={`rbac-status ${item.activo ? 'is-on' : 'is-off'}`}
                  onClick={() => rbac.toggleUsuarioActivo(item)}
                >
                  {item.activo ? 'Activo' : 'Inactivo'}
                </button>
                <span className="rbac-role-badge">{roleName(rbac, item.rolId)}</span>
              </div>
            </div>
            <RoleSelect rbac={rbac} usuario={item} />
            <button
              type="button"
              className="rbac-reset"
              onClick={() => rbac.resetPassword(item)}
              disabled={!item.email}
            >
              <KeyRound size={15} />
              Restablecer contraseña
            </button>
          </article>
        ))}
      </div>

      <section className="rbac-card rbac-table-card">
        <div className="rbac-table-wrap">
          <table className="rbac-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Rol asignado</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rbac.usuarios.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.nombre}</strong>
                    {item.id === rbac.currentUid ? <small className="rbac-you">Tú</small> : null}
                  </td>
                  <td>{item.email || '—'}</td>
                  <td>
                    <RoleSelect rbac={rbac} usuario={item} />
                  </td>
                  <td>
                    <button
                      type="button"
                      className={`rbac-status ${item.activo ? 'is-on' : 'is-off'}`}
                      onClick={() => rbac.toggleUsuarioActivo(item)}
                    >
                      {item.activo ? 'Activo' : 'Inactivo'}
                    </button>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="rbac-reset is-table"
                      onClick={() => rbac.resetPassword(item)}
                      disabled={!item.email}
                    >
                      <KeyRound size={14} />
                      Restablecer contraseña
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function roleBadgeState(rol, modulos) {
  const modulesOn = modulos.filter((item) => rol.permisos[item.key] === true);
  const fullAccess =
    rol.id === 'admin' ||
    rol.nombre === 'Administrador' ||
    (modulos.length > 0 && modulesOn.length === modulos.length);

  if (fullAccess) {
    return { fullAccess: true, items: [], extra: 0 };
  }

  if (modulesOn.length > 6) {
    return {
      fullAccess: false,
      items: modulesOn.slice(0, 5),
      extra: modulesOn.length - 5,
    };
  }

  return { fullAccess: false, items: modulesOn, extra: 0 };
}

function RolesTab({ rbac }) {
  if (!rbac.roles.length) {
    return (
      <div className="rbac-empty">
        <p>No hay roles todavía.</p>
      </div>
    );
  }

  return (
    <div className="rbac-roles">
      {rbac.roles.map((rol) => {
        const badges = roleBadgeState(rol, rbac.permisosModulos);

        return (
          <article key={rol.id} className="rbac-role-card">
            <div className="rbac-role-card-copy">
              <h3>{rol.nombre}</h3>
              <p>{rol.descripcion || 'Sin descripción'}</p>
            </div>
            <div className="rbac-perm-badges">
              {badges.fullAccess ? (
                <span className="rbac-perm-badge is-full">
                  <Star size={12} fill="currentColor" />
                  Acceso total habilitado (Todos los módulos)
                </span>
              ) : badges.items.length ? (
                <>
                  {badges.items.map((item) => (
                    <span key={item.key} className="rbac-perm-badge">
                      {item.label}
                    </span>
                  ))}
                  {badges.extra > 0 ? (
                    <span className="rbac-perm-badge is-more">+{badges.extra} más...</span>
                  ) : null}
                </>
              ) : (
                <span className="rbac-perm-badge is-empty">Sin módulos</span>
              )}
            </div>
            <button type="button" className="rbac-edit-role" onClick={() => rbac.openEditRol(rol)}>
              Editar permisos
            </button>
          </article>
        );
      })}
    </div>
  );
}
