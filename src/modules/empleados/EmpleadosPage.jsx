import { useEffect } from 'react';
import {
  CalendarOff,
  MapPin,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import {
  DESCANSO_ID,
  ROLES_EMPLEADO,
  resumenHorario,
  telefonoHref,
  whatsappHref,
} from '../../services/empleadosService';
import { useAuth } from '../../context/AuthContext';
import useEmpleados from './useEmpleados';
import './EmpleadosPage.css';

function Toast({ message, onClose }) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, 3200);
    return () => window.clearTimeout(timer);
  }, [message, onClose]);

  return (
    <div className="empleados-toast" role="status">
      {message}
    </div>
  );
}

function roleClass(rol) {
  return `role-${String(rol || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')}`;
}

export default function EmpleadosPage() {
  const empleados = useEmpleados();
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('emp_crear_editar');
  const canDelete = hasPermission('emp_eliminar');
  const turnoEntries = Object.entries(empleados.turnos);

  useEffect(() => {
    if (!empleados.modalOpen && !empleados.confirmId && !empleados.asistenciaOpen) return undefined;
    const onKey = (event) => {
      if (event.key !== 'Escape') return;
      if (empleados.confirmId) empleados.closeConfirm();
      else if (empleados.asistenciaOpen) empleados.closeAsistencia();
      else empleados.closeModal();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [
    empleados.modalOpen,
    empleados.confirmId,
    empleados.asistenciaOpen,
    empleados.closeModal,
    empleados.closeConfirm,
    empleados.closeAsistencia,
  ]);

  return (
    <div className="empleados-page">
      <header className="empleados-hero">
        <div>
          <p className="empleados-kicker">Equipo del estudio</p>
          <h2>Empleados</h2>
          <p>Gestiona roles, comisiones y el horario semanal de cada integrante.</p>
        </div>
        <div className="empleados-hero-actions">
          {canEdit ? (
            <>
              <button type="button" className="empleados-add is-ghost is-header" onClick={() => empleados.openAsistencia()}>
                <CalendarOff size={16} />
                Registrar inasistencia
              </button>
              <button type="button" className="empleados-add is-header" onClick={empleados.openCreate}>
                <Plus size={16} />
                Nuevo empleado
              </button>
            </>
          ) : null}
        </div>
      </header>

      <label className="empleados-search">
        <Search size={16} />
        <input
          type="search"
          placeholder="Buscar por nombre, rol o teléfono…"
          value={empleados.queryText}
          onChange={(event) => empleados.setQueryText(event.target.value)}
        />
      </label>

      {canEdit ? (
        <div className="empleados-inline-actions">
          <button type="button" className="empleados-add is-ghost is-inline" onClick={() => empleados.openAsistencia()}>
            <CalendarOff size={16} />
            Registrar inasistencia
          </button>
          <button type="button" className="empleados-add is-inline" onClick={empleados.openCreate}>
            <Plus size={16} />
            Nuevo empleado
          </button>
        </div>
      ) : null}

      {empleados.error ? <p className="empleados-error">{empleados.error}</p> : null}

      {empleados.loading ? (
        <div className="empleados-empty">Cargando equipo…</div>
      ) : empleados.filtrados.length ? (
        <section className="empleados-grid">
          {empleados.filtrados.map((item) => {
            const phone = telefonoHref(item.telefono);
            const whatsapp = whatsappHref(item.telefono);
            const week = resumenHorario(item.horarioSemanal, empleados.turnos);

            return (
              <article key={item.id} className="empleado-card">
                <div className="empleado-top">
                  <span className={`empleado-role ${roleClass(item.rol)}`}>{item.rol}</span>
                  <strong>{item.nombre}</strong>
                  <small>Comisión base {item.comisionDefecto}%</small>
                </div>

                <div className="empleado-contact">
                  {item.telefono ? (
                    <div className="contact-row">
                      <Phone size={14} />
                      <a href={phone}>{item.telefono}</a>
                      {whatsapp ? (
                        <a
                          className="whatsapp-link"
                          href={whatsapp}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <MessageCircle size={14} />
                          WhatsApp
                        </a>
                      ) : null}
                    </div>
                  ) : (
                    <div className="contact-row is-muted">
                      <Phone size={14} />
                      Sin teléfono
                    </div>
                  )}
                  <div className={`contact-row ${item.direccion ? '' : 'is-muted'}`}>
                    <MapPin size={14} />
                    <span>{item.direccion || 'Sin dirección'}</span>
                  </div>
                </div>

                <div className="horario-pills">
                  {week.map((group) => (
                    <span
                      key={`${item.id}-${group.label}`}
                      className={`horario-pill ${group.isDescanso ? 'is-off' : ''}`}
                    >
                      {group.label}: {group.turno}
                    </span>
                  ))}
                </div>

                {canEdit || canDelete ? (
                  <div className="empleado-actions">
                    {canEdit ? (
                      <>
                        <button type="button" onClick={() => empleados.openEdit(item)}>
                          <Pencil size={14} />
                          Editar
                        </button>
                        <button type="button" onClick={() => empleados.openAsistencia(item)}>
                          <CalendarOff size={14} />
                          Falta
                        </button>
                      </>
                    ) : null}
                    {canDelete ? (
                      <button type="button" onClick={() => empleados.openConfirm(item)}>
                        <Trash2 size={14} />
                        Eliminar
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </article>
            );
          })}
        </section>
      ) : (
        <div className="empleados-empty">
          <Users size={22} />
          <p>No hay empleadas que coincidan con la búsqueda.</p>
        </div>
      )}

      {empleados.modalOpen ? (
        <div className="empleados-overlay" onClick={empleados.closeModal} role="presentation">
          <form
            className="empleados-modal"
            onClick={(event) => event.stopPropagation()}
            onSubmit={(event) => {
              event.preventDefault();
              empleados.save();
            }}
          >
            <button
              type="button"
              className="empleados-close"
              onClick={empleados.closeModal}
              aria-label="Cerrar"
            >
              <X size={18} />
            </button>
            <p className="empleados-kicker">
              {empleados.editingId ? 'Editar ficha' : 'Nuevo integrante'}
            </p>
            <h3>{empleados.editingId ? 'Actualizar empleada' : 'Registrar empleada'}</h3>

            <section className="modal-section">
              <h4>Datos personales y rol</h4>
              <label className="empleados-field">
                Nombre completo
                <input
                  type="text"
                  placeholder="Nombre y apellidos"
                  value={empleados.form.nombre}
                  onChange={(event) => empleados.updateForm('nombre', event.target.value)}
                  required
                />
              </label>
              <label className="empleados-field">
                Rol
                <select
                  value={empleados.form.rol}
                  onChange={(event) => empleados.updateForm('rol', event.target.value)}
                >
                  {ROLES_EMPLEADO.map((rol) => (
                    <option key={rol} value={rol}>
                      {rol}
                    </option>
                  ))}
                </select>
              </label>
              <div className="empleados-grid-2">
                <label className="empleados-field">
                  Teléfono
                  <input
                    type="tel"
                    placeholder="Opcional"
                    value={empleados.form.telefono}
                    onChange={(event) => empleados.updateForm('telefono', event.target.value)}
                  />
                </label>
                <label className="empleados-field">
                  Comisión por defecto (%)
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={empleados.form.comisionDefecto}
                    onChange={(event) =>
                      empleados.updateForm('comisionDefecto', event.target.value)
                    }
                  />
                </label>
              </div>
              <label className="empleados-field">
                Dirección
                <input
                  type="text"
                  placeholder="Opcional"
                  value={empleados.form.direccion}
                  onChange={(event) => empleados.updateForm('direccion', event.target.value)}
                />
              </label>
            </section>

            <section className="modal-section">
              <h4>Horario semanal</h4>
              <div className="horario-grid">
                {empleados.dias.map((day) => (
                  <label key={day.key} className="empleados-field">
                    {day.label}
                    <select
                      value={empleados.form.horarioSemanal[day.key]}
                      onChange={(event) => empleados.updateHorario(day.key, event.target.value)}
                    >
                      <option value={DESCANSO_ID}>Descanso</option>
                      {turnoEntries.map(([id, nombre]) => (
                        <option key={id} value={id}>
                          {nombre}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            </section>

            <button type="submit" className="empleados-submit" disabled={empleados.saving}>
              {empleados.saving
                ? 'Guardando…'
                : empleados.editingId
                  ? 'Guardar cambios'
                  : 'Registrar empleada'}
            </button>
          </form>
        </div>
      ) : null}

      {empleados.confirmId ? (
        <div className="empleados-overlay" onClick={empleados.closeConfirm} role="presentation">
          <div className="empleados-modal is-confirm" onClick={(event) => event.stopPropagation()}>
            <p className="empleados-kicker">Acción irreversible</p>
            <h3>Confirmar eliminación de personal</h3>
            <p>
              Estás a punto de eliminar a{' '}
              <strong>{empleados.confirmEmpleado?.nombre || 'esta empleada'}</strong>. Esta acción
              borrará su configuración y no se puede deshacer.
            </p>
            <label className="empleados-field">
              Para continuar, escribe la palabra ELIMINAR en el siguiente campo:
              <input
                type="text"
                autoComplete="off"
                autoFocus
                placeholder="Escribe ELIMINAR"
                value={empleados.confirmText}
                onChange={(event) => empleados.setConfirmText(event.target.value)}
              />
            </label>
            <div className="empleados-confirm">
              <button type="button" onClick={empleados.closeConfirm}>
                Cancelar
              </button>
              <button
                type="button"
                className="is-danger"
                onClick={empleados.remove}
                disabled={!empleados.canDelete || empleados.saving}
              >
                {empleados.saving ? 'Eliminando…' : 'Eliminar empleado'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {empleados.asistenciaOpen ? (
        <div className="empleados-overlay" onClick={empleados.closeAsistencia} role="presentation">
          <form
            className="empleados-modal"
            onClick={(event) => event.stopPropagation()}
            onSubmit={(event) => {
              event.preventDefault();
              empleados.saveAsistencia();
            }}
          >
            <button
              type="button"
              className="empleados-close"
              onClick={empleados.closeAsistencia}
              aria-label="Cerrar"
            >
              <X size={18} />
            </button>
            <p className="empleados-kicker">Control de asistencia</p>
            <h3>Registrar inasistencia / falta</h3>
            <label className="empleados-field">
              Colaboradora
              <select
                value={empleados.asistencia.idEmpleado}
                onChange={(event) => empleados.updateAsistencia('idEmpleado', event.target.value)}
                required
              >
                <option value="">Selecciona una colaboradora</option>
                {empleados.empleados.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label className="empleados-field">
              Fecha
              <input
                type="date"
                value={empleados.asistencia.fecha}
                onChange={(event) => empleados.updateAsistencia('fecha', event.target.value)}
                required
              />
            </label>
            <label className="empleados-field">
              Tipo de incidencia
              <select
                value={empleados.asistencia.tipo}
                onChange={(event) => empleados.updateAsistencia('tipo', event.target.value)}
              >
                {empleados.tiposAsistencia.map((tipo) => (
                  <option key={tipo.id} value={tipo.id}>
                    {tipo.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="empleados-field">
              Motivo (opcional)
              <input
                type="text"
                placeholder="Ej. cita médica, permiso familiar…"
                value={empleados.asistencia.motivo}
                onChange={(event) => empleados.updateAsistencia('motivo', event.target.value)}
              />
            </label>
            <button type="submit" className="empleados-submit" disabled={empleados.saving}>
              {empleados.saving ? 'Guardando…' : 'Registrar incidencia'}
            </button>
          </form>
        </div>
      ) : null}

      {empleados.toast ? (
        <Toast message={empleados.toast} onClose={() => empleados.setToast('')} />
      ) : null}
    </div>
  );
}
