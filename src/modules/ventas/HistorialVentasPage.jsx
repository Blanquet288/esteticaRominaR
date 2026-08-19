import { useEffect } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  History,
  Pencil,
  Trash2,
  TrendingDown,
  Trophy,
  X,
} from 'lucide-react';
import { formatMoney, toNumber } from '../../services/dashboardService';
import { useAuth } from '../../context/AuthContext';
import { roundMoney } from '../../services/ventasService';
import useHistorialVentas from './useHistorialVentas';
import './HistorialVentasPage.css';

const MONTHS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

function Toast({ message, onClose }) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, 3200);
    return () => window.clearTimeout(timer);
  }, [message, onClose]);

  return (
    <div className="hist-toast" role="status">
      {message}
    </div>
  );
}

function HistorialSkeleton() {
  return (
    <div className="hist-page">
      <div className="hist-skel hist-skel-title" />
      <div className="hist-skel hist-skel-nav" />
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="hist-skel hist-skel-day" />
      ))}
    </div>
  );
}

export default function HistorialVentasPage() {
  const hist = useHistorialVentas();
  const { hasPermission } = useAuth();
  const canCancel = hasPermission('ventas_cancelar');
  const currentYear = new Date().getFullYear();
  const years = Array.from(
    new Set([...Array.from({ length: 7 }, (_, index) => currentYear - 3 + index), hist.year]),
  ).sort((a, b) => a - b);

  useEffect(() => {
    if (!hist.editing && !hist.confirmId) return undefined;
    const onKey = (event) => {
      if (event.key !== 'Escape') return;
      if (hist.confirmId) hist.setConfirmId(null);
      else hist.closeEdit();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [hist.editing, hist.confirmId, hist.closeEdit, hist.setConfirmId]);

  if (hist.loading) {
    return <HistorialSkeleton />;
  }

  const previewUtilidad = hist.editing
    ? roundMoney(toNumber(hist.editing.monto) - toNumber(hist.editing.comisionMonto))
    : 0;

  return (
    <div className="hist-page">
      <header className="hist-hero">
        <p className="hist-kicker">Operación diaria</p>
        <h2>Historial de ventas</h2>
        <p>Revisa cortes y montos globales por día, con edición y baja de registros.</p>
      </header>

      <section className="month-nav" aria-label="Mes y año">
        <button type="button" onClick={() => hist.shiftMonth(-1)} aria-label="Mes anterior">
          <ChevronLeft size={18} />
        </button>
        <select
          className="month-select"
          value={hist.month}
          onChange={(event) => hist.setMonth(Number(event.target.value))}
          aria-label="Mes"
        >
          {MONTHS.map((name, index) => (
            <option key={name} value={index}>
              {name}
            </option>
          ))}
        </select>
        <select
          className="year-select"
          value={hist.year}
          onChange={(event) => hist.setYear(Number(event.target.value))}
          aria-label="Año"
        >
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
        <button type="button" onClick={() => hist.shiftMonth(1)} aria-label="Mes siguiente">
          <ChevronRight size={18} />
        </button>
      </section>

      <section className="hist-highlights" aria-label="Días récord del mes">
        <article className="is-record">
          <span>
            <Trophy size={14} /> Día con mayor venta
          </span>
          <strong>{hist.diaMayor ? hist.diaMayor.label : '—'}</strong>
          <em>{hist.diaMayor ? formatMoney(hist.diaMayor.total) : 'Sin ventas en el mes'}</em>
        </article>
        <article className="is-low">
          <span>
            <TrendingDown size={14} /> Día con menor venta
          </span>
          <strong>{hist.diaMenor ? hist.diaMenor.label : '—'}</strong>
          <em>{hist.diaMenor ? formatMoney(hist.diaMenor.total) : 'Sin ventas en el mes'}</em>
        </article>
      </section>

      {hist.error && !hist.editing ? <p className="hist-error">{hist.error}</p> : null}

      {hist.days.length ? (
        <section className="hist-timeline">
          {hist.days.map((day) => {
            const open = Boolean(hist.openDays[day.fecha]);
            return (
              <article key={day.fecha} className={`day-card ${open ? 'is-open' : ''}`}>
                <button
                  type="button"
                  className="day-toggle"
                  onClick={() => hist.toggleDay(day.fecha)}
                  aria-expanded={open}
                >
                  <div>
                    <strong>{day.label}</strong>
                    <small>
                      {day.colaboradoras}{' '}
                      {day.colaboradoras === 1 ? 'colaboradora' : 'colaboradoras'} ·{' '}
                      {day.groups.reduce((sum, group) => sum + group.items.length, 0)} registros
                    </small>
                  </div>
                  <em>{formatMoney(day.total)}</em>
                  <ChevronDown size={18} className="day-caret" />
                </button>

                <div className="day-body" inert={!open} aria-hidden={!open}>
                  <div className="day-inner">
                    {day.groups.map((group) => (
                      <div key={group.key} className="corte-card">
                        <div className="corte-head">
                          <div className="corte-who">
                            <strong className="corte-name">{group.nombre}</strong>
                            <span className="rol-badge">{group.rol || 'Equipo'}</span>
                          </div>
                          <span className="turno-badge">{group.turnoNombre}</span>
                        </div>

                        <ul className="venta-list">
                          {group.items.map((item) => (
                            <li key={item.id}>
                              <div>
                                {item.esHistorico ? (
                                  <span className="hist-badge">Histórico global</span>
                                ) : null}
                                <strong>
                                  {item.servicio}
                                  {item.esHistorico ? null : ` × ${item.cantidad}`}
                                </strong>
                                <small>
                                  Bruto {formatMoney(item.monto)} · Comisión{' '}
                                  {formatMoney(item.comisionMonto)} · Utilidad{' '}
                                  {formatMoney(item.utilidadNegocio)}
                                </small>
                              </div>
                              {canCancel ? (
                                <div className="venta-actions">
                                  <button
                                    type="button"
                                    onClick={() => hist.openEdit(item)}
                                    aria-label="Editar venta"
                                  >
                                    <Pencil size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => hist.setConfirmId(item.id)}
                                    aria-label="Eliminar venta"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                        <div className="corte-foot">
                          <span>Total corte</span>
                          <strong>{formatMoney(group.bruto)}</strong>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <div className="hist-empty">
          <History size={22} />
          <p>No hay ventas registradas en {hist.label}.</p>
        </div>
      )}

      {hist.editing ? (
        <div className="hist-overlay" onClick={hist.closeEdit} role="presentation">
          <form
            className="hist-modal"
            onClick={(event) => event.stopPropagation()}
            onSubmit={(event) => {
              event.preventDefault();
              hist.saveEdit();
            }}
          >
            <button type="button" className="hist-close" onClick={hist.closeEdit} aria-label="Cerrar">
              <X size={18} />
            </button>
            <p className="hist-kicker">Editar registro</p>
            <h3>{hist.editing.esHistorico ? 'Histórico diario' : 'Venta detallada'}</h3>

            <label className="hist-field">
              Fecha
              <input
                type="date"
                value={hist.editing.fecha}
                onChange={(event) => hist.updateEdit('fecha', event.target.value)}
                required
              />
            </label>
            <label className="hist-field">
              Servicio
              <input
                type="text"
                value={hist.editing.servicio}
                onChange={(event) => hist.updateEdit('servicio', event.target.value)}
                required
              />
            </label>
            <div className="hist-grid">
              <label className="hist-field">
                Cantidad
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={hist.editing.cantidad}
                  onChange={(event) => hist.updateEdit('cantidad', event.target.value)}
                />
              </label>
              <label className="hist-field">
                Monto bruto
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={hist.editing.monto}
                  onChange={(event) => hist.updateEdit('monto', event.target.value)}
                />
              </label>
            </div>
            <label className="hist-field">
              Comisión
              <input
                type="number"
                min="0"
                step="0.01"
                value={hist.editing.comisionMonto}
                onChange={(event) => hist.updateEdit('comisionMonto', event.target.value)}
              />
            </label>
            <p className="hist-preview">Utilidad del negocio: {formatMoney(previewUtilidad)}</p>
            {hist.error ? <p className="hist-error">{hist.error}</p> : null}
            <button type="submit" className="hist-submit" disabled={hist.saving}>
              {hist.saving ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </form>
        </div>
      ) : null}

      {hist.confirmId ? (
        <div className="hist-overlay" onClick={() => hist.setConfirmId(null)} role="presentation">
          <div className="hist-modal is-confirm" onClick={(event) => event.stopPropagation()}>
            <h3>¿Eliminar esta venta?</h3>
            <p>El registro desaparecerá del historial y de los reportes del mes.</p>
            <div className="hist-confirm">
              <button type="button" onClick={() => hist.setConfirmId(null)}>
                Cancelar
              </button>
              <button
                type="button"
                className="is-danger"
                onClick={hist.remove}
                disabled={hist.saving}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {hist.toast ? <Toast message={hist.toast} onClose={() => hist.setToast('')} /> : null}
    </div>
  );
}
