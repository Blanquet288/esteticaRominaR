import { useEffect, useRef } from 'react';
import { ImagePlus, Pencil, Plus, Settings, Trash2, X } from 'lucide-react';
import useConfiguracion from './useConfiguracion';
import './ConfiguracionPage.css';

function Toast({ message, onClose }) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, 3200);
    return () => window.clearTimeout(timer);
  }, [message, onClose]);

  return (
    <div className="cfg-toast" role="status">
      {message}
    </div>
  );
}

function ConfigSkeleton() {
  return (
    <div className="cfg-page">
      <div className="cfg-skel cfg-skel-title" />
      <div className="cfg-skel cfg-skel-block" />
      <div className="cfg-skel cfg-skel-block" />
    </div>
  );
}

export default function ConfiguracionPage() {
  const cfg = useConfiguracion();
  const fileRef = useRef(null);

  useEffect(() => {
    if (!cfg.turnoModal && !cfg.confirmTurnoId) return undefined;
    const onKey = (event) => {
      if (event.key !== 'Escape') return;
      if (cfg.confirmTurnoId) cfg.setConfirmTurnoId('');
      else cfg.closeTurnoModal();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [cfg.turnoModal, cfg.confirmTurnoId, cfg.closeTurnoModal, cfg.setConfirmTurnoId]);

  if (cfg.loading) {
    return <ConfigSkeleton />;
  }

  return (
    <div className="cfg-page">
      <header className="cfg-hero">
        <div>
          <p className="cfg-kicker">Administración</p>
          <h2>Configuración</h2>
          <p>Datos del estudio, logo de impresión y turnos de trabajo.</p>
        </div>
      </header>

      {cfg.error ? <p className="cfg-error">{cfg.error}</p> : null}

      <section className="cfg-card">
        <div className="cfg-card-head">
          <p className="cfg-kicker">Sección 1</p>
          <h3>Datos de la empresa</h3>
        </div>
        <form
          className="cfg-form"
          onSubmit={(event) => {
            event.preventDefault();
            cfg.saveEmpresa();
          }}
        >
          <label className="cfg-field">
            Nombre de la empresa
            <input
              type="text"
              value={cfg.empresa.nombreEmpresa}
              onChange={(event) => cfg.updateEmpresa('nombreEmpresa', event.target.value)}
              required
            />
          </label>
          <label className="cfg-field">
            Mensaje del ticket
            <textarea
              rows={3}
              placeholder="Gracias por tu visita…"
              value={cfg.empresa.ticketMensaje}
              onChange={(event) => cfg.updateEmpresa('ticketMensaje', event.target.value)}
            />
          </label>
          <div className="cfg-grid-2">
            <label className="cfg-field">
              Nombre de la socia 1
              <input
                type="text"
                value={cfg.empresa.dueno1Nombre}
                onChange={(event) => cfg.updateEmpresa('dueno1Nombre', event.target.value)}
              />
            </label>
            <label className="cfg-field">
              Nombre de la socia 2
              <input
                type="text"
                value={cfg.empresa.dueno2Nombre}
                onChange={(event) => cfg.updateEmpresa('dueno2Nombre', event.target.value)}
              />
            </label>
          </div>
          <button type="submit" className="cfg-btn" disabled={cfg.saving}>
            {cfg.saving ? 'Guardando…' : 'Guardar datos de la empresa'}
          </button>
        </form>
      </section>

      <section className="cfg-card">
        <div className="cfg-card-head">
          <p className="cfg-kicker">Sección 2</p>
          <h3>Logo para reportes e impresión</h3>
          <p>Aparece arriba a la derecha en los reportes de cierre, rendimiento y anual.</p>
        </div>
        <div className="cfg-logo-box">
          {cfg.logo ? (
            <img src={cfg.logo} alt="Logo de reportes" />
          ) : (
            <div className="cfg-logo-empty">
              <ImagePlus size={22} />
              <span>Sin logo cargado</span>
            </div>
          )}
          <div className="cfg-logo-actions">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (file) cfg.uploadLogo(file);
              }}
            />
            <button type="button" className="cfg-btn" onClick={() => fileRef.current?.click()}>
              {cfg.logo ? 'Cambiar logo' : 'Cargar logo'}
            </button>
            {cfg.logo ? (
              <button type="button" className="cfg-btn is-ghost" onClick={cfg.removeLogo}>
                Quitar logo
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <section className="cfg-card">
        <div className="cfg-card-head is-split">
          <div>
            <p className="cfg-kicker">Sección 3</p>
            <h3>Turnos de trabajo</h3>
          </div>
          <button type="button" className="cfg-btn is-small" onClick={cfg.openCreateTurno}>
            <Plus size={15} />
            Nuevo turno
          </button>
        </div>

        {cfg.turnos.length ? (
          <div className="cfg-table-wrap">
            <table className="cfg-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Descripción</th>
                  <th>Orden</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cfg.turnos.map((turno) => (
                  <tr key={turno.id}>
                    <td>{turno.nombre}</td>
                    <td>{turno.descripcion || '—'}</td>
                    <td>{turno.orden}</td>
                    <td>
                      <div className="cfg-row-actions">
                        <button type="button" onClick={() => cfg.openEditTurno(turno)}>
                          <Pencil size={13} />
                          Editar
                        </button>
                        <button
                          type="button"
                          className="is-danger"
                          onClick={() => cfg.setConfirmTurnoId(turno.id)}
                        >
                          <Trash2 size={13} />
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="cfg-empty">
            <Settings size={20} />
            <p>Aún no hay turnos. Crea el primero para asignarlo en el horario de las empleadas.</p>
          </div>
        )}
      </section>

      {cfg.turnoModal ? (
        <div className="cfg-overlay" onClick={cfg.closeTurnoModal} role="presentation">
          <form
            className="cfg-modal"
            onClick={(event) => event.stopPropagation()}
            onSubmit={(event) => {
              event.preventDefault();
              cfg.saveTurno();
            }}
          >
            <button type="button" className="cfg-close" onClick={cfg.closeTurnoModal} aria-label="Cerrar">
              <X size={18} />
            </button>
            <p className="cfg-kicker">{cfg.editingTurnoId ? 'Editar turno' : 'Nuevo turno'}</p>
            <h3>{cfg.editingTurnoId ? 'Actualizar turno' : 'Registrar turno'}</h3>
            <label className="cfg-field">
              Nombre
              <input
                type="text"
                value={cfg.turnoForm.nombre}
                onChange={(event) => cfg.updateTurnoForm('nombre', event.target.value)}
                required
              />
            </label>
            <label className="cfg-field">
              Descripción
              <input
                type="text"
                placeholder="Opcional"
                value={cfg.turnoForm.descripcion}
                onChange={(event) => cfg.updateTurnoForm('descripcion', event.target.value)}
              />
            </label>
            <label className="cfg-field">
              Orden
              <input
                type="number"
                min="1"
                value={cfg.turnoForm.orden}
                onChange={(event) => cfg.updateTurnoForm('orden', event.target.value)}
              />
            </label>
            <button type="submit" className="cfg-btn" disabled={cfg.saving}>
              {cfg.saving ? 'Guardando…' : 'Guardar turno'}
            </button>
          </form>
        </div>
      ) : null}

      {cfg.confirmTurnoId ? (
        <div className="cfg-overlay" onClick={() => cfg.setConfirmTurnoId('')} role="presentation">
          <div className="cfg-modal" onClick={(event) => event.stopPropagation()}>
            <p className="cfg-kicker">Eliminar turno</p>
            <h3>¿Quitar este turno de la lista?</h3>
            <p>Las empleadas que lo tengan asignado mostrarán el identificador hasta que se actualice su horario.</p>
            <div className="cfg-confirm">
              <button type="button" onClick={() => cfg.setConfirmTurnoId('')}>
                Cancelar
              </button>
              <button type="button" className="is-danger" onClick={cfg.removeTurno} disabled={cfg.saving}>
                {cfg.saving ? 'Eliminando…' : 'Eliminar turno'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {cfg.toast ? <Toast message={cfg.toast} onClose={() => cfg.setToast('')} /> : null}
    </div>
  );
}
